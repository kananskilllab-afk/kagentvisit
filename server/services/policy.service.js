/**
 * Centralized policy evaluation.
 * All new-policy rules (receipts, pre-booking, Ola/Uber, client photo) funnel through here.
 * Called by:
 *   - ExpenseClaim submit  -> block if any critical violation
 *   - ExpenseClaim approve -> last-line guard (policy may have changed since submit)
 *   - AI audit             -> surface violations for UX without blocking
 */

const Policy = require('../models/Policy');
const Upload = require('../models/Upload');
const VisitPlan = require('../models/VisitPlan');
const VisitSchedule = require('../models/VisitSchedule');

const LEADERSHIP_ROLES = new Set(['hod', 'admin', 'superadmin']);

function policyKindForUser(user) {
    if (!user) return 'standard';
    return LEADERSHIP_ROLES.has(user.role) ? 'leadership' : 'standard';
}

async function getActivePolicy(kind) {
    return Policy.findOne({ policyKind: kind, isActive: true }).lean();
}

function matchRule(policy, category, cityTier) {
    if (!policy || !policy.rules) return null;
    // Prefer exact cityTier match, then 'any', then fall back to first category match.
    const candidates = policy.rules.filter(r => r.category === category);
    if (!candidates.length) return null;
    return (
        candidates.find(r => r.cityTier === cityTier) ||
        candidates.find(r => r.cityTier === 'any') ||
        candidates[0]
    );
}

/**
 * Evaluate a claim (with its expenses + plan) against active policy.
 * @returns {Promise<{ appliedPolicy, violations, warnings, summary }>}
 */
async function evaluateClaim({ claim, expenses, plan, user }) {
    const kind = policyKindForUser(user);
    const policy = await getActivePolicy(kind);

    const violations = [];
    const warnings = [];

    if (!policy) {
        warnings.push({
            code: 'NO_ACTIVE_POLICY',
            severity: 'warning',
            message: `No active ${kind} policy configured — evaluating with permissive defaults.`
        });
    }

    const global = policy?.globalRequirements || {
        clientPhotoPerSchedule: true,
        photoBackgroundMustShowBusinessIdentity: true,
        receiptRequiredForAllExpenses: true,
        reimbursementWindowDays: 7
    };

    // ── 1. Per-expense rules ────────────────────────────────────────────
    const perDayTotals = new Map(); // key: `${category}__${YYYY-MM-DD}` -> sum
    const perVisitTotals = new Map(); // key: category -> sum

    for (const exp of expenses || []) {
        const cityTier = exp.cityTier || plan?.cityTier || 'na';
        const rule = matchRule(policy, exp.category, cityTier);

        const requiresReceipt = rule
            ? (rule.requiresReceipt !== false)
            : !!global.receiptRequiredForAllExpenses;

        const receiptThreshold = rule?.requiresReceiptAbove ?? null;
        const needsReceiptNow = requiresReceipt && (receiptThreshold === null || exp.amount > receiptThreshold);

        // C4: "Without a bill, no claim will be accepted."
        if (needsReceiptNow && !exp.receiptUrl && !(exp.uploadRefs && exp.uploadRefs.length)) {
            violations.push({
                code: 'RECEIPT_REQUIRED',
                severity: 'critical',
                expenseId: exp._id,
                category: exp.category,
                message: `Receipt/bill is required for ${exp.category}${exp.amount ? ` (₹${exp.amount})` : ''}.`,
                policyRef: 'C4'
            });
        }

        // C1: Hotels (and other flagged categories) must be pre-booked
        if (rule?.requiresPreBooking) {
            const planStart = plan?.plannedStartAt ? new Date(plan.plannedStartAt) : null;
            // Look for a booking_ticket upload tied to this expense or its plan
            const booking = await Upload.findOne({
                $or: [
                    { refModel: 'Expense', refId: exp._id, context: 'booking_ticket' },
                    { refModel: 'VisitPlan', refId: plan?._id, context: 'booking_ticket' }
                ]
            }).lean();

            if (!booking) {
                violations.push({
                    code: 'PRE_BOOKING_REQUIRED',
                    severity: 'critical',
                    expenseId: exp._id,
                    category: exp.category,
                    message: `${exp.category} must be pre-booked — upload a booking confirmation.`,
                    policyRef: 'C1'
                });
            } else if (planStart) {
                const bookingDate = booking.bookingDate || booking.createdAt;
                if (bookingDate && new Date(bookingDate) > planStart) {
                    violations.push({
                        code: 'PRE_BOOKING_TOO_LATE',
                        severity: 'critical',
                        expenseId: exp._id,
                        category: exp.category,
                        message: `${exp.category} booking confirmation is dated after the planned start — not a valid pre-booking.`,
                        policyRef: 'C1'
                    });
                }
            }
        }

        // C2: Local cab must be via Ola/Uber
        if (rule?.allowedBookingModes && rule.allowedBookingModes.length) {
            if (!rule.allowedBookingModes.includes(exp.bookingMode)) {
                violations.push({
                    code: 'BOOKING_MODE_NOT_ALLOWED',
                    severity: 'critical',
                    expenseId: exp._id,
                    category: exp.category,
                    message: `${exp.category} must be booked via: ${rule.allowedBookingModes.join(', ')}. Got: ${exp.bookingMode || 'unspecified'}.`,
                    policyRef: 'C2'
                });
            }
        }

        // Caps (null = uncapped, e.g., flight/train/hotel "as per bill")
        if (rule?.maxPerVisit != null) {
            perVisitTotals.set(exp.category, (perVisitTotals.get(exp.category) || 0) + (exp.amount || 0));
        }
        if (rule?.maxPerDay != null && exp.expenseDate) {
            const d = new Date(exp.expenseDate).toISOString().slice(0, 10);
            const key = `${exp.category}__${d}`;
            perDayTotals.set(key, (perDayTotals.get(key) || 0) + (exp.amount || 0));
        }

        // Travel class check
        if (rule?.travelClass && exp.travelClass && exp.travelClass !== rule.travelClass) {
            warnings.push({
                code: 'TRAVEL_CLASS_MISMATCH',
                severity: 'warning',
                expenseId: exp._id,
                message: `Travel class ${exp.travelClass} does not match policy (${rule.travelClass}).`
            });
        }
    }

    // Cap checks (after aggregation)
    for (const [category, total] of perVisitTotals.entries()) {
        const anyRule = matchRule(policy, category, plan?.cityTier || 'na');
        if (anyRule?.maxPerVisit != null && total > anyRule.maxPerVisit) {
            violations.push({
                code: 'MAX_PER_VISIT_EXCEEDED',
                severity: 'critical',
                category,
                message: `${category} total ₹${total} exceeds per-visit cap ₹${anyRule.maxPerVisit}.`,
                policyRef: 'caps'
            });
        }
    }
    for (const [key, total] of perDayTotals.entries()) {
        const [category] = key.split('__');
        const anyRule = matchRule(policy, category, plan?.cityTier || 'na');
        if (anyRule?.maxPerDay != null && total > anyRule.maxPerDay) {
            violations.push({
                code: 'MAX_PER_DAY_EXCEEDED',
                severity: 'critical',
                category,
                message: `${category} daily total ₹${total} exceeds per-day cap ₹${anyRule.maxPerDay}.`,
                policyRef: 'caps'
            });
        }
    }

    // ── 2. Client-photo requirement (per-schedule, C3) ──────────────────
    if (claim?.claimType === 'reimbursement' && plan && global.clientPhotoPerSchedule) {
        const schedules = await VisitSchedule.find({ visitPlanRef: plan._id }).lean();
        for (const s of schedules) {
            if (s.status === 'cancelled' || s.status === 'missed') continue;
            if (!s.clientPhoto || !s.clientPhoto.uploadRef) {
                violations.push({
                    code: 'CLIENT_PHOTO_REQUIRED',
                    severity: 'critical',
                    scheduleId: s._id,
                    message: `A client photo is required for schedule "${s.title}" before reimbursement.`,
                    policyRef: 'C3'
                });
            } else if (s.clientPhoto.verificationStatus === 'rejected') {
                violations.push({
                    code: 'CLIENT_PHOTO_REJECTED',
                    severity: 'critical',
                    scheduleId: s._id,
                    message: `Client photo for "${s.title}" was rejected: ${s.clientPhoto.rejectionReason || 'not compliant'}.`,
                    policyRef: 'C3'
                });
            } else if (s.clientPhoto.verificationStatus === 'pending') {
                warnings.push({
                    code: 'CLIENT_PHOTO_PENDING_VERIFICATION',
                    severity: 'warning',
                    scheduleId: s._id,
                    message: `Client photo for "${s.title}" is awaiting verification.`
                });
            }
        }
    }

    // ── 3. Reimbursement window (7 days after plannedEndAt) ─────────────
    if (claim?.claimType === 'reimbursement' && plan) {
        const windowDays = global.reimbursementWindowDays ?? 7;
        const start = new Date(plan.plannedStartAt);
        const deadline = new Date(plan.plannedEndAt);
        deadline.setDate(deadline.getDate() + windowDays);
        const submitAt = claim.submittedAt ? new Date(claim.submittedAt) : new Date();
        if (submitAt < start) {
            violations.push({
                code: 'REIMBURSEMENT_WINDOW_NOT_OPEN',
                severity: 'critical',
                message: `Reimbursement claims are allowed only during or after the visit. Visit starts ${start.toISOString().slice(0, 10)}.`
            });
        } else if (submitAt > deadline) {
            violations.push({
                code: 'REIMBURSEMENT_WINDOW_CLOSED',
                severity: 'critical',
                message: `Reimbursement window closed on ${deadline.toISOString().slice(0, 10)} (${windowDays} days after plan end).`
            });
        }
    }

    const summary = violations.length === 0
        ? `Compliant (${kind} policy${policy ? ` v${policy.version}` : ''})`
        : `${violations.length} violation(s) under ${kind} policy${policy ? ` v${policy.version}` : ''}`;

    return {
        appliedPolicy: policy ? {
            _id: policy._id,
            policyKind: policy.policyKind,
            version: policy.version,
            name: policy.name
        } : null,
        policyKind: kind,
        violations,
        warnings,
        summary
    };
}

module.exports = {
    evaluateClaim,
    getActivePolicy,
    policyKindForUser,
    LEADERSHIP_ROLES
};

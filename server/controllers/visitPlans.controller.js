const mongoose = require('mongoose');
const VisitPlan = require('../models/VisitPlan');
const VisitSchedule = require('../models/VisitSchedule');
const VisitPlanBalance = require('../models/VisitPlanBalance');
const Agent = require('../models/Agent');
const Upload = require('../models/Upload');
const Expense = require('../models/Expense');
const ExpenseClaim = require('../models/ExpenseClaim');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const gcal = require('../services/googleCalendar.service');

const LEADERSHIP_ROLES = ['hod', 'admin', 'superadmin'];
const ACCOUNTS_ROLES = ['accounts', 'superadmin'];

// Access helpers ───────────────────────────────────────────────────────────
async function scopedPlanQuery(user) {
    const q = {};
    if (user.role === 'user' || user.role === 'home_visit') {
        q.owner = user._id;
    } else if (user.role === 'hod' || user.role === 'admin') {
        const ids = await managedOwnerIds(user);
        q.owner = { $in: ids };
    }
    // accounts + superadmin see all
    return q;
}

async function managedOwnerIds(user) {
    const ids = new Set([String(user._id)]);
    if (!['admin', 'hod'].includes(user.role)) return Array.from(ids);

    const me = await User.findById(user._id).select('assignedEmployees department formAccess');
    (me?.assignedEmployees || []).forEach(id => ids.add(String(id)));

    if (me?.department) {
        const departmentUsers = await User.find({
            isActive: true,
            department: me.department,
            role: { $in: ['user', 'home_visit', 'admin', 'hod'] }
        }).select('_id');
        departmentUsers.forEach(u => ids.add(String(u._id)));
    }

    return Array.from(ids);
}

// Resolve which user's Google Calendar to sync to. We always sync to the plan
// owner's calendar — managers/accounts editing someone else's plan should not
// push events into their own calendar.
async function getTargetUserForGcal(actor, ownerId) {
    if (actor && String(actor._id) === String(ownerId)) return actor;
    return await User.findById(ownerId).select('googleCalendar email name');
}

async function canAccessPlan(user, plan) {
    if (!plan) return false;
    if (user.role === 'accounts' || user.role === 'superadmin') return true;
    if (String(plan.owner) === String(user._id)) return true;
    if (user.role === 'admin' || user.role === 'hod') {
        const ids = await managedOwnerIds(user);
        return ids.includes(String(plan.owner));
    }
    return false;
}

// Returns { ok, agents, message }
// agentIds may be empty if customAgentNames covers the requirement
async function validateAgentsActive(agentIds) {
    if (!agentIds || agentIds.length === 0) return { ok: true, agents: [] };

    // Filter out any non-ObjectId strings (e.g. accidentally passed custom names)
    const validIds = agentIds.filter(id => mongoose.isValidObjectId(id));
    if (validIds.length !== agentIds.length) {
        return { ok: false, message: 'Invalid agent ID format in agents array.' };
    }

    const agents = await Agent.find({ _id: { $in: validIds } }).select('_id isActive name');
    if (agents.length !== validIds.length) {
        return { ok: false, message: 'Some agents were not found in the system.' };
    }
    const inactive = agents.filter(a => !a.isActive);
    if (inactive.length) {
        return { ok: false, message: `Inactive agents not allowed: ${inactive.map(a => a.name).join(', ')}` };
    }
    return { ok: true, agents };
}

function hasAtLeastOneAgent(agents, customAgentNames) {
    return (agents && agents.length > 0) || (customAgentNames && customAgentNames.length > 0);
}

function normalizePlanCities(primaryCity, primaryState, primaryTier, cities = []) {
    const list = [];
    const seen = new Set();
    const add = (entry = {}) => {
        const city = (entry.city || '').trim();
        const state = (entry.state || primaryState || '').trim();
        const cityTier = entry.cityTier || primaryTier || 'na';
        if (!city) return;
        const key = `${city.toLowerCase()}|${state.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        list.push({ city, state, cityTier });
    };

    add({ city: primaryCity, state: primaryState, cityTier: primaryTier });
    if (Array.isArray(cities)) cities.forEach(add);
    return list;
}

function validatePlanCities(planType, cities) {
    if (planType !== 'multi_city_same_state') return null;
    if (!cities || cities.length < 2) {
        return 'Select at least two cities for a multi-city same-state plan.';
    }
    const states = [...new Set(cities.map(c => (c.state || '').trim().toLowerCase()).filter(Boolean))];
    if (states.length > 1) {
        return 'All selected cities must be in the same state.';
    }
    return null;
}

function audit(req, action, plan, extra = {}) {
    AuditLog.create({
        userId: req.user._id,
        action,
        targetId: plan?._id,
        targetModel: 'VisitPlan',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { planTitle: plan?.title, ...extra }
    }).catch(err => console.error('[AuditLog]', err.message));
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAN CRUD
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/visit-plans
exports.createPlan = async (req, res) => {
    try {
        const {
            title, planType, city, state, pinCode, cityTier,
            cities = [], agents = [], customAgentNames = [],
            plannedStartAt, plannedEndAt, purpose, notes, timezone
        } = req.body;
        const finalPlanType = planType || 'single';
        const cleanCities = normalizePlanCities(city, state, cityTier, cities);
        const citiesError = validatePlanCities(finalPlanType, cleanCities);

        // Controller-level validation (replaces removed pre-validate hook)
        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Plan title is required.' });
        }
        if (!city || !city.trim()) {
            return res.status(400).json({ success: false, message: 'City is required.' });
        }
        if (citiesError) {
            return res.status(400).json({ success: false, message: citiesError, errorCode: 'INVALID_PLAN_CITIES' });
        }
        if (!plannedStartAt || !plannedEndAt) {
            return res.status(400).json({ success: false, message: 'plannedStartAt and plannedEndAt are required.' });
        }
        if (new Date(plannedEndAt) < new Date(plannedStartAt)) {
            return res.status(400).json({ success: false, message: 'plannedEndAt must be on or after plannedStartAt.' });
        }
        if (!hasAtLeastOneAgent(agents, customAgentNames)) {
            return res.status(400).json({
                success: false,
                message: 'At least one agent (from directory or custom name) is required.',
                errorCode: 'AGENT_REQUIRED'
            });
        }

        const agentCheck = await validateAgentsActive(agents);
        if (!agentCheck.ok) {
            return res.status(400).json({ success: false, message: agentCheck.message });
        }

        // Sanitize custom names
        const cleanCustomNames = (customAgentNames || [])
            .map(n => (typeof n === 'string' ? n.trim() : ''))
            .filter(Boolean);

        const plan = await VisitPlan.create({
            owner: req.user._id,
            ownerRoleSnapshot: req.user.role,
            title: title.trim(),
            planType: finalPlanType,
            city: cleanCities[0]?.city || city.trim(),
            state: cleanCities[0]?.state || state,
            pinCode,
            cities: cleanCities,
            cityTier: cleanCities[0]?.cityTier || cityTier || 'na',
            agents: agents || [],
            customAgentNames: cleanCustomNames,
            plannedStartAt,
            plannedEndAt,
            purpose,
            notes,
            timezone,
            status: 'scheduled',
            syncToGoogle: !!req.body.syncToGoogle
        });

        if (plan.syncToGoogle && req.user.googleCalendar?.connected) {
            try {
                const eventId = await gcal.createEvent(req.user, plan);
                if (eventId) {
                    plan.googleCalendarEventId = eventId;
                    await plan.save();
                }
            } catch (e) { /* non-fatal */ }
        }

        audit(req, 'CREATE_VISIT_PLAN', plan);
        res.status(201).json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// GET /api/visit-plans?status=&city=&owner=&from=&to=
exports.listPlans = async (req, res) => {
    try {
        const q = await scopedPlanQuery(req.user);
        if (req.query.status) q.status = req.query.status;
        if (req.query.city) {
            q.$or = [
                { city: req.query.city },
                { 'cities.city': req.query.city }
            ];
        }
        if (req.query.owner && ACCOUNTS_ROLES.includes(req.user.role)) q.owner = req.query.owner;
        if (req.query.hasOpenClaim === 'true') {
            const claims = await ExpenseClaim.find({ status: { $in: ['draft', 'submitted', 'under_review', 'needs_justification'] } })
                .distinct('visitPlanRef');
            q._id = { $in: claims };
        }
        if (req.query.from || req.query.to) {
            q.plannedStartAt = {};
            if (req.query.from) q.plannedStartAt.$gte = new Date(req.query.from);
            if (req.query.to) q.plannedStartAt.$lte = new Date(req.query.to);
        }

        const plans = await VisitPlan.find(q)
            .populate('owner', 'name employeeId email role')
            .populate('agents', 'name city state')
            .sort({ plannedStartAt: -1 })
            .lean();

        res.json({ success: true, data: plans });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/visit-plans/:id
exports.getPlan = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id)
            .populate('owner', 'name employeeId email role')
            .populate('agents', 'name city state mobile emailId')
            .lean();
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const schedules = await VisitSchedule.find({ visitPlanRef: plan._id })
            .populate('agentId', 'name city')
            .populate('clientPhoto.uploadRef')
            .sort({ scheduledDate: 1 })
            .lean();

        const scheduleIds = schedules.map(s => s._id);

        const [balance, claims, uploads] = await Promise.all([
            VisitPlanBalance.findOne({ visitPlanRef: plan._id }).lean(),
            ExpenseClaim.find({ visitPlanRef: plan._id }).sort({ createdAt: -1 }).lean(),
            Upload.find({
                $or: [
                    { refModel: 'VisitPlan', refId: plan._id },
                    { refModel: 'VisitSchedule', refId: { $in: scheduleIds } }
                ]
            }).lean()
        ]);

        res.json({ success: true, data: { plan, schedules, balance, claims, uploads } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/visit-plans/:id
exports.updatePlan = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (['completed', 'closed', 'cancelled'].includes(plan.status) && req.user.role !== 'superadmin') {
            return res.status(400).json({ success: false, message: 'Cannot edit a plan that is completed, closed, or cancelled' });
        }

        const editable = ['title', 'pinCode',
            'plannedStartAt', 'plannedEndAt', 'purpose', 'notes', 'timezone', 'syncToGoogle'];
        const nextPlanType = req.body.planType || plan.planType;
        const destinationTouched = req.body.city !== undefined || req.body.state !== undefined ||
            req.body.cityTier !== undefined || req.body.cities !== undefined || req.body.planType !== undefined;

        // Date range validation
        const newStart = req.body.plannedStartAt ? new Date(req.body.plannedStartAt) : plan.plannedStartAt;
        const newEnd = req.body.plannedEndAt ? new Date(req.body.plannedEndAt) : plan.plannedEndAt;
        if (newEnd < newStart) {
            return res.status(400).json({ success: false, message: 'plannedEndAt must be on or after plannedStartAt.' });
        }

        const cleanCities = destinationTouched
            ? normalizePlanCities(
                req.body.city ?? plan.city,
                req.body.state ?? plan.state,
                req.body.cityTier ?? plan.cityTier,
                req.body.cities ?? plan.cities
            )
            : plan.cities;
        const citiesError = destinationTouched ? validatePlanCities(nextPlanType, cleanCities) : null;
        if (citiesError) {
            return res.status(400).json({ success: false, message: citiesError, errorCode: 'INVALID_PLAN_CITIES' });
        }

        // Block destination changes if there are child schedules
        const currentCities = normalizePlanCities(plan.city, plan.state, plan.cityTier, plan.cities);
        if (destinationTouched && JSON.stringify(cleanCities || []) !== JSON.stringify(currentCities || [])) {
            const count = await VisitSchedule.countDocuments({ visitPlanRef: plan._id });
            if (count > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change destination cities while schedules exist. Remove schedules first.'
                });
            }
        }

        // Block shrinking plannedEndAt past existing reimbursement submissions
        if (req.body.plannedEndAt && new Date(req.body.plannedEndAt) < plan.plannedEndAt) {
            const deadline = new Date(req.body.plannedEndAt);
            deadline.setDate(deadline.getDate() + 7);
            const lateReimb = await ExpenseClaim.findOne({
                visitPlanRef: plan._id, claimType: 'reimbursement',
                submittedAt: { $gt: deadline }
            });
            if (lateReimb) {
                return res.status(400).json({
                    success: false,
                    message: 'A reimbursement was submitted outside the new window; cannot shrink plannedEndAt.'
                });
            }
        }

        if (req.body.agents !== undefined) {
            const agentCheck = await validateAgentsActive(req.body.agents);
            if (!agentCheck.ok) return res.status(400).json({ success: false, message: agentCheck.message });
            // Cannot remove agents still referenced by schedules
            const scheduledAgents = await VisitSchedule.find({ visitPlanRef: plan._id }).distinct('agentId');
            const removed = plan.agents.filter(a => !req.body.agents.map(String).includes(String(a)));
            const stillReferenced = removed.filter(a => scheduledAgents.map(String).includes(String(a)));
            if (stillReferenced.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove agents that are referenced by schedules in this plan.'
                });
            }
            plan.agents = req.body.agents;
        }

        if (req.body.customAgentNames !== undefined) {
            plan.customAgentNames = (req.body.customAgentNames || [])
                .map(n => (typeof n === 'string' ? n.trim() : ''))
                .filter(Boolean);
        }

        // Re-check at least one agent remains after edits
        if (!hasAtLeastOneAgent(plan.agents, plan.customAgentNames)) {
            return res.status(400).json({
                success: false,
                message: 'At least one agent (directory or custom name) is required.',
                errorCode: 'AGENT_REQUIRED'
            });
        }

        editable.forEach(f => {
            if (req.body[f] !== undefined) plan[f] = req.body[f];
        });
        if (destinationTouched) {
            plan.planType = nextPlanType;
            plan.cities = cleanCities;
            plan.city = cleanCities[0]?.city || plan.city;
            plan.state = cleanCities[0]?.state || plan.state;
            plan.cityTier = cleanCities[0]?.cityTier || plan.cityTier || 'na';
        }

        await plan.save();

        // Google sync
        const targetUser = await getTargetUserForGcal(req.user, plan.owner);
        if (req.body.syncToGoogle === false && plan.googleCalendarEventId) {
            try {
                await gcal.deleteEvent(targetUser, plan.googleCalendarEventId);
                plan.googleCalendarEventId = null;
                await plan.save();
            } catch (e) { /* non-fatal */ }
        } else if (plan.syncToGoogle && targetUser?.googleCalendar?.connected) {
            try {
                if (plan.googleCalendarEventId) {
                    await gcal.updateEvent(targetUser, plan.googleCalendarEventId, plan);
                } else {
                    const id = await gcal.createEvent(targetUser, plan);
                    if (id) { plan.googleCalendarEventId = id; await plan.save(); }
                }
            } catch (e) { /* non-fatal */ }
        }

        audit(req, 'UPDATE_VISIT_PLAN', plan);
        res.json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// DELETE /api/visit-plans/:id — hard delete only if draft AND no children
exports.deletePlan = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (plan.status !== 'draft' && req.user.role !== 'superadmin') {
            return res.status(400).json({ success: false, message: 'Only draft plans can be hard-deleted. Use cancel instead.' });
        }
        const [sCount, cCount] = await Promise.all([
            VisitSchedule.countDocuments({ visitPlanRef: plan._id }),
            ExpenseClaim.countDocuments({ visitPlanRef: plan._id })
        ]);
        if (sCount > 0 || cCount > 0) {
            return res.status(400).json({ success: false, message: 'Plan has schedules or claims — cancel instead of deleting.' });
        }
        await plan.deleteOne();
        const targetUser = await getTargetUserForGcal(req.user, plan.owner);
        if (plan.googleCalendarEventId && targetUser?.googleCalendar?.connected) {
            try { await gcal.deleteEvent(targetUser, plan.googleCalendarEventId); } catch (_) { }
        }
        audit(req, 'DELETE_VISIT_PLAN', plan);
        res.json({ success: true, message: 'Plan deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/visit-plans/:id/cancel — soft cancel
exports.cancelPlan = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (['completed', 'closed', 'cancelled'].includes(plan.status)) {
            return res.status(400).json({ success: false, message: `Plan is already ${plan.status}` });
        }

        plan.status = 'cancelled';
        await plan.save();

        const targetUser = await getTargetUserForGcal(req.user, plan.owner);
        if (plan.googleCalendarEventId && targetUser?.googleCalendar?.connected) {
            try {
                await gcal.deleteEvent(targetUser, plan.googleCalendarEventId);
                plan.googleCalendarEventId = null;
                plan.syncToGoogle = false;
                await plan.save();
            } catch (_) { }
        }

        await VisitSchedule.updateMany(
            { visitPlanRef: plan._id, status: 'pending' },
            { status: 'cancelled' }
        );

        // Lock the balance (refund tracking happens via reimbursement flow)
        const bal = await VisitPlanBalance.findOne({ visitPlanRef: plan._id });
        if (bal && !bal.lockedAt) {
            bal.lockedAt = new Date();
            await bal.save();
        }

        audit(req, 'CANCEL_VISIT_PLAN', plan);
        res.json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// POST /api/visit-plans/:id/close — mark closed (admin/hod/accounts)
exports.closePlan = async (req, res) => {
    try {
        if (!['admin', 'hod', 'accounts', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized to close plans' });
        }
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

        plan.status = 'closed';
        plan.completedAt = plan.completedAt || new Date();
        await plan.save();

        const bal = await VisitPlanBalance.findOne({ visitPlanRef: plan._id });
        if (bal && !bal.lockedAt) {
            bal.lockedAt = new Date();
            await bal.save();
        }
        audit(req, 'CLOSE_VISIT_PLAN', plan);
        res.json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// POST /api/visit-plans/:id/duplicate
exports.duplicatePlan = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id).lean();
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { plannedStartAt, plannedEndAt } = req.body;
        if (!plannedStartAt || !plannedEndAt) {
            return res.status(400).json({ success: false, message: 'plannedStartAt and plannedEndAt required for duplicate' });
        }

        const copy = await VisitPlan.create({
            owner: req.user._id,
            ownerRoleSnapshot: req.user.role,
            title: `${plan.title} (copy)`,
            planType: plan.planType,
            city: plan.city,
            state: plan.state,
            pinCode: plan.pinCode,
            cities: plan.cities || normalizePlanCities(plan.city, plan.state, plan.cityTier),
            cityTier: plan.cityTier,
            agents: plan.agents,
            customAgentNames: plan.customAgentNames || [],
            plannedStartAt,
            plannedEndAt,
            purpose: plan.purpose,
            notes: plan.notes,
            timezone: plan.timezone,
            status: 'scheduled'
        });
        audit(req, 'DUPLICATE_VISIT_PLAN', copy, { sourcePlan: plan._id });
        res.status(201).json({ success: true, data: copy });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// CHILD SCHEDULES
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/visit-plans/:id/schedules
exports.addSchedule = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (['completed', 'closed', 'cancelled'].includes(plan.status)) {
            return res.status(400).json({ success: false, message: `Cannot add schedules to a ${plan.status} plan` });
        }

        const {
            title, scheduledDate, scheduledEndDate,
            agentId, customAgentName,
            reminderOffset, notes, location, syncToGoogle
        } = req.body;

        // Must provide either a DB agent or a custom name
        if (!agentId && !customAgentName?.trim()) {
            return res.status(400).json({ success: false, message: 'Provide either agentId or customAgentName.' });
        }

        // Validate DB agent belongs to plan
        if (agentId) {
            if (!mongoose.isValidObjectId(agentId)) {
                return res.status(400).json({ success: false, message: 'Invalid agentId format.' });
            }
            if (!plan.agents.map(String).includes(String(agentId))) {
                return res.status(400).json({ success: false, message: 'agentId must be one of the plan agents.' });
            }
        }

        // Validate custom agent name belongs to plan
        if (!agentId && customAgentName?.trim()) {
            const cleanName = customAgentName.trim();
            if (!plan.customAgentNames.includes(cleanName)) {
                return res.status(400).json({
                    success: false,
                    message: `"${cleanName}" is not in the plan's custom agent names. Add it to the plan first.`
                });
            }
        }

        // Enforce single vs multi_same_city rule
        const existingCount = await VisitSchedule.countDocuments({ visitPlanRef: plan._id });
        if (plan.planType === 'single' && existingCount >= 1) {
            return res.status(400).json({
                success: false,
                message: 'This is a single-visit plan. Convert to a multi-visit plan to add more schedules.',
                errorCode: 'SINGLE_PLAN_LIMIT'
            });
        }

        const schedule = await VisitSchedule.create({
            user: plan.owner,
            visitPlanRef: plan._id,
            agentId: agentId || null,
            customAgentName: !agentId ? (customAgentName?.trim() || null) : null,
            title: title || plan.title,
            scheduledDate,
            scheduledEndDate,
            reminderOffset: reminderOffset || 0,
            notes,
            visitType: 'generic',
            location: location || `${plan.city}${plan.state ? ', ' + plan.state : ''}`,
            syncToGoogle: !!syncToGoogle
        });

        const targetUser = await getTargetUserForGcal(req.user, plan.owner);
        if (syncToGoogle && targetUser?.googleCalendar?.connected) {
            try {
                let agentNameForGcal = customAgentName?.trim() || null;
                if (agentId && !agentNameForGcal) {
                    const agentDoc = await Agent.findById(agentId).select('name');
                    if (agentDoc) agentNameForGcal = agentDoc.name;
                }
                schedule.agentNameForGcal = agentNameForGcal;

                const eventId = await gcal.createEvent(targetUser, schedule);
                if (eventId) {
                    schedule.googleCalendarEventId = eventId;
                    await schedule.save();
                }
            } catch (e) { /* non-fatal */ }
        }

        // Bump visit count only for DB agents
        if (agentId) {
            await Agent.findByIdAndUpdate(agentId, { $inc: { visitCount: 1 } });
        }

        res.status(201).json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// PUT /api/visit-plans/:id/schedules/:sid
exports.updateSchedule = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const schedule = await VisitSchedule.findOne({ _id: req.params.sid, visitPlanRef: plan._id });
        if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

        const editable = ['title', 'scheduledDate', 'scheduledEndDate', 'reminderOffset',
            'notes', 'location', 'status', 'syncToGoogle'];

        // agentId change: validate belongs to plan
        if (req.body.agentId !== undefined) {
            if (req.body.agentId && !mongoose.isValidObjectId(req.body.agentId)) {
                return res.status(400).json({ success: false, message: 'Invalid agentId format.' });
            }
            if (req.body.agentId && !plan.agents.map(String).includes(String(req.body.agentId))) {
                return res.status(400).json({ success: false, message: 'agentId must be one of the plan agents.' });
            }
            schedule.agentId = req.body.agentId || null;
            if (req.body.agentId) schedule.customAgentName = null;
        }

        // customAgentName change
        if (req.body.customAgentName !== undefined) {
            const cleanName = (req.body.customAgentName || '').trim();
            if (cleanName && !plan.customAgentNames.includes(cleanName)) {
                return res.status(400).json({
                    success: false,
                    message: `"${cleanName}" is not in the plan's custom agent names.`
                });
            }
            schedule.customAgentName = cleanName || null;
            if (cleanName) schedule.agentId = null;
        }

        editable.forEach(f => {
            if (req.body[f] !== undefined) schedule[f] = req.body[f];
        });

        if (req.body.scheduledDate || req.body.reminderOffset !== undefined) {
            schedule.reminderSent = false;
        }
        if (req.body.status === 'attended' && !schedule.attendedAt) {
            schedule.attendedAt = new Date();
        }

        await schedule.save();

        // Google sync
        const targetUser = await getTargetUserForGcal(req.user, plan.owner);
        if (schedule.syncToGoogle && targetUser?.googleCalendar?.connected) {
            try {
                let agentNameForGcal = schedule.customAgentName;
                if (schedule.agentId && !agentNameForGcal) {
                    const agentDoc = await Agent.findById(schedule.agentId).select('name');
                    if (agentDoc) agentNameForGcal = agentDoc.name;
                }
                schedule.agentNameForGcal = agentNameForGcal;

                if (schedule.googleCalendarEventId) {
                    await gcal.updateEvent(targetUser, schedule.googleCalendarEventId, schedule);
                } else {
                    const id = await gcal.createEvent(targetUser, schedule);
                    if (id) { schedule.googleCalendarEventId = id; await schedule.save(); }
                }
            } catch (e) { /* non-fatal */ }
        }

        res.json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// DELETE /api/visit-plans/:id/schedules/:sid
exports.deleteSchedule = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Block if any expense points to this schedule
        const hasExpense = await Expense.exists({ visitScheduleRef: req.params.sid });
        if (hasExpense) {
            return res.status(400).json({ success: false, message: 'Cannot delete — expenses are linked to this schedule.' });
        }

        const schedule = await VisitSchedule.findOneAndDelete({ _id: req.params.sid, visitPlanRef: plan._id });
        if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

        const targetUser = await getTargetUserForGcal(req.user, plan.owner);
        if (schedule.googleCalendarEventId && targetUser?.googleCalendar?.connected) {
            try { await gcal.deleteEvent(targetUser, schedule.googleCalendarEventId); } catch (_) { }
        }
        res.json({ success: true, message: 'Schedule deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// AGENT ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/visit-plans/:id/agents — append
exports.addAgents = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { agentIds } = req.body;
        if (!Array.isArray(agentIds) || !agentIds.length) {
            return res.status(400).json({ success: false, message: 'agentIds is required' });
        }
        const check = await validateAgentsActive(agentIds);
        if (!check.ok) return res.status(400).json({ success: false, message: check.message });

        const set = new Set(plan.agents.map(String));
        agentIds.forEach(id => set.add(String(id)));
        plan.agents = Array.from(set);
        await plan.save();
        res.json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// PUT /api/visit-plans/:id/agents — replace
exports.replaceAgents = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { agentIds } = req.body;
        const check = await validateAgentsActive(agentIds);
        if (!check.ok) return res.status(400).json({ success: false, message: check.message });

        const scheduledAgents = await VisitSchedule.find({ visitPlanRef: plan._id }).distinct('agentId');
        const stillReferenced = scheduledAgents.filter(a => !agentIds.map(String).includes(String(a)));
        if (stillReferenced.length) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove agents that are referenced by schedules.'
            });
        }
        plan.agents = agentIds;
        await plan.save();
        res.json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// DELETE /api/visit-plans/:id/agents/:agentId
exports.removeAgent = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const referenced = await VisitSchedule.exists({ visitPlanRef: plan._id, agentId: req.params.agentId });
        if (referenced) {
            return res.status(400).json({ success: false, message: 'Agent is referenced by a schedule in this plan.' });
        }
        plan.agents = plan.agents.filter(a => String(a) !== String(req.params.agentId));
        if (plan.agents.length === 0) {
            return res.status(400).json({ success: false, message: 'Plan must have at least one agent.' });
        }
        await plan.save();
        res.json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// BALANCE
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/visit-plans/:id/balance
exports.getBalance = async (req, res) => {
    try {
        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const balance = await VisitPlanBalance.findOne({ visitPlanRef: plan._id })
            .populate('advanceClaimRef', 'claimNumber status totalAmount approvedAmount');
        res.json({ success: true, data: balance || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT PHOTO (C3 policy)
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/visit-plans/:id/schedules/:sid/client-photo { uploadId }
exports.attachClientPhoto = async (req, res) => {
    try {
        const { uploadId } = req.body;
        if (!uploadId) return res.status(400).json({ success: false, message: 'uploadId required' });

        const plan = await VisitPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (!(await canAccessPlan(req.user, plan))) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const schedule = await VisitSchedule.findOne({ _id: req.params.sid, visitPlanRef: plan._id });
        if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

        const upload = await Upload.findById(uploadId);
        if (!upload) return res.status(404).json({ success: false, message: 'Upload not found' });

        // Bind the upload to this schedule
        upload.refModel = 'VisitSchedule';
        upload.refId = schedule._id;
        upload.context = 'client_photo';
        await upload.save();

        schedule.clientPhoto = {
            uploadRef: upload._id,
            verificationStatus: 'pending',
            verifiedBy: null,
            verifiedAt: null,
            rejectionReason: null
        };
        await schedule.save();

        audit(req, 'ATTACH_CLIENT_PHOTO', plan, { scheduleId: schedule._id });
        res.json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// PUT /api/visit-plans/:id/schedules/:sid/client-photo/verify { status, reason }
exports.verifyClientPhoto = async (req, res) => {
    try {
        if (!['accounts', 'admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized to verify photos' });
        }
        const { status, reason } = req.body;
        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'status must be verified or rejected' });
        }
        const schedule = await VisitSchedule.findOne({ _id: req.params.sid, visitPlanRef: req.params.id });
        if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
        if (!schedule.clientPhoto?.uploadRef) {
            return res.status(400).json({ success: false, message: 'No photo attached' });
        }

        schedule.clientPhoto.verificationStatus = status;
        schedule.clientPhoto.verifiedBy = req.user._id;
        schedule.clientPhoto.verifiedAt = new Date();
        if (status === 'rejected') schedule.clientPhoto.rejectionReason = reason || 'Not compliant';
        await schedule.save();

        AuditLog.create({
            userId: req.user._id,
            action: status === 'verified' ? 'VERIFY_CLIENT_PHOTO' : 'REJECT_CLIENT_PHOTO',
            targetId: schedule._id,
            targetModel: 'VisitSchedule',
            details: { status, reason }
        }).catch(() => { });

        res.json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

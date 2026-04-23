/**
 * Seed v1 policies (standard + leadership) if none exist.
 * Encodes:
 *   - C1: Hotels must be pre-booked.
 *   - C2: Local cabs must be via Ola/Uber.
 *   - C3: Client photo per schedule (global requirement).
 *   - C4: No bill, no claim (receiptRequired across all categories).
 *   - Pre-booked flight/train/hotel = uncapped (as per bill) for ALL users.
 *   - Transport (cab) = as per bill for ALL users.
 *   - HOD/admin (leadership) get uncapped food, agent_entertainment, office_supplies, other.
 */
const Policy = require('../models/Policy');

const buildStandardRules = () => [
    // Pre-booked categories — uncapped, pre-booking required
    { category: 'flight', cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true, requiresPreBooking: true },
    { category: 'train',  cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true, requiresPreBooking: true },
    { category: 'hotel',  cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true, requiresPreBooking: true,
      notes: 'Hotels must be pre-booked (policy C1).' },

    // Local transport — as per bill, but cab must be Ola/Uber only
    { category: 'cab',    cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true, allowedBookingModes: ['ola', 'uber'],
      notes: 'Cabs must be booked via Ola or Uber only (policy C2).' },
    { category: 'metro',  cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true },
    { category: 'bus',    cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true },
    { category: 'parking_toll', cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true },

    // Meals — capped (placeholders; update with real caps)
    { category: 'food', cityTier: 'tier_1', maxPerDay: 1500, maxPerVisit: null, requiresReceipt: true },
    { category: 'food', cityTier: 'tier_2', maxPerDay: 1000, maxPerVisit: null, requiresReceipt: true },
    { category: 'food', cityTier: 'tier_3', maxPerDay: 700,  maxPerVisit: null, requiresReceipt: true },
    { category: 'food', cityTier: 'any',    maxPerDay: 1000, maxPerVisit: null, requiresReceipt: true },

    // Agent entertainment
    { category: 'agent_entertainment', cityTier: 'any', maxPerDay: 2500, maxPerVisit: 5000, requiresReceipt: true },

    // Connectivity & supplies
    { category: 'internet_phone',  cityTier: 'any', maxPerDay: null, maxPerVisit: 500,  requiresReceipt: true },
    { category: 'office_supplies', cityTier: 'any', maxPerDay: null, maxPerVisit: 1000, requiresReceipt: true },
    { category: 'visa_passport',   cityTier: 'any', maxPerDay: null, maxPerVisit: null, requiresReceipt: true },
    { category: 'other',           cityTier: 'any', maxPerDay: null, maxPerVisit: 1000, requiresReceipt: true,
      notes: 'Other expenses require justification.' }
];

const buildLeadershipRules = () => [
    // Pre-booked — same policy, uncapped
    { category: 'flight', cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true, requiresPreBooking: true },
    { category: 'train',  cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true, requiresPreBooking: true },
    { category: 'hotel',  cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true, requiresPreBooking: true },

    // Transport — same Ola/Uber rule applies to everyone
    { category: 'cab',    cityTier: 'any', maxPerDay: null, maxPerVisit: null,
      requiresReceipt: true, allowedBookingModes: ['ola', 'uber'] },
    { category: 'metro',  cityTier: 'any', maxPerDay: null, maxPerVisit: null, requiresReceipt: true },
    { category: 'bus',    cityTier: 'any', maxPerDay: null, maxPerVisit: null, requiresReceipt: true },
    { category: 'parking_toll', cityTier: 'any', maxPerDay: null, maxPerVisit: null, requiresReceipt: true },

    // Leadership differences — uncapped / higher caps on discretionary categories
    { category: 'food',                cityTier: 'any', maxPerDay: null, maxPerVisit: null, requiresReceipt: true },
    { category: 'agent_entertainment', cityTier: 'any', maxPerDay: null, maxPerVisit: null, requiresReceipt: true },
    { category: 'internet_phone',      cityTier: 'any', maxPerDay: null, maxPerVisit: null, requiresReceipt: true },
    { category: 'office_supplies',     cityTier: 'any', maxPerDay: null, maxPerVisit: null, requiresReceipt: true },
    { category: 'visa_passport',       cityTier: 'any', maxPerDay: null, maxPerVisit: null, requiresReceipt: true },
    { category: 'other',               cityTier: 'any', maxPerDay: null, maxPerVisit: null, requiresReceipt: true }
];

const GLOBAL = {
    clientPhotoPerSchedule: true,
    photoBackgroundMustShowBusinessIdentity: true,
    receiptRequiredForAllExpenses: true,
    reimbursementWindowDays: 7
};

async function seedPolicies() {
    const [stdActive, leadActive] = await Promise.all([
        Policy.findOne({ policyKind: 'standard', isActive: true }),
        Policy.findOne({ policyKind: 'leadership', isActive: true })
    ]);

    const out = { standardCreated: false, leadershipCreated: false };

    if (!stdActive) {
        // Ensure no dangling unique-index collision on version
        const existing = await Policy.findOne({ policyKind: 'standard', version: 'v1.0' });
        if (!existing) {
            const p = await Policy.create({
                name: 'Standard Travel & Expense Policy',
                version: 'v1.0',
                policyKind: 'standard',
                description: 'Baseline B2B policy — hotels pre-booked, cabs via Ola/Uber, bills mandatory.',
                effectiveFrom: new Date(),
                rules: buildStandardRules(),
                globalRequirements: GLOBAL,
                isActive: true,
                activatedAt: new Date()
            });
            out.standardCreated = true;
            console.log(`[Policy Seed] Activated standard policy v1.0 (${p._id})`);
        }
    }

    if (!leadActive) {
        const existing = await Policy.findOne({ policyKind: 'leadership', version: 'v1.0' });
        if (!existing) {
            const p = await Policy.create({
                name: 'Leadership Travel & Expense Policy',
                version: 'v1.0',
                policyKind: 'leadership',
                description: 'HOD/Admin override — discretionary caps lifted; pre-booking / Ola-Uber / bill / photo rules unchanged.',
                effectiveFrom: new Date(),
                rules: buildLeadershipRules(),
                globalRequirements: GLOBAL,
                isActive: true,
                activatedAt: new Date()
            });
            out.leadershipCreated = true;
            console.log(`[Policy Seed] Activated leadership policy v1.0 (${p._id})`);
        }
    }

    return out;
}

async function seedExpenseTemplates() {
    const ExpenseTemplate = require('../models/ExpenseTemplate');
    const count = await ExpenseTemplate.countDocuments();
    if (count > 0) return { created: 0 };

    const templates = [
        { name: 'Flight (one-way)', category: 'flight', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Flight (round-trip)', category: 'flight', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Train (sleeper/3AC)', category: 'train', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Bus (inter-city)', category: 'bus', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Hotel (per night)', category: 'hotel', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'], autoSelectForPlanType: 'multi_same_city' },
        { name: 'Local cab (Ola/Uber)', category: 'cab', defaultAmount: 0, lockedBookingModes: ['ola', 'uber'], allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Metro / Public transit', category: 'metro', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Parking / Toll', category: 'parking_toll', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Meal (lunch/dinner)', category: 'food', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Agent entertainment', category: 'agent_entertainment', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Internet / Phone', category: 'internet_phone', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Office supplies', category: 'office_supplies', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] },
        { name: 'Other', category: 'other', defaultAmount: 0, allowedPlanTypes: ['single', 'multi_same_city'] }
    ];

    const created = await ExpenseTemplate.insertMany(templates);
    console.log(`[Policy Seed] Seeded ${created.length} expense templates`);
    return { created: created.length };
}

module.exports = { seedPolicies, seedExpenseTemplates };

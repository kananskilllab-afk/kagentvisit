/**
 * Migration: Phase 2 — Backfill VisitPlan wrappers for existing VisitSchedules
 *
 * Run with:
 *   node server/migration/migrateToVisitPlans.js
 *
 * Safe to re-run — uses upserts and skips already-migrated records.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000
    });
    console.log('Connected to MongoDB.');

    // Require models after connection
    const VisitSchedule = require('../models/VisitSchedule');
    const VisitPlan = require('../models/VisitPlan');
    const ExpenseClaim = require('../models/ExpenseClaim');

    let created = 0, skipped = 0, claimsPatched = 0, errors = [];

    // ── Step 1: Backfill VisitPlan for every orphan VisitSchedule ──────────
    const orphans = await VisitSchedule.find({ visitPlanRef: null }).lean();
    console.log(`Found ${orphans.length} orphan schedules.`);

    for (const s of orphans) {
        try {
            const locationStr = (s.location || '').split(',').map(x => x.trim());
            const city = locationStr[0] || 'Unknown';
            const state = locationStr[1] || '';

            const plan = await VisitPlan.findOneAndUpdate(
                {
                    owner: s.user,
                    city,
                    // Group schedules on the same day into one plan
                    plannedStartAt: {
                        $gte: new Date(new Date(s.scheduledDate).setHours(0, 0, 0, 0)),
                        $lte: new Date(new Date(s.scheduledDate).setHours(23, 59, 59, 999))
                    }
                },
                {
                    $setOnInsert: {
                        owner: s.user,
                        ownerRoleSnapshot: 'user',
                        title: s.title || `Visit – ${city}`,
                        planType: 'single',
                        city,
                        state,
                        cityTier: 'na',
                        agents: s.linkedVisit ? [] : [],
                        plannedStartAt: s.scheduledDate,
                        plannedEndAt: s.scheduledEndDate || s.scheduledDate,
                        status: 'completed',
                        notes: '[Backfilled from legacy schedule]',
                        timezone: 'Asia/Kolkata'
                    }
                },
                { upsert: true, new: true }
            );

            if (!plan) { skipped++; continue; }

            await VisitSchedule.findByIdAndUpdate(s._id, { visitPlanRef: plan._id });
            created++;
        } catch (e) {
            errors.push({ scheduleId: s._id, error: e.message });
        }
    }

    // ── Step 2: Patch existing ExpenseClaims ───────────────────────────────
    const legacyClaims = await ExpenseClaim.find({
        visitRef: { $exists: true, $ne: null },
        visitPlanRef: null
    }).lean();
    console.log(`Found ${legacyClaims.length} legacy claims with visitRef but no visitPlanRef.`);

    for (const c of legacyClaims) {
        try {
            await ExpenseClaim.findByIdAndUpdate(c._id, {
                $set: {
                    claimType: 'reimbursement',
                    policyKindApplied: 'standard',
                    policyVersionSnapshot: 'pre-migration'
                }
            });
            claimsPatched++;
        } catch (e) {
            errors.push({ claimId: c._id, error: e.message });
        }
    }

    // ── Patch claims that have no claimType at all ─────────────────────────
    await ExpenseClaim.updateMany(
        { claimType: { $exists: false } },
        { $set: { claimType: 'reimbursement' } }
    );

    console.log('\n── Migration complete ────────────────────────────────────');
    console.log(`  VisitPlans created/upserted: ${created}`);
    console.log(`  Schedules skipped:           ${skipped}`);
    console.log(`  Claims patched:              ${claimsPatched}`);
    console.log(`  Errors:                      ${errors.length}`);
    if (errors.length > 0) {
        console.log('\nErrors:');
        errors.forEach(e => console.log(' ', JSON.stringify(e)));
    }

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});

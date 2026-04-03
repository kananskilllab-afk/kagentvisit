/**
 * One-time patch: ensure kananSpecific.onboardingDate and
 * kananSpecific.appcomOnboardingDate are NOT required in the active B2B form config.
 *
 * Run once:  node server/patchOnboardingDates.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const db = mongoose.connection.db;
        const collection = db.collection('formconfigs');

        const FIELD_IDS = ['kananSpecific.onboardingDate', 'kananSpecific.appcomOnboardingDate'];

        for (const fieldId of FIELD_IDS) {
            const result = await collection.updateOne(
                { isActive: true, formType: 'generic', 'fields.id': fieldId },
                { $set: { 'fields.$.required': false } }
            );
            console.log(`Patched "${fieldId}":`, result.modifiedCount ? 'updated' : 'no change / field not found');
        }

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

run();

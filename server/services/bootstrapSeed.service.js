const FormConfig = require('../models/FormConfig');
const { seedPolicies, seedExpenseTemplates } = require('./policySeed');

let isSeeded = false;

const withoutPostInPersonFields = (fields) =>
    fields.filter((field) => !String(field.id || '').startsWith('postInPerson.'));

const seedData = async ({ genericFields, b2cFields }) => {
    if (isSeeded) return;

    try {
        const activeB2B = await FormConfig.findOne({ formType: 'generic', isActive: true });
        const hasB2C = await FormConfig.findOne({ formType: 'home_visit', isActive: true });
        const shouldReseedB2B = process.env.RESEED_DB === 'true';
        const genericFieldsWithoutPostInPerson = withoutPostInPersonFields(genericFields);

        if (!activeB2B || shouldReseedB2B) {
            console.log('Seeding/Updating B2B form configuration...');
            if (activeB2B && shouldReseedB2B) {
                await FormConfig.updateMany({ formType: 'generic' }, { isActive: false });
            }
            await FormConfig.create({
                version: `5.0-B2B-${Date.now()}`,
                isActive: true,
                formType: 'generic',
                description: 'Standard B2B agency visit form',
                fields: genericFieldsWithoutPostInPerson
            });
            console.log('B2B Form configuration seeded.');
        } else {
            const neverRequired = ['kananSpecific.onboardingDate', 'kananSpecific.appcomOnboardingDate'];
            const needsPatch = activeB2B.fields.some((field) =>
                (neverRequired.includes(field.id) && field.required === true) ||
                String(field.id || '').startsWith('postInPerson.')
            );
            if (needsPatch) {
                activeB2B.fields = activeB2B.fields
                    .filter((field) => !String(field.id || '').startsWith('postInPerson.'))
                    .map(field => neverRequired.includes(field.id) ? { ...field.toObject(), required: false } : field);
                await activeB2B.save();
                console.log('Patched active B2B form: removed post in-person fields and fixed onboarding-date requirements.');
            }
        }

        if (!hasB2C || hasB2C.fields.length < 17) {
            console.log('Seeding B2C form configuration...');
            if (hasB2C) {
                await FormConfig.updateMany({ formType: 'home_visit' }, { isActive: false });
            }
            await FormConfig.create({
                version: `3.0-B2C-${Date.now()}`,
                isActive: true,
                formType: 'home_visit',
                description: 'Standard B2C home visit form',
                fields: b2cFields
            });
            console.log('B2C Form configuration seeded.');
        }

        await seedPolicies();
        await seedExpenseTemplates();

        isSeeded = true;
    } catch (err) {
        console.error('Seeding Error:', err.message);
    }
};

module.exports = { seedData };

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const FormConfig = require('./models/FormConfig');

dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is missing. Cannot run repair.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const activeB2BConfigs = await FormConfig.find({ formType: 'generic', isActive: true }).sort({ createdAt: -1 });
    if (!activeB2BConfigs.length) {
        console.log('No active B2B form configs found. Nothing to repair.');
        return;
    }

    let updatedCount = 0;
    for (const cfg of activeB2BConfigs) {
        const before = cfg.fields.length;
        cfg.fields = cfg.fields.filter((f) => !String(f.id || '').startsWith('postInPerson.'));
        const removed = before - cfg.fields.length;
        if (removed > 0) {
            cfg.version = `${cfg.version}-no-post-inperson-${Date.now().toString().slice(-5)}`;
            await cfg.save();
            updatedCount += 1;
            console.log(`Updated config ${cfg._id}: removed ${removed} postInPerson field(s)`);
        } else {
            console.log(`Config ${cfg._id}: no postInPerson fields found`);
        }
    }

    console.log(`Repair completed. Updated ${updatedCount} active B2B config(s).`);
}

main()
    .then(async () => {
        await mongoose.connection.close();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error('Repair failed:', err.message);
        try {
            await mongoose.connection.close();
        } catch {}
        process.exit(1);
    });

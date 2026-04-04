const FormConfig = require('../models/FormConfig');

exports.getFormConfig = async (req, res) => {
    try {
        const { formType } = req.query;
        const query = { isActive: true };
        if (formType) query.formType = formType;
        
        const config = await FormConfig.findOne(query).sort({ createdAt: -1 });
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateFormConfig = async (req, res) => {
    try {
        const { fields, formType } = req.body;
        let { version } = req.body;

        // Append timestamp to ensure version is always unique
        version = `${version}-${Date.now()}`;

        // Deactivate others of same type if this one will be active
        if (req.body.isActive) {
            await FormConfig.updateMany({ formType: formType || 'generic' }, { isActive: false });
        }

        const config = await FormConfig.create({
            ...req.body,
            version,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: config });
    } catch (error) {
        console.error('updateFormConfig error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const PostDemoFeedback = require('../models/PostDemoFeedback');

exports.getAll = async (req, res) => {
    try {
        const filter = ['admin', 'superadmin'].includes(req.user.role)
            ? {}
            : { submittedBy: req.user._id };
        const records = await PostDemoFeedback.find(filter)
            .sort({ demoDate: -1 })
            .populate('submittedBy', 'name employeeId');
        res.json({ success: true, data: records });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const record = await PostDemoFeedback.create({ ...req.body, submittedBy: req.user._id });
        res.status(201).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const record = await PostDemoFeedback.findById(req.params.id).populate('submittedBy', 'name employeeId');
        if (!record) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: record });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

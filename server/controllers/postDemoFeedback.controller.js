const PostDemoFeedback = require('../models/PostDemoFeedback');
const User = require('../models/User');

async function buildFilter(reqUser) {
    if (reqUser.role === 'superadmin') return {};
    if (reqUser.role === 'admin') {
        const me = await User.findById(reqUser._id).select('assignedEmployees');
        const ids = me?.assignedEmployees || [];
        return { submittedBy: { $in: [reqUser._id, ...ids] } };
    }
    return { submittedBy: reqUser._id };
}

exports.getAll = async (req, res) => {
    try {
        const filter = await buildFilter(req.user);
        const records = await PostDemoFeedback.find(filter)
            .sort({ demoDate: -1 })
            .populate('submittedBy', 'name employeeId')
            .populate('comments.addedBy', 'name role');
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
        const record = await PostDemoFeedback.findById(req.params.id)
            .populate('submittedBy', 'name employeeId')
            .populate('comments.addedBy', 'name role');
        if (!record) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: record });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text is required' });
        const record = await PostDemoFeedback.findById(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Not found' });
        record.comments.push({ text: text.trim(), addedBy: req.user._id });
        await record.save();
        await record.populate('comments.addedBy', 'name role');
        res.json({ success: true, data: record });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

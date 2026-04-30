const PostInPersonVisit = require('../models/PostInPersonVisit');
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

const getAll = async (req, res) => {
    try {
        const filter = await buildFilter(req.user);
        const records = await PostInPersonVisit.find(filter)
            .sort({ createdAt: -1 })
            .populate('submittedBy', 'name employeeId')
            .populate('comments.addedBy', 'name role');
        res.json({ success: true, data: records });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const create = async (req, res) => {
    try {
        const record = await PostInPersonVisit.create({ ...req.body, submittedBy: req.user._id });
        res.status(201).json({ success: true, data: record });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const record = await PostInPersonVisit.findById(req.params.id)
            .populate('submittedBy', 'name employeeId')
            .populate('comments.addedBy', 'name role');
        if (!record) return res.status(404).json({ success: false, message: 'Not found' });
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
        if (!isAdmin && record.submittedBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        res.json({ success: true, data: record });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text is required' });
        const record = await PostInPersonVisit.findById(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Not found' });
        record.comments.push({ text: text.trim(), addedBy: req.user._id });
        await record.save();
        await record.populate('comments.addedBy', 'name role');
        res.json({ success: true, data: record });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, create, getById, addComment };

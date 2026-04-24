const PostFieldDay = require('../models/PostFieldDay');
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

const getSubmissions = async (req, res) => {
    try {
        const filter = await buildFilter(req.user);
        const submissions = await PostFieldDay.find(filter)
            .sort({ date: -1 })
            .populate('submittedBy', 'name employeeId')
            .populate('comments.addedBy', 'name role');
        res.json({ success: true, data: submissions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createSubmission = async (req, res) => {
    try {
        const submission = await PostFieldDay.create({ ...req.body, submittedBy: req.user._id });
        res.status(201).json({ success: true, data: submission });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const getSubmissionById = async (req, res) => {
    try {
        const submission = await PostFieldDay.findById(req.params.id)
            .populate('submittedBy', 'name employeeId')
            .populate('comments.addedBy', 'name role');
        if (!submission) return res.status(404).json({ success: false, message: 'Not found' });
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
        if (!isAdmin && submission.submittedBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        res.json({ success: true, data: submission });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateSubmission = async (req, res) => {
    try {
        const submission = await PostFieldDay.findById(req.params.id);
        if (!submission) return res.status(404).json({ success: false, message: 'Not found' });
        if (submission.submittedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        Object.assign(submission, req.body);
        await submission.save();
        res.json({ success: true, data: submission });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text is required' });
        const submission = await PostFieldDay.findById(req.params.id);
        if (!submission) return res.status(404).json({ success: false, message: 'Not found' });
        submission.comments.push({ text: text.trim(), addedBy: req.user._id });
        await submission.save();
        await submission.populate('comments.addedBy', 'name role');
        res.json({ success: true, data: submission });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getSubmissions, createSubmission, getSubmissionById, updateSubmission, addComment };

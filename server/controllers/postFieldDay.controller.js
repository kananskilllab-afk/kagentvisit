const PostFieldDay = require('../models/PostFieldDay');

// GET /api/post-field-day
const getSubmissions = async (req, res) => {
    try {
        const filter = { submittedBy: req.user._id };
        const submissions = await PostFieldDay.find(filter)
            .sort({ date: -1 })
            .populate('submittedBy', 'name employeeId');
        res.json({ success: true, data: submissions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/post-field-day
const createSubmission = async (req, res) => {
    try {
        const submission = await PostFieldDay.create({
            ...req.body,
            submittedBy: req.user._id
        });
        res.status(201).json({ success: true, data: submission });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// GET /api/post-field-day/:id
const getSubmissionById = async (req, res) => {
    try {
        const submission = await PostFieldDay.findById(req.params.id)
            .populate('submittedBy', 'name employeeId');
        if (!submission) return res.status(404).json({ success: false, message: 'Not found' });
        if (submission.submittedBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        res.json({ success: true, data: submission });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/post-field-day/:id
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

module.exports = { getSubmissions, createSubmission, getSubmissionById, updateSubmission };

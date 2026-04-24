const DailyReport = require('../models/DailyReport');
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

const getBdmNames = async (req, res) => {
    try {
        const users = await User.find({ isActive: true }).select('name employeeId').sort({ name: 1 });
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getReports = async (req, res) => {
    try {
        const filter = await buildFilter(req.user);
        const reports = await DailyReport.find(filter)
            .sort({ date: -1 })
            .populate('submittedBy', 'name employeeId')
            .populate('comments.addedBy', 'name role');
        res.json({ success: true, data: reports });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createReport = async (req, res) => {
    try {
        const report = await DailyReport.create({ ...req.body, submittedBy: req.user._id });
        res.status(201).json({ success: true, data: report });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text is required' });
        const report = await DailyReport.findById(req.params.id);
        if (!report) return res.status(404).json({ success: false, message: 'Not found' });
        report.comments.push({ text: text.trim(), addedBy: req.user._id });
        await report.save();
        await report.populate('comments.addedBy', 'name role');
        res.json({ success: true, data: report });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getBdmNames, getReports, createReport, addComment };

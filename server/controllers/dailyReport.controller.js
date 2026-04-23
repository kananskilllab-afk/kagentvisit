const DailyReport = require('../models/DailyReport');
const User = require('../models/User');

// GET /api/daily-report/bdm-names  — lightweight list of active users for dropdown
const getBdmNames = async (req, res) => {
    try {
        const users = await User.find({ isActive: true }).select('name employeeId').sort({ name: 1 });
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/daily-report
const getReports = async (req, res) => {
    try {
        const filter = ['admin', 'superadmin'].includes(req.user.role)
            ? {}
            : { submittedBy: req.user._id };
        const reports = await DailyReport.find(filter)
            .sort({ date: -1 })
            .populate('submittedBy', 'name employeeId');
        res.json({ success: true, data: reports });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/daily-report
const createReport = async (req, res) => {
    try {
        const report = await DailyReport.create({
            ...req.body,
            submittedBy: req.user._id
        });
        res.status(201).json({ success: true, data: report });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

module.exports = { getBdmNames, getReports, createReport };

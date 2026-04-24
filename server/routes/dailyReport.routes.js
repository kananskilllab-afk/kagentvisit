const express = require('express');
const router = express.Router();
const { getBdmNames, getReports, createReport, addComment } = require('../controllers/dailyReport.controller');
const { protect } = require('../middleware/auth.middleware');

const requireRead = (req, res, next) => {
    if (['admin', 'superadmin'].includes(req.user?.role)) return next();
    if (req.user?.formAccess?.includes('daily_report')) return next();
    return res.status(403).json({ success: false, message: 'No access to Daily Report form' });
};

const requireWrite = (req, res, next) => {
    if (req.user?.formAccess?.includes('daily_report')) return next();
    return res.status(403).json({ success: false, message: 'Daily Report form not assigned to you' });
};

const requireAdmin = (req, res, next) => {
    if (['admin', 'superadmin'].includes(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: 'Admin access required' });
};

router.use(protect);
router.get('/bdm-names', requireRead, getBdmNames);
router.get('/', requireRead, getReports);
router.post('/', requireWrite, createReport);
router.post('/:id/comments', requireAdmin, addComment);

module.exports = router;

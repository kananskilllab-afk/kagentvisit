const express = require('express');
const router = express.Router();
const { getBdmNames, getReports, createReport } = require('../controllers/dailyReport.controller');
const { protect } = require('../middleware/auth.middleware');

const requireDailyReportAccess = (req, res, next) => {
    if (['admin', 'superadmin'].includes(req.user?.role)) return next();
    if (req.user?.formAccess?.includes('daily_report')) return next();
    return res.status(403).json({ success: false, message: 'No access to Daily Report form' });
};

router.use(protect);
router.use(requireDailyReportAccess);

router.get('/bdm-names', getBdmNames);
router.route('/').get(getReports).post(createReport);

module.exports = router;

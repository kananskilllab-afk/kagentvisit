const express = require('express');
const router = express.Router();
const { getSummary, getUserPerformance, getDetailedAnalytics, getBdmReport } = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

router.get('/summary',    getSummary);
router.get('/performance', authorize('admin', 'superadmin'), getUserPerformance);
router.get('/detailed',    authorize('admin', 'superadmin'), getDetailedAnalytics);
router.get('/bdm-report',  authorize('admin', 'superadmin'), getBdmReport);

module.exports = router;

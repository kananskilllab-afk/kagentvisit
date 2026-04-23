const express = require('express');
const router = express.Router();
const { getSubmissions, createSubmission, getSubmissionById, updateSubmission } = require('../controllers/postFieldDay.controller');
const { protect } = require('../middleware/auth.middleware');

const requirePostFieldDayAccess = (req, res, next) => {
    if (['admin', 'superadmin'].includes(req.user?.role)) return next();
    if (req.user?.formAccess?.includes('post_field_day')) return next();
    return res.status(403).json({ success: false, message: 'No access to Post Field Day form' });
};

router.use(protect);
router.use(requirePostFieldDayAccess);

router.route('/').get(getSubmissions).post(createSubmission);
router.route('/:id').get(getSubmissionById).put(updateSubmission);

module.exports = router;

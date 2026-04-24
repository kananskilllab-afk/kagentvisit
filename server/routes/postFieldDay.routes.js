const express = require('express');
const router = express.Router();
const { getSubmissions, createSubmission, getSubmissionById, updateSubmission, addComment } = require('../controllers/postFieldDay.controller');
const { protect } = require('../middleware/auth.middleware');

const requireRead = (req, res, next) => {
    if (['admin', 'superadmin'].includes(req.user?.role)) return next();
    if (req.user?.formAccess?.includes('post_field_day')) return next();
    return res.status(403).json({ success: false, message: 'No access to Post Field Day form' });
};

const requireWrite = (req, res, next) => {
    if (req.user?.formAccess?.includes('post_field_day')) return next();
    return res.status(403).json({ success: false, message: 'Post Field Day form not assigned to you' });
};

const requireAdmin = (req, res, next) => {
    if (['admin', 'superadmin'].includes(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: 'Admin access required' });
};

router.use(protect);
router.get('/', requireRead, getSubmissions);
router.post('/', requireWrite, createSubmission);
router.get('/:id', requireRead, getSubmissionById);
router.put('/:id', requireWrite, updateSubmission);
router.post('/:id/comments', requireAdmin, addComment);

module.exports = router;

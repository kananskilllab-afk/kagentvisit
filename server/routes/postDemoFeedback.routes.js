const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/postDemoFeedback.controller');
const { protect } = require('../middleware/auth.middleware');

const requireAccess = (req, res, next) => {
    if (['admin', 'superadmin'].includes(req.user?.role)) return next();
    if (req.user?.formAccess?.includes('post_demo_feedback')) return next();
    return res.status(403).json({ success: false, message: 'No access to Post-Demo Feedback form' });
};

router.use(protect, requireAccess);
router.route('/').get(ctrl.getAll).post(ctrl.create);
router.route('/:id').get(ctrl.getById);

module.exports = router;

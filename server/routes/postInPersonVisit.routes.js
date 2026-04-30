const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/postInPersonVisit.controller');
const { protect } = require('../middleware/auth.middleware');

const requireRead = (req, res, next) => {
    if (['admin', 'superadmin'].includes(req.user?.role)) return next();
    if (req.user?.formAccess?.includes('post_in_person_visit')) return next();
    return res.status(403).json({ success: false, message: 'No access to Post In-Person Visit form' });
};

const requireWrite = (req, res, next) => {
    if (req.user?.formAccess?.includes('post_in_person_visit')) return next();
    return res.status(403).json({ success: false, message: 'Post In-Person Visit form not assigned to you' });
};

const requireAdmin = (req, res, next) => {
    if (['admin', 'superadmin'].includes(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: 'Admin access required' });
};

router.use(protect);
router.get('/', requireRead, ctrl.getAll);
router.post('/', requireWrite, ctrl.create);
router.get('/:id', requireRead, ctrl.getById);
router.post('/:id/comments', requireAdmin, ctrl.addComment);

module.exports = router;

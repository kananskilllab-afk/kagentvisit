const express = require('express');
const router = express.Router();
const {
    getVisits,
    createVisit,
    getVisitById,
    updateVisit,
    deleteVisit,
    requestVisitUnlock,
    approveVisitUnlock,
    addFollowUpMeeting,
    updateVisitStatus
} = require('../controllers/visits.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

router.route('/')
    .get(getVisits)
    .post(createVisit);

router.post('/:id/request-unlock', requestVisitUnlock);
router.put('/:id/approve-unlock', authorize('admin', 'superadmin'), approveVisitUnlock);
router.put('/:id/status', authorize('admin', 'superadmin'), updateVisitStatus);
router.post('/:id/follow-ups', addFollowUpMeeting);

router.route('/:id')
    .get(getVisitById)
    .put(updateVisit)
    .delete(deleteVisit);

module.exports = router;

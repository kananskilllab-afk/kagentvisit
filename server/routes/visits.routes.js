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
const {
    getActionItems,
    getMyOpenActionItems,
    createActionItem,
    updateActionItem,
    deleteActionItem,
    changeActionItemStatus
} = require('../controllers/actionItems.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

router.route('/')
    .get(getVisits)
    .post(createVisit);

router.get('/action-items/my-open', getMyOpenActionItems);

router.post('/:id/request-unlock', requestVisitUnlock);
router.put('/:id/approve-unlock', authorize('admin', 'superadmin'), approveVisitUnlock);
router.put('/:id/status', authorize('admin', 'superadmin'), updateVisitStatus);
router.post('/:id/follow-ups', addFollowUpMeeting);

// Action Items sub-resource
router.get('/:id/action-items',                   getActionItems);
router.post('/:id/action-items',                  createActionItem);
router.put('/:id/action-items/:itemId',            updateActionItem);
router.put('/:id/action-items/:itemId/status',     changeActionItemStatus);
router.delete('/:id/action-items/:itemId',         deleteActionItem);

router.route('/:id')
    .get(getVisitById)
    .put(updateVisit)
    .delete(deleteVisit);

module.exports = router;

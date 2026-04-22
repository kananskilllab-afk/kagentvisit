const express = require('express');
const router  = express.Router();
const {
    getScheduledVisits,
    createScheduledVisit,
    updateScheduledVisit,
    deleteScheduledVisit,
    triggerReminders
} = require('../controllers/calendar.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',           getScheduledVisits);
router.post('/',          createScheduledVisit);
router.post('/reminders', triggerReminders);
router.put('/:id',        updateScheduledVisit);
router.delete('/:id',     deleteScheduledVisit);

module.exports = router;

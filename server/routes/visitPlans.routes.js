const express = require('express');
const router = express.Router();
const {
    createPlan, listPlans, getPlan, updatePlan, deletePlan,
    cancelPlan, closePlan, duplicatePlan,
    addSchedule, updateSchedule, deleteSchedule,
    addAgents, replaceAgents, removeAgent,
    getBalance,
    attachClientPhoto, verifyClientPhoto
} = require('../controllers/visitPlans.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Plans
router.route('/')
    .get(listPlans)
    .post(createPlan);

router.route('/:id')
    .get(getPlan)
    .put(updatePlan)
    .delete(deletePlan);

router.post('/:id/cancel', cancelPlan);
router.post('/:id/close', closePlan);
router.post('/:id/duplicate', duplicatePlan);

// Schedules (children)
router.post('/:id/schedules', addSchedule);
router.put('/:id/schedules/:sid', updateSchedule);
router.delete('/:id/schedules/:sid', deleteSchedule);

// Agents
router.post('/:id/agents', addAgents);
router.put('/:id/agents', replaceAgents);
router.delete('/:id/agents/:agentId', removeAgent);

// Balance
router.get('/:id/balance', getBalance);

// Client photo (C3 policy)
router.post('/:id/schedules/:sid/client-photo', attachClientPhoto);
router.put('/:id/schedules/:sid/client-photo/verify', verifyClientPhoto);

module.exports = router;

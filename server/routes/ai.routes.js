const express = require('express');
const router = express.Router({ mergeParams: true });
const aiController = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

// Prefix: /api/visits/:id/ai

router.post('/insights', protect, aiController.generateInsights);
router.post('/audit', protect, aiController.evaluateAudit);

module.exports = router;

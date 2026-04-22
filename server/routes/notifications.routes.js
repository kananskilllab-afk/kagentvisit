const express = require('express');
const router = express.Router();
const { getNotifications, markRead } = require('../controllers/notifications.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', getNotifications);
router.put('/read', markRead);

module.exports = router;

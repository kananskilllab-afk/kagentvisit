const Notification = require('../models/Notification');

// @desc    Get notifications for current user
exports.getNotifications = async (req, res) => {
    try {
        const query = { recipient: req.user._id };
        if (req.query.unreadOnly === 'true') query.isRead = false;

        const notifications = await Notification.find(query)
            .populate('claimRef', 'claimNumber status totalAmount')
            .sort({ createdAt: -1 })
            .limit(parseInt(req.query.limit) || 50);

        const unreadCount = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        res.json({ success: true, data: notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark notification(s) as read
exports.markRead = async (req, res) => {
    try {
        const { ids } = req.body; // Array of notification IDs, or empty to mark all

        if (ids && ids.length > 0) {
            await Notification.updateMany(
                { _id: { $in: ids }, recipient: req.user._id },
                { isRead: true }
            );
        } else {
            await Notification.updateMany(
                { recipient: req.user._id, isRead: false },
                { isRead: true }
            );
        }

        res.json({ success: true, message: 'Notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

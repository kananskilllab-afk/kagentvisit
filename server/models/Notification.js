const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'claim_submitted',       // Sent to accounts/admin when user submits
            'claim_approved',        // Sent to user when approved
            'claim_rejected',        // Sent to user when rejected
            'claim_needs_justification', // Sent to user when justification requested
            'claim_paid',            // Sent to user when paid
            'claim_under_review',    // Sent to user when review starts
            'expense_reminder',      // Generic expense reminder
            'visit_reminder'         // Scheduled visit reminder
        ]
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    claimRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExpenseClaim'
    },
    visitScheduleRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VisitSchedule'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    emailSent: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

module.exports = mongoose.model('Notification', notificationSchema);

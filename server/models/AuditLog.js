const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    action: {
        type: String,
        required: true,
        index: true
        // Examples: 'LOGIN', 'LOGOUT', 'POST_VISITS', 'PUT_VISITS',
        //           'DELETE_VISITS', 'POST_USERS', 'PUT_USERS', 'DELETE_USERS'
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId
    },
    targetModel: {
        type: String,
        enum: [
            'Visit', 'User', 'FormConfig', 'PinCode',
            'VisitPlan', 'VisitSchedule', 'VisitPlanBalance',
            'Expense', 'ExpenseClaim', 'ExpenseTemplate',
            'Policy', 'Upload', 'Agent',
            null
        ],
        default: null
    },
    ipAddress: { type: String },
    userAgent:  { type: String },
    details: {
        type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Auto-expire audit logs after 90 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

const mongoose = require('mongoose');

const visitScheduleSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    scheduledDate: {
        type: Date,
        required: true,
        index: true
    },
    // Reminder offset in minutes before the visit (0 = no reminder)
    reminderOffset: {
        type: Number,
        default: 0,
        enum: [0, 15, 60, 180, 1440, 2880] // 0, 15min, 1h, 3h, 1day, 2days
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        trim: true
    },
    visitType: {
        type: String,
        enum: ['generic', 'home_visit'],
        default: 'generic'
    },
    location: {
        type: String,
        trim: true
    },
    linkedVisit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Visit',
        default: null
    },
    // Link to parent visit plan (new in v2)
    visitPlanRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VisitPlan',
        default: null,
        index: true
    },
    // Single agent for this specific schedule (must be in parent plan's agents[])
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        default: null,
        index: true
    },
    // Free-text agent/company name when not in Manage Agent (one of agentId or customAgentName must be set)
    customAgentName: {
        type: String,
        trim: true,
        default: null
    },
    // End time for the visit slot (optional — when omitted, treated as a point-in-time reminder)
    scheduledEndDate: { type: Date },
    // Per-schedule status (plan-level status is the source of truth, this tracks individual meeting)
    status: {
        type: String,
        enum: ['pending', 'attended', 'missed', 'cancelled'],
        default: 'pending'
    },
    attendedAt: { type: Date },

    // Client photo requirement (new policy C3)
    clientPhoto: {
        uploadRef:          { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
        verificationStatus: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
        },
        verifiedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        verifiedAt:      { type: Date },
        rejectionReason: { type: String, trim: true },
        aiLogoScore:     { type: Number, min: 0, max: 1 }
    },

    googleCalendarEventId: {
        type: String,
        default: null
    },
    syncToGoogle: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

visitScheduleSchema.index({ user: 1, scheduledDate: 1 });
visitScheduleSchema.index({ scheduledDate: 1, reminderSent: 1, reminderOffset: 1 });
visitScheduleSchema.index({ visitPlanRef: 1, scheduledDate: 1 });

module.exports = mongoose.model('VisitSchedule', visitScheduleSchema);

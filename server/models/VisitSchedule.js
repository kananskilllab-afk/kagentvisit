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

module.exports = mongoose.model('VisitSchedule', visitScheduleSchema);

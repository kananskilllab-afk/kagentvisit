const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema({
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date:             { type: Date, required: true },
    bdmName:          { type: String, required: true, trim: true },
    bdmNames:         [{ type: String, trim: true }],
    leaveToday:       { type: String, enum: ['Yes', 'No', 'On Travel'], required: true },
    location:         { type: String, trim: true },
    numberOfMeetings: { type: Number, min: 0, default: 0 },

    // Admin comments
    comments: [{
        text:      { type: String, required: true, trim: true },
        addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

dailyReportSchema.index({ submittedBy: 1, date: -1 });

module.exports = mongoose.model('DailyReport', dailyReportSchema);

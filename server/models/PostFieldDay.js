const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
    name:             { type: String, trim: true },
    status:           { type: String, enum: ['New', 'Existing', ''] },
    statuses:         [{ type: String, trim: true }],
    city:             { type: String, trim: true },
    gmbLink:          { type: String, trim: true },
    interestedIn:     { type: String, enum: ['Admission', 'Academy', 'Both', ''] },
    interestedInList: [{ type: String, trim: true }]
}, { _id: false });

const postFieldDaySchema = new mongoose.Schema({
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: { type: Date, required: true },
    representativeName: { type: String, required: true },
    representativeNames: [{ type: String, trim: true }],
    leaveToday: { type: Boolean, required: true },
    todaysLocation: { type: String, trim: true },
    workMode: {
        type: String,
        enum: ['On field', 'Work from home', 'Other', '']
    },
    workModes: [{ type: String, trim: true }],
    workModeOther: { type: String, trim: true },

    visitsPlanned:  { type: Number, default: 0 },
    visitsGateCrash:{ type: Number, default: 0 },
    visitsNew:      { type: Number, default: 0 },
    visitsNewFollowUp: { type: Number, default: 0 },
    visitsExisting: { type: Number, default: 0 },

    partners: [partnerSchema],

    newAcademyProspects:   { type: String, trim: true },
    newAdmissionProspects: { type: String, trim: true },

    salesEffectiveness: { type: Number, min: 1, max: 5 },

    revenueNew:      { type: Number, default: 0 },
    revenueExisting: { type: Number, default: 0 },

    obstacles:    { type: String, trim: true },
    adminTimeSpent: { type: String, trim: true },

    visitsBookedToday: { type: Number, default: 0 },
    visitsPlannedTomorrow: { type: String, trim: true },
    demosBooked: { type: Number, default: 0 },

    confidenceLevel: { type: Number, min: 1, max: 5 },
    keyFocusTomorrow: { type: String, trim: true },

    // Admin comments
    comments: [{
        text:      { type: String, required: true, trim: true },
        addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

postFieldDaySchema.index({ submittedBy: 1, date: -1 });

module.exports = mongoose.model('PostFieldDay', postFieldDaySchema);

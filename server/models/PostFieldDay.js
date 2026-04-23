const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
    name:        { type: String, trim: true },
    status:      { type: String, enum: ['New', 'Existing', ''] },
    city:        { type: String, trim: true },
    gmbLink:     { type: String, trim: true },
    interestedIn:{ type: String, enum: ['Admission', 'Academy', 'Both', ''] }
}, { _id: false });

const postFieldDaySchema = new mongoose.Schema({
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: { type: Date, required: true },
    representativeName: { type: String, required: true },
    leaveToday: { type: Boolean, required: true },
    todaysLocation: { type: String, trim: true },
    workMode: {
        type: String,
        enum: ['On field', 'Work from home', 'Other'],
        required: true
    },
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
    keyFocusTomorrow: { type: String, trim: true }
}, { timestamps: true });

postFieldDaySchema.index({ submittedBy: 1, date: -1 });

module.exports = mongoose.model('PostFieldDay', postFieldDaySchema);

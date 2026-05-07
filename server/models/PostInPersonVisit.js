const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const postInPersonVisitSchema = new mongoose.Schema({
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Meeting basics
    date: { type: Date },
    bdmName: { type: String, trim: true },
    bdmNames: [{ type: String, trim: true }],
    spocName: { type: String, trim: true },
    numPromoters: { type: Number, min: 0, default: 0 },
    promoterInvolvement: { type: String, trim: true },
    promoterInvolvementList: [{ type: String, trim: true }],
    companyName: { type: String, trim: true },
    partnershipType: { type: String, trim: true },
    partnershipTypeList: [{ type: String, trim: true }],
    decisionMakerAvailable: { type: String, trim: true },
    decisionMakerAvailableList: [{ type: String, trim: true }],
    meetingPlanned: { type: String, trim: true },
    meetingPlannedList: [{ type: String, trim: true }],
    meetingDuration: { type: Number, min: 0, default: 0 },

    // Contact & links
    gmbLink: { type: String, trim: true },
    websiteLink: { type: String, trim: true },
    ownerName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phoneNumber: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    otherPeopleDesignation: { type: String, trim: true },
    closureProbability: { type: String, trim: true },
    closureProbabilityList: [{ type: String, trim: true }],

    // Business profile
    numBranches: { type: Number, min: 0, default: 0 },
    interestedInAdmissions: { type: String, trim: true },
    interestedInAdmissionsList: [{ type: String, trim: true }],
    teamSize: { type: Number, min: 0, default: 0 },
    officeSize: { type: String, trim: true },
    teamDistribution: { type: String, trim: true },
    admissionPotential: { type: String, trim: true },
    admissionPotentialList: [{ type: String, trim: true }],
    businessModel: [{ type: String, trim: true }],
    academyCoursesTaught: [{ type: String, trim: true }],
    prepInquiryHandling: { type: String, trim: true },
    teachingFormat: { type: String, trim: true },
    teachingFormatList: [{ type: String, trim: true }],
    premises: { type: String, trim: true },
    premisesList: [{ type: String, trim: true }],
    primaryBusinessStudyAbroad: { type: String, trim: true },
    primaryBusinessStudyAbroadList: [{ type: String, trim: true }],

    // Discussion
    countriesPromoted: [{ type: String, trim: true }],
    countriesPriorityRanking: { type: String, trim: true },
    last3YearsVolume: { type: String, trim: true },
    offeringsDiscussed: { type: String, trim: true },
    finalInterest: { type: String, trim: true },

    // Marketing
    marketingStrategyRanking: [{ type: String, trim: true }],
    marketingStrategyExplanation: { type: String, trim: true },
    digitalMarketingBudget: { type: Number, min: 0, default: 0 },
    offlineMarketingBudget: { type: Number, min: 0, default: 0 },
    avgCostPerLead: { type: Number, min: 0, default: 0 },
    conversionRatio: { type: String, trim: true },
    leadMonitoringPractices: { type: String, trim: true },
    marketingMaterialsQuality: { type: String, trim: true },
    websiteDigitalManagement: { type: String, trim: true },

    // Issues & follow-up
    biggestIssueFaced: { type: String, trim: true },
    otherIssuesFaced: [{ type: String, trim: true }],
    top5Issues: { type: String, trim: true },
    nextStepsMOM: { type: String, trim: true },
    nextFollowUpDate: { type: Date },

    comments: [commentSchema]
}, { timestamps: true });

postInPersonVisitSchema.index({ submittedBy: 1, createdAt: -1 });

module.exports = mongoose.model('PostInPersonVisit', postInPersonVisitSchema);

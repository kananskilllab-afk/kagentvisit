const mongoose = require('mongoose');

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const adminNoteSchema = new mongoose.Schema({
    note:      { type: String, required: true },
    stepIndex: { type: Number },
    stepName:  { type: String },
    addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt:   { type: Date, default: Date.now }
}, { _id: true });

const editHistorySchema = new mongoose.Schema({
    editedAt:        { type: Date, default: Date.now },
    editedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changesSummary:  { type: String }
}, { _id: true });

// ─── Main Schema ─────────────────────────────────────────────────────────────

const visitSchema = new mongoose.Schema({

    // ── Core ──────────────────────────────────────────────────────────────────
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'reviewed', 'action_required', 'closed'],
        default: 'draft',
        index: true
    },
    formVersion: { type: String },
    formType: {
        type: String,
        enum: ['generic', 'home_visit'],
        default: 'generic',
        index: true
    },

    // ══════════════════════════════════════════════════════════════════════════
    // B2B (generic) SECTIONS
    // ══════════════════════════════════════════════════════════════════════════

    // Step 1 – Visit Meta
    meta: {
        companyName:  { type: String, index: true },
        agentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', index: true },
        email:        { type: String },
        meetingStart: { type: Date },
        meetingEnd:   { type: Date },
        rmName:       { type: String },
        bdmName:      { type: String, index: true }
    },

    // Step 2 – Agency Profile
    agencyProfile: {
        address:           { type: String },
        nearestLandmark:   { type: String },
        pinCode:           { type: String, index: true },
        contactNumber:     { type: String },
        emailId:           { type: String },
        website:           { type: String },
        gmbLink:           { type: String },
        establishmentYear: { type: Number },
        businessModel:     [{ type: String }],
        officeArea:        { type: Number },
        infraRating:       { type: Number, min: 1, max: 5 },
        hasComputerLab:    { type: Boolean, default: false },
        numComputers:      { type: Number },
        googleReviews:     { type: Number }
    },

    // Step 3 – Promoter & Team
    promoterTeam: {
        name:             { type: String },
        designation:      { type: String },
        mobileNumber:     { type: String },
        emailId:          { type: String },
        totalStaff:       { type: Number },
        coachingTeamSize: { type: Number, default: 0 },
        countryTeamSize:  { type: Number, default: 0 },
        countriesPromoted: [{ type: String }],
        coachingPromoted:  [{ type: String }],
        vas:               [{ type: String }]
    },

    // Step 4 – Marketing & Ops
    marketingOps: {
        marketingActivities: { type: String },
        avgDailyWalkins: { type: Number, default: 0 },
        walkinRatio:     { type: String },
        useBrochures:    { type: Boolean, default: false },
        totalVisaYear:   { type: Number, default: 0 },
        totalCoachingYear: { type: Number, default: 0 },
        officeMediaLink: { type: String },
        totalBranches:   { type: Number, default: 1 }
    },

    // Step 5 – Kanan Status
    kananSpecific: {
        prepcomAcademy: { type: String },
        onboardingDate: { type: Date },
        isAppcom:       { type: Boolean, default: false },
        appcomOnboardingDate: { type: Date }
    },

    // Step 6 – Enquiry Stats
    enquiryStats: {
        avgAdmissions: { type: Number, default: 0 },
        avgCoaching:   { type: Number, default: 0 },
        avgCanada:     { type: Number, default: 0 },
        avgIELTS:      { type: Number, default: 0 }
    },

    // Step 7 – Partnership
    partnership: {
        workingCountries: [{ type: String }],
        onshoreReferral:  { type: Boolean, default: false },
        feedback:         { type: String }
    },

    // Step 8 – Student Counts
    studentCounts: {
        canada: { type: Number, default: 0 },
        usa:    { type: Number, default: 0 },
        uk:     { type: Number, default: 0 }
    },

    // Step 9 – Kanan Tools
    kananTools: {
        useAcademyPortal:    { type: Boolean, default: false },
        portalCourses:       [{ type: String }],
        useBooks:            { type: Boolean, default: false },
        bookCourses:         [{ type: String }],
        useClassroomContent: { type: Boolean, default: false },
        trainerRating:       { type: Number },
        counsellorRating:    { type: Number }
    },

    // Step 10 – Tech & Budget
    opsTech: {
        techPlatforms:   { type: String },
        techWillingness: { type: Number }
    },
    budget: {
        marketing2026: { type: Number, default: 0 },
        coaching2026:  { type: Number, default: 0 }
    },
    competency: {
        pricingRating: { type: Number }
    },
    support: {
        biggestChallenge:   { type: String },
        interestedServices: [{ type: String }],
        needTraining:       { type: Boolean, default: false },
        needMarketing:      { type: Boolean, default: false },
        needTech:           { type: Boolean, default: false },
        needPartners:       { type: Boolean, default: false },
        needVAS:            { type: Boolean, default: false },
        painPoints:         { type: String },
        solutions:          { type: String }
    },

    // Step 11 – Summary
    postVisit: {
        actionPoints: { type: String },
        remarks:      { type: String }
    },

    // ══════════════════════════════════════════════════════════════════════════
    // B2C (home_visit) SECTIONS
    // ══════════════════════════════════════════════════════════════════════════

    visitInfo: {
        visitDate:   { type: Date },
        officer:     { type: String },
        teamSize:    { type: String },
        teamMembers: [{ type: String }]
    },

    studentInfo: {
        crmId: { type: String, index: true },
        name:  { type: String },
        email: { type: String }
    },

    contactDetails: {
        indiaNo:   { type: String },
        canadaNo:  { type: String },
        parentsNo: { type: String }
    },

    location: {
        address: { type: String },
        city:    { type: String, index: true },
        pinCode: { type: String },
        state:   { type: String },
        coordinates: {
            lat: { type: Number },
            lng: { type: Number }
        }
    },

    academic: {
        college: { type: String }
    },

    checklist: {
        waGroup: { type: Boolean, default: false },
        waGroupName: { type: String },
        momDone: { type: Boolean, default: false }
    },

    outcome: {
        status:  { type: String },
        remarks: { type: String },
        photo:   { type: String }
    },

    gpsLocation: { type: String },
    gpsCoordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },

    adminNotes:  [adminNoteSchema],
    editHistory: [editHistorySchema],

    // Locking & Unlocking (B2B visit 24h rule)
    isAdminUnlocked:   { type: Boolean, default: false },
    unlockRequestSent: { type: Boolean, default: false }

}, {
    timestamps: true
});

visitSchema.index({ createdAt: -1 });
visitSchema.index({ formType: 1, status: 1 });
visitSchema.index({ submittedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Visit', visitSchema);

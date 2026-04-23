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

const followUpMeetingSchema = new mongoose.Schema({
    date:         { type: Date, required: true },
    meetingStart: { type: Date },
    meetingEnd:   { type: Date },
    notes:        { type: String, required: true },
    keyOutcomes:  { type: String },
    addedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt:      { type: Date, default: Date.now }
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
        rmName:       { type: mongoose.Schema.Types.Mixed },
        bdmName:      { type: mongoose.Schema.Types.Mixed, index: true }
    },

    // Step 2 – Agency Profile
    agencyProfile: {
        address:           { type: String },
        nearestLandmark:   { type: String },
        pinCode:           { type: String, index: true },
        contactNumber:     { type: mongoose.Schema.Types.Mixed },
        emailId:           { type: String },
        website:           { type: String },
        gmbLink:           { type: String },
        establishmentYear: { type: Number },
        businessModel:     [{ type: String }],
        otherBusinessModel: { type: String },
        officeAreaType:    { type: String },
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
        coachingTeamSize: { type: Number },
        countryTeamSize:  { type: Number },
        countriesPromoted: [{ type: String }],
        otherCountriesPromoted: { type: String },
        coachingPromoted:  [{ type: String }],
        otherCoachingPromoted: { type: String },
        vas:               [{ type: String }],
        otherVas:          { type: String }
    },

    // Step 4 – Marketing & Ops
    marketingOps: {
        marketingActivities: { type: String },
        avgDailyWalkins: { type: Number },
        walkinRatio:     { type: String },
        useBrochures:    { type: Boolean, default: false },
        totalVisaYear:   { type: Number },
        totalCoachingYear: { type: Number },
        officeMediaLink: { type: String },
        totalBranches:   { type: Number }
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
        avgAdmissions: { type: Number },
        avgCoaching:   { type: Number },
        avgCanada:     { type: Number },
        avgIELTS:      { type: Number }
    },

    // Step 7 – Partnership
    partnership: {
        workingCountries: [{ type: String }],
        otherWorkingCountries: { type: String },
        onshoreReferral:  { type: Boolean, default: false },
        feedback:         { type: String }
    },

    // Step 8 – Student Counts
    studentCounts: {
        canada: { type: Number },
        usa:    { type: Number },
        uk:     { type: Number }
    },

    // Step 9 – Kanan Tools
    kananTools: {
        useAcademyPortal:    { type: Boolean, default: false },
        portalCourses:       [{ type: String }],
        academyPortalOther:  { type: String },
        useBooks:            { type: Boolean, default: false },
        bookCourses:         [{ type: String }],
        booksOther:          { type: String },
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
        marketing2026: { type: Number },
        coaching2026:  { type: Number }
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
        painPoints:         { type: mongoose.Schema.Types.Mixed },
        solutions:          { type: mongoose.Schema.Types.Mixed }
    },

    // Post In-Person Visit Assessment
    postInPerson: {
        spocName:                    { type: String },
        ownerName:                   { type: String },
        whatsappNumber:              { type: String },
        numPromoters:                { type: Number },
        promoterInvolvement:         { type: String },
        partnershipType:             { type: String },
        decisionMakerAvailable:      { type: String },
        meetingPlanned:              { type: String },
        meetingDuration:             { type: Number },
        otherPeopleDesignation:      { type: String },
        closureProbability:          { type: String },
        interestedInAdmissions:      { type: String },
        officeSize:                  { type: String },
        teamDistribution:            { type: String },
        admissionPotential:          { type: String },
        academyCoursesTaught:        [{ type: String }],
        prepInquiryHandling:         { type: String },
        teachingFormat:              { type: String },
        premises:                    { type: String },
        primaryBusinessStudyAbroad:  { type: String },
        countriesPriorityRanking:    { type: String },
        last3YearsVolume:            { type: String },
        offeringsDiscussed:          { type: String },
        finalInterest:               { type: String },
        marketingStrategyRanking:    { type: String },
        marketingStrategyExplanation:{ type: String },
        digitalMarketingBudget:      { type: Number },
        offlineMarketingBudget:      { type: Number },
        avgCostPerLead:              { type: Number },
        conversionRatio:             { type: String },
        leadMonitoringPractices:     { type: String },
        marketingMaterialsQuality:   { type: String },
        websiteDigitalManagement:    { type: String },
        biggestIssueFaced:           { type: String },
        otherIssuesFaced:            [{ type: String }],
        top5Issues:                  { type: String },
        nextStepsMOM:                { type: String },
        nextFollowUpDate:            { type: Date }
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
        teamMembers: [{ type: String }],
        revisits: [{
            date: { type: Date, default: Date.now },
            officer: String,
            remarks: String
        }]
    },

    studentInfo: {
        crmId:          { type: String, index: true },
        name:           { type: String },
        email:          { type: String },
        phoneNumber:    { type: String },
        program:        { type: String },
        intake:         { type: String },
        qualification:  { type: String },
        testScore:      { type: String },
        interest:       [{ type: String }],
        classification: { type: String, enum: ['Onshore', 'Offshore'] },
        leadSource:     { type: String, enum: ['Band Data', 'Non-Band Data', 'Onshore Data', 'Reference Case'] },
        inquiryTypes:   [{ type: String }]
    },

    contactDetails: {
        indiaNo:   { type: String },
        canadaNo:  { type: String },
        parentsNo: { type: String }
    },

    location: {
        address:         { type: String },
        nearestLandmark: { type: String },
        city:            { type: String, index: true },
        pinCode:         { type: String },
        state:           { type: String },
        coordinates: {
            lat: { type: Number },
            lng: { type: Number }
        }
    },

    academic: {
        college: { type: String }
    },

    checklist: {
        waGroup:      { type: Boolean, default: false },
        waGroupName:  { type: String },
        momDone:      { type: Boolean, default: false },
        parentsMet:   { type: Boolean, default: false },
        docsCollected:{ type: Boolean, default: false },
        appLogged:    { type: Boolean, default: false }
    },

    outcome: {
        status:  { type: String },
        remarks: { type: String },
        remarksLog: [{
            text: String,
            date: { type: Date, default: Date.now },
            author: String
        }],
        photo:   { type: String }
    },

    gpsLocation: { type: String },
    gpsCoordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },

    adminNotes:  [adminNoteSchema],
    editHistory: [editHistorySchema],
    followUpMeetings: [followUpMeetingSchema],

    aiInsights: {
        summary: { type: String },
        bulletPoints: [{ type: String }],
        suggestions: { type: String },
        generatedAt: { type: Date }
    },
    adminAuditEval: {
        status:      { type: String, enum: ['successful', 'needs_improvement', 'failed'] },
        score:       { type: Number, min: 1, max: 10 },
        strengths:   [{ type: String }],
        weaknesses:  [{ type: String }],
        reasoning:   { type: String },
        evaluatedAt: { type: Date }
    },

    // Submission timestamp (lock timer starts from here, NOT createdAt)
    submittedAt: { type: Date, default: null },

    // Locking & Unlocking (24h rule from submission, NOT creation)
    isAdminUnlocked:   { type: Boolean, default: false },
    unlockRequestSent: { type: Boolean, default: false }

}, {
    timestamps: true
});

visitSchema.index({ createdAt: -1 });
visitSchema.index({ formType: 1, status: 1 });
visitSchema.index({ submittedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Visit', visitSchema);

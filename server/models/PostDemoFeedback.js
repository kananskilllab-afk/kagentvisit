const mongoose = require('mongoose');

const postDemoFeedbackSchema = new mongoose.Schema({
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Demo Info
    demoBookedBy:      { type: String, trim: true },
    demoConductedBy:   { type: String, trim: true },
    demoDate:          { type: Date },
    customerEmail:     { type: String, trim: true, lowercase: true },
    mediumOfMeeting:   { type: String, enum: ['In person', 'Online', ''] },

    // Account Info
    accountBusinessName: { type: String, trim: true },
    meetingType:         { type: String },
    meetingTypeOther:    { type: String, trim: true },
    accountType:         { type: String },
    demoType:            { type: String },
    alreadyOnboarded:    [{ type: String }],
    alreadyOnboardedOther: { type: String, trim: true },
    leadSource:          { type: String },
    leadSourceOther:     { type: String, trim: true },

    // Contact Details
    primaryContactName:        { type: String, trim: true },
    primaryContactDesignation: { type: String, trim: true },
    contactNumber:             { type: String, trim: true },
    city:                      { type: String, trim: true },
    state:                     { type: String, trim: true },

    // Business Profile
    natureOfBusiness:      { type: String },
    natureOfBusinessOther: { type: String, trim: true },
    demoFocus:             { type: String },
    demoFocusOther:        { type: String, trim: true },

    // Demo Outcome
    overallInterestLevel:   { type: String, enum: ['High', 'Medium', 'Low', ''] },
    productsDiscussed:      [{ type: String }],
    productsDiscussedOther: { type: String, trim: true },
    interestedIn:           [{ type: String }],
    interestedInOther:      { type: String, trim: true },
    probabilityOfClosure:   { type: String },
    expectedDealSize:       { type: Number },

    // Business Assessment
    hasAcademy:            { type: String },
    premiseStatus:         { type: String },
    classroomCapacity:     { type: String },
    hasCounsellingCabins:  { type: String, enum: ['Yes', 'No', ''] },
    studyAbroadStatus:     { type: String },
    countriesWorkWith:     [{ type: String }],
    studentsAbroadPerYear: { type: String },
    offersTestPrep:        { type: String },
    currentTestPrepFocus:  [{ type: String }],
    currentTestPrepFocusOther: { type: String, trim: true },
    hasLMS:                   { type: String },
    comfortableSellingOnline: { type: String },
    primaryLeadSources:       [{ type: String }],

    // Closure Planning
    budgetReadiness:  { type: String },
    goLiveTimeline:   { type: String },
    keyConcerns:      [{ type: String }],

    // Next Steps
    nextActionPlanned:     { type: String },
    meetingRecordingLink:  { type: String, trim: true },
    nextFollowUpDate:      { type: Date },
    expectedClosureDate:   { type: Date },
    additionalNotes:       { type: String, trim: true }

}, { timestamps: true });

postDemoFeedbackSchema.index({ submittedBy: 1, demoDate: -1 });

module.exports = mongoose.model('PostDemoFeedback', postDemoFeedbackSchema);

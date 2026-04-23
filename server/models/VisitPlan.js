const mongoose = require('mongoose');

const visitPlanSchema = new mongoose.Schema({
    owner: {
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
    planType: {
        type: String,
        enum: ['single', 'multi_same_city'],
        default: 'single',
        required: true
    },
    // Destination (shared by all child schedules)
    city:    { type: String, trim: true, required: true, index: true },
    state:   { type: String, trim: true },
    pinCode: { type: String, trim: true },
    cityTier: {
        type: String,
        enum: ['tier_1', 'tier_2', 'tier_3', 'na'],
        default: 'na'
    },
    // Agents from the Manage Agent directory
    agents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent'
    }],
    // Free-text company / agent names not yet in the system
    customAgentNames: [{
        type: String,
        trim: true
    }],
    plannedStartAt: { type: Date, required: true, index: true },
    plannedEndAt:   { type: Date, required: true },
    completedAt:    { type: Date },
    purpose: { type: String, trim: true },
    notes:   { type: String, trim: true },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'closed'],
        default: 'draft',
        index: true
    },
    // Denormalized from owner role at creation for audit snapshot
    ownerRoleSnapshot: {
        type: String
    },
    timezone: { type: String, default: 'Asia/Kolkata' }
}, {
    timestamps: true
});

visitPlanSchema.index({ owner: 1, plannedStartAt: -1 });
visitPlanSchema.index({ status: 1, plannedEndAt: 1 });
visitPlanSchema.index({ city: 1, plannedStartAt: -1 });

// Validation is handled in the controller to avoid Mongoose hook next() conflicts

module.exports = mongoose.model('VisitPlan', visitPlanSchema);

const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: [
            'flight', 'train', 'bus', 'cab', 'metro',
            'hotel', 'food', 'agent_entertainment',
            'internet_phone', 'parking_toll', 'visa_passport',
            'office_supplies', 'other'
        ]
    },
    cityTier: {
        type: String,
        enum: ['tier_1', 'tier_2', 'tier_3', 'na', 'any'],
        default: 'any'
    },
    maxPerDay:   { type: Number, default: null },  // null = uncapped (as per bill)
    maxPerVisit: { type: Number, default: null },
    travelClass: { type: String, trim: true },

    // New-policy fields
    requiresReceipt:      { type: Boolean, default: true },
    requiresPreBooking:   { type: Boolean, default: false },
    allowedBookingModes: [{
        type: String,
        enum: ['ola', 'uber', 'app_other', 'public_transport', 'direct', 'other']
    }],
    requiresClientPhoto:  { type: Boolean, default: false },
    photoBackgroundCheck: {
        type: String,
        enum: ['manual', 'ai', 'none'],
        default: 'manual'
    },
    requiresReceiptAbove: { type: Number, default: null },
    notes: { type: String, trim: true }
}, { _id: false });

const policySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    policyKind: {
        type: String,
        enum: ['standard', 'leadership'],
        required: true,
        index: true
    },
    description: { type: String, trim: true },
    effectiveFrom: { type: Date, required: true, index: true },
    rules: [ruleSchema],
    // Scheduling/workflow requirements (policy-level, not per-category)
    globalRequirements: {
        clientPhotoPerSchedule: { type: Boolean, default: true },
        photoBackgroundMustShowBusinessIdentity: { type: Boolean, default: true },
        receiptRequiredForAllExpenses: { type: Boolean, default: true },
        reimbursementWindowDays: { type: Number, default: 7 }
    },
    isActive: { type: Boolean, default: false, index: true },
    activatedAt: { type: Date },
    activatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

policySchema.index({ policyKind: 1, version: 1 }, { unique: true });
policySchema.index({ policyKind: 1, isActive: 1 });

module.exports = mongoose.model('Policy', policySchema);

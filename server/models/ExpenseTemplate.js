const mongoose = require('mongoose');

const expenseTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
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
    defaultAmount: { type: Number, default: 0, min: 0 },
    currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'GBP', 'CAD', 'AUD', 'EUR']
    },
    description: { type: String, trim: true },
    allowedPlanTypes: [{
        type: String,
        enum: ['single', 'multi_same_city']
    }],
    autoSelectForPlanType: {
        type: String,
        enum: ['single', 'multi_same_city', null],
        default: null
    },
    cityTierOverride: {
        type: String,
        enum: ['tier_1', 'tier_2', 'tier_3', 'na', null],
        default: null
    },
    // Locks the booking mode when creating expense from template (e.g., Ola/Uber for cabs)
    lockedBookingModes: [{
        type: String,
        enum: ['ola', 'uber', 'app_other', 'public_transport', 'direct', 'other']
    }],
    isActive: { type: Boolean, default: true },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

expenseTemplateSchema.index({ isActive: 1, category: 1 });

module.exports = mongoose.model('ExpenseTemplate', expenseTemplateSchema);

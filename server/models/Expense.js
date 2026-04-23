const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
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
    otherCategory: {
        type: String,
        trim: true
        // Required only when category === 'other'
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'GBP', 'CAD', 'AUD', 'EUR']
    },
    description: {
        type: String,
        trim: true
    },
    expenseDate: {
        type: Date,
        required: true
    },
    travelFrom: {
        city: { type: String, trim: true },
        state: { type: String, trim: true }
    },
    travelTo: {
        city: { type: String, trim: true },
        state: { type: String, trim: true }
    },
    receiptUrl: {
        type: String // Cloudinary or local upload URL
    },
    vendor: {
        type: String,
        trim: true // e.g., airline name, hotel name, etc.
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'upi', 'card', 'company_card', 'other'],
        default: 'cash'
    },
    // Policy-relevant fields for AI audit
    cityTier: {
        type: String,
        enum: ['tier_1', 'tier_2', 'tier_3', 'na'],
        default: 'na'
    },
    travelClass: {
        type: String,
        trim: true // e.g., '3AC', '2nd Class', 'Volvo', 'Sleeper'
    },
    bookingMode: {
        type: String,
        enum: ['ola', 'uber', 'app_other', 'public_transport', 'direct', 'other'],
        default: 'other'
    },
    visitRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Visit' // Optional link to a B2B visit
    },
    visitPlanRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VisitPlan',
        index: true
    },
    visitScheduleRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VisitSchedule'
    },
    templateRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExpenseTemplate',
        default: null
    },
    claimRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExpenseClaim' // Set when added to a claim
    },
    // Marks this expense as over the advance balance (routed to reimbursement)
    overBudget: { type: Boolean, default: false },
    // Additional upload refs for multi-document expenses (receipt + boarding pass, etc.)
    uploadRefs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Upload'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

expenseSchema.index({ createdBy: 1, expenseDate: -1 });
expenseSchema.index({ claimRef: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ visitPlanRef: 1 });

module.exports = mongoose.model('Expense', expenseSchema);

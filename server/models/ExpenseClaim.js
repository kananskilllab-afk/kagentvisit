const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
    status: {
        type: String,
        required: true,
        enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'needs_justification', 'paid']
    },
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    comment: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const expenseClaimSchema = new mongoose.Schema({
    claimNumber: {
        type: String,
        unique: true
        // Auto-generated: EXP-YYYYMM-XXXX
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    expenses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense'
    }],
    totalAmount: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'needs_justification', 'paid'],
        default: 'draft'
    },
    // Travel context
    travelPurpose: {
        type: String,
        trim: true // e.g., "B2B agent visit to Mumbai"
    },
    travelFrom: {
        city: { type: String, trim: true },
        state: { type: String, trim: true }
    },
    travelTo: {
        city: { type: String, trim: true },
        state: { type: String, trim: true }
    },
    travelStartDate: { type: Date },
    travelEndDate: { type: Date },

    // Location from where claim was filed
    claimLocation: {
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        coordinates: {
            lat: { type: Number },
            lng: { type: Number }
        }
    },

    // Approval chain
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submittedAt: { type: Date },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: { type: Date },
    approvedAmount: { type: Number },

    // Justification flow
    justificationNote: { type: String, trim: true },

    // Status history timeline
    statusHistory: [statusHistorySchema],

    // AI Policy Audit results
    aiAudit: {
        complianceScore: { type: Number, min: 0, max: 100 },
        overallStatus: {
            type: String,
            enum: ['compliant', 'warning', 'violation']
        },
        flags: [{
            expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
            type: { type: String, trim: true },
            severity: { type: String, enum: ['info', 'warning', 'critical'] },
            message: { type: String, trim: true },
            policyRef: { type: String, trim: true }
        }],
        recommendations: { type: String, trim: true },
        summary: { type: String, trim: true },
        auditedAt: { type: Date },
        auditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // Visit reference (optional legacy)
    visitRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Visit'
    },
    // NEW: plan + claim type + policy snapshot
    claimType: {
        type: String,
        enum: ['advance', 'reimbursement'],
        required: true,
        default: 'reimbursement',
        index: true
    },
    visitPlanRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VisitPlan',
        index: true
    },
    policyKindApplied: {
        type: String,
        enum: ['standard', 'leadership']
    },
    policyVersionSnapshot: { type: String },
    fxRates: {
        type: Map,
        of: Number,
        default: {}
    }
}, {
    timestamps: true
});

expenseClaimSchema.index({ submittedBy: 1, createdAt: -1 });
expenseClaimSchema.index({ status: 1 });
expenseClaimSchema.index({ claimNumber: 1 });
expenseClaimSchema.index({ visitPlanRef: 1, claimType: 1 });

// Auto-generate claim number before saving
expenseClaimSchema.pre('save', async function () {
    if (this.isNew && !this.claimNumber) {
        const now = new Date();
        const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const count = await mongoose.model('ExpenseClaim').countDocuments({
            createdAt: {
                $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
            }
        });
        this.claimNumber = `EXP-${ym}-${String(count + 1).padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('ExpenseClaim', expenseClaimSchema);

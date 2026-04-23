const mongoose = require('mongoose');

const visitPlanBalanceSchema = new mongoose.Schema({
    visitPlanRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VisitPlan',
        required: true,
        unique: true,
        index: true
    },
    advanceClaimRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExpenseClaim'
    },
    grantedAmount: { type: Number, required: true, min: 0 },
    spentAmount:   { type: Number, default: 0, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    fxRates: {
        type: Map,
        of: Number,
        default: {}
    },
    lockedAt: { type: Date }
}, {
    timestamps: true,
    optimisticConcurrency: true
});

visitPlanBalanceSchema.virtual('remainingAmount').get(function () {
    return Math.max(0, (this.grantedAmount || 0) - (this.spentAmount || 0));
});

visitPlanBalanceSchema.set('toJSON', { virtuals: true });
visitPlanBalanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('VisitPlanBalance', visitPlanBalanceSchema);

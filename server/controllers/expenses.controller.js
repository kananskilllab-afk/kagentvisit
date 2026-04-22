const Expense = require('../models/Expense');
const ExpenseClaim = require('../models/ExpenseClaim');
const User = require('../models/User');
const { notifyClaimSubmitted, notifyClaimStatusChange } = require('../services/notification.service');
const { auditExpenseClaim } = require('../services/ai.service');

// ─── EXPENSE CRUD ────────────────────────────────────────────────

// @desc    Get expenses (own for users, all for accounts/admin/superadmin)
exports.getExpenses = async (req, res) => {
    try {
        const query = {};
        const { role } = req.user;

        // Users only see their own expenses
        if (role === 'user' || role === 'home_visit') {
            query.createdBy = req.user._id;
        } else if (role === 'admin') {
            // Admins see expenses from their assigned employees + their own
            const admin = await User.findById(req.user._id).select('assignedEmployees');
            const employeeIds = admin?.assignedEmployees || [];
            query.createdBy = { $in: [req.user._id, ...employeeIds] };
        }
        // accounts + superadmin see all

        // Filters
        if (req.query.category) query.category = req.query.category;
        if (req.query.startDate || req.query.endDate) {
            query.expenseDate = {};
            if (req.query.startDate) query.expenseDate.$gte = new Date(req.query.startDate);
            if (req.query.endDate) query.expenseDate.$lte = new Date(req.query.endDate);
        }
        if (req.query.claimRef) query.claimRef = req.query.claimRef;
        if (req.query.unclaimed === 'true') query.claimRef = { $exists: false };
        // Enhanced filters
        if (req.query.minAmount || req.query.maxAmount) {
            query.amount = {};
            if (req.query.minAmount) query.amount.$gte = parseFloat(req.query.minAmount);
            if (req.query.maxAmount) query.amount.$lte = parseFloat(req.query.maxAmount);
        }
        if (req.query.paymentMethod) query.paymentMethod = req.query.paymentMethod;
        if (req.query.employee) query.createdBy = req.query.employee;
        if (req.query.cityTier) query.cityTier = req.query.cityTier;

        const expenses = await Expense.find(query)
            .populate('createdBy', 'name employeeId email')
            .populate('claimRef', 'claimNumber status')
            .sort({ expenseDate: -1 });

        res.json({ success: true, data: expenses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create expense
exports.createExpense = async (req, res) => {
    try {
        const expense = await Expense.create({
            ...req.body,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: expense });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update expense (only owner, and only if not in a submitted claim)
exports.updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        // Only owner can edit
        if (expense.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this expense' });
        }

        // Can't edit if it's part of a submitted/approved claim
        if (expense.claimRef) {
            const claim = await ExpenseClaim.findById(expense.claimRef);
            if (claim && !['draft'].includes(claim.status)) {
                return res.status(400).json({ success: false, message: 'Cannot edit expense that is part of an active claim' });
            }
        }

        const updatableFields = [
            'category', 'otherCategory', 'amount', 'currency', 'description',
            'expenseDate', 'travelFrom', 'travelTo', 'receiptUrl', 'vendor',
            'paymentMethod', 'visitRef', 'cityTier', 'travelClass', 'bookingMode'
        ];
        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) expense[field] = req.body[field];
        });

        await expense.save();
        res.json({ success: true, data: expense });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete expense (only owner, and only if unclaimed or draft claim)
exports.deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        if (expense.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this expense' });
        }

        if (expense.claimRef) {
            const claim = await ExpenseClaim.findById(expense.claimRef);
            if (claim && !['draft'].includes(claim.status)) {
                return res.status(400).json({ success: false, message: 'Cannot delete expense that is part of an active claim' });
            }
            // Remove from claim's expenses array
            if (claim) {
                claim.expenses = claim.expenses.filter(e => e.toString() !== expense._id.toString());
                claim.totalAmount = Math.max(0, (claim.totalAmount || 0) - expense.amount);
                await claim.save();
            }
        }

        await expense.deleteOne();
        res.json({ success: true, message: 'Expense deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── EXPENSE CLAIMS ──────────────────────────────────────────────

// @desc    Get claims (own for users, all for accounts/admin/superadmin)
exports.getClaims = async (req, res) => {
    try {
        const query = {};
        const { role } = req.user;

        if (role === 'user' || role === 'home_visit') {
            query.submittedBy = req.user._id;
        } else if (role === 'admin') {
            const admin = await User.findById(req.user._id).select('assignedEmployees');
            const employeeIds = admin?.assignedEmployees || [];
            query.submittedBy = { $in: [req.user._id, ...employeeIds] };
        }
        // accounts + superadmin see all

        // Filters
        if (req.query.status) query.status = req.query.status;
        if (req.query.submittedBy) query.submittedBy = req.query.submittedBy;

        const claims = await ExpenseClaim.find(query)
            .populate('submittedBy', 'name employeeId email')
            .populate('reviewedBy', 'name employeeId')
            .populate('expenses')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: claims });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single claim by ID
exports.getClaimById = async (req, res) => {
    try {
        const claim = await ExpenseClaim.findById(req.params.id)
            .populate('submittedBy', 'name employeeId email')
            .populate('reviewedBy', 'name employeeId email')
            .populate({
                path: 'expenses',
                populate: { path: 'createdBy', select: 'name employeeId' }
            })
            .populate('statusHistory.changedBy', 'name employeeId');

        if (!claim) {
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }

        // Users can only see their own claims
        const { role } = req.user;
        if ((role === 'user' || role === 'home_visit') && claim.submittedBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, data: claim });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new expense claim (draft)
exports.createClaim = async (req, res) => {
    try {
        const { title, description, travelPurpose, travelFrom, travelTo, travelStartDate, travelEndDate, claimLocation, expenseIds } = req.body;

        // Validate that expenses belong to this user
        let expenses = [];
        let totalAmount = 0;
        if (expenseIds && expenseIds.length > 0) {
            expenses = await Expense.find({
                _id: { $in: expenseIds },
                createdBy: req.user._id,
                claimRef: { $exists: false }
            });

            if (expenses.length !== expenseIds.length) {
                return res.status(400).json({ success: false, message: 'Some expenses are invalid or already claimed' });
            }

            totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
        }

        const claim = await ExpenseClaim.create({
            title,
            description,
            travelPurpose,
            travelFrom,
            travelTo,
            travelStartDate,
            travelEndDate,
            claimLocation,
            expenses: expenses.map(e => e._id),
            totalAmount,
            submittedBy: req.user._id,
            statusHistory: [{
                status: 'draft',
                changedBy: req.user._id,
                comment: 'Claim created'
            }]
        });

        // Update expenses with claim reference
        if (expenses.length > 0) {
            await Expense.updateMany(
                { _id: { $in: expenses.map(e => e._id) } },
                { claimRef: claim._id }
            );
        }

        res.status(201).json({ success: true, data: claim });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update claim (draft only)
exports.updateClaim = async (req, res) => {
    try {
        const claim = await ExpenseClaim.findById(req.params.id);
        if (!claim) {
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }

        if (claim.submittedBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (claim.status !== 'draft' && claim.status !== 'needs_justification') {
            return res.status(400).json({ success: false, message: 'Can only edit draft or claims needing justification' });
        }

        const updatableFields = ['title', 'description', 'travelPurpose', 'travelFrom', 'travelTo', 'travelStartDate', 'travelEndDate', 'claimLocation', 'justificationNote'];
        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) claim[field] = req.body[field];
        });

        // Handle adding/removing expenses
        if (req.body.expenseIds) {
            // Unlink old expenses
            await Expense.updateMany(
                { claimRef: claim._id },
                { $unset: { claimRef: 1 } }
            );

            // Link new expenses
            const expenses = await Expense.find({
                _id: { $in: req.body.expenseIds },
                createdBy: req.user._id
            });
            claim.expenses = expenses.map(e => e._id);
            claim.totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

            await Expense.updateMany(
                { _id: { $in: expenses.map(e => e._id) } },
                { claimRef: claim._id }
            );
        }

        await claim.save();
        res.json({ success: true, data: claim });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Submit a claim for review
exports.submitClaim = async (req, res) => {
    try {
        const claim = await ExpenseClaim.findById(req.params.id)
            .populate('expenses');

        if (!claim) {
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }

        if (claim.submittedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (!['draft', 'needs_justification'].includes(claim.status)) {
            return res.status(400).json({ success: false, message: 'Claim already submitted' });
        }

        if (!claim.expenses || claim.expenses.length === 0) {
            return res.status(400).json({ success: false, message: 'Cannot submit claim with no expenses' });
        }

        // Recalculate total
        claim.totalAmount = claim.expenses.reduce((sum, e) => sum + e.amount, 0);
        claim.status = 'submitted';
        claim.submittedAt = new Date();
        claim.statusHistory.push({
            status: 'submitted',
            changedBy: req.user._id,
            comment: req.body.justificationNote || 'Claim submitted for review'
        });

        if (req.body.justificationNote) {
            claim.justificationNote = req.body.justificationNote;
        }

        await claim.save();

        // Send notifications to accounts and admin
        notifyClaimSubmitted(claim, req.user).catch(err =>
            console.error('[Notification Error]', err.message)
        );

        res.json({ success: true, data: claim });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update claim status (accounts + superadmin only — admin is read-only)
exports.updateClaimStatus = async (req, res) => {
    try {
        const { status, comment, approvedAmount } = req.body;

        const validStatuses = ['under_review', 'approved', 'rejected', 'needs_justification', 'paid'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const claim = await ExpenseClaim.findById(req.params.id);
        if (!claim) {
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }

        claim.status = status;
        claim.reviewedBy = req.user._id;
        claim.reviewedAt = new Date();
        if (approvedAmount !== undefined) claim.approvedAmount = approvedAmount;

        claim.statusHistory.push({
            status,
            changedBy: req.user._id,
            comment: comment || `Status changed to ${status}`
        });

        await claim.save();

        // Notify the claim submitter
        notifyClaimStatusChange(claim, status, req.user, comment).catch(err =>
            console.error('[Notification Error]', err.message)
        );

        res.json({ success: true, data: claim });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete claim (draft only, owner or superadmin)
exports.deleteClaim = async (req, res) => {
    try {
        const claim = await ExpenseClaim.findById(req.params.id);
        if (!claim) {
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }

        if (claim.submittedBy.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (claim.status !== 'draft') {
            return res.status(400).json({ success: false, message: 'Can only delete draft claims' });
        }

        // Unlink expenses
        await Expense.updateMany(
            { claimRef: claim._id },
            { $unset: { claimRef: 1 } }
        );

        await claim.deleteOne();
        res.json({ success: true, message: 'Claim deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get expense analytics/summary
exports.getExpenseSummary = async (req, res) => {
    try {
        const matchStage = {};
        const { role } = req.user;

        if (role === 'user' || role === 'home_visit') {
            matchStage.submittedBy = req.user._id;
        } else if (role === 'admin') {
            const admin = await User.findById(req.user._id).select('assignedEmployees');
            const employeeIds = (admin?.assignedEmployees || []).map(id => id);
            matchStage.submittedBy = { $in: [req.user._id, ...employeeIds] };
        }

        const [claimStats, categoryBreakdown, recentClaims] = await Promise.all([
            // Claim status counts
            ExpenseClaim.aggregate([
                { $match: matchStage },
                { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } }
            ]),
            // Category breakdown from expenses
            Expense.aggregate([
                { $match: role === 'user' || role === 'home_visit' ? { createdBy: req.user._id } : {} },
                { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' } } },
                { $sort: { total: -1 } }
            ]),
            // Recent claims
            ExpenseClaim.find(matchStage)
                .populate('submittedBy', 'name employeeId')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
        ]);

        res.json({
            success: true,
            data: { claimStats, categoryBreakdown, recentClaims }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    AI Policy Audit for a claim (admin/accounts/superadmin)
exports.auditClaim = async (req, res) => {
    try {
        const claim = await ExpenseClaim.findById(req.params.id)
            .populate('submittedBy', 'name employeeId email')
            .populate({
                path: 'expenses',
                populate: { path: 'createdBy', select: 'name employeeId' }
            });

        if (!claim) {
            return res.status(404).json({ success: false, message: 'Claim not found' });
        }

        // Call AI audit service
        const auditResult = await auditExpenseClaim(claim.toObject());

        // Save audit to claim
        claim.aiAudit = {
            ...auditResult,
            auditedAt: new Date(),
            auditedBy: req.user._id
        };
        await claim.save();

        res.json({ success: true, data: claim.aiAudit });
    } catch (error) {
        console.error('auditClaim error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get comprehensive expense analytics (admin/accounts/superadmin)
exports.getExpenseAnalytics = async (req, res) => {
    try {
        const expenseMatch = {};
        const claimMatch = {};
        const { role } = req.user;

        if (role === 'admin') {
            const admin = await User.findById(req.user._id).select('assignedEmployees');
            const employeeIds = admin?.assignedEmployees || [];
            expenseMatch.createdBy = { $in: [req.user._id, ...employeeIds] };
            claimMatch.submittedBy = { $in: [req.user._id, ...employeeIds] };
        }
        // accounts + superadmin see all

        // Date filters
        if (req.query.startDate || req.query.endDate) {
            const dateFilter = {};
            if (req.query.startDate) dateFilter.$gte = new Date(req.query.startDate);
            if (req.query.endDate) {
                const end = new Date(req.query.endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
            expenseMatch.expenseDate = dateFilter;
            claimMatch.createdAt = dateFilter;
        }

        const [categoryBreakdown, monthlyTrends, employeeSpending, claimStatusStats,
               cityTierBreakdown, paymentMethodStats, complianceStats, topExpenses] = await Promise.all([
            // 1. Spending by category
            Expense.aggregate([
                { $match: expenseMatch },
                { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' }, avg: { $avg: '$amount' } } },
                { $sort: { total: -1 } }
            ]),
            // 2. Monthly spending trends (last 12 months)
            Expense.aggregate([
                { $match: { ...expenseMatch, expenseDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 11)) } } },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$expenseDate' } },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ]),
            // 3. Spending by employee (top 15)
            Expense.aggregate([
                { $match: expenseMatch },
                { $group: { _id: '$createdBy', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } },
                { $limit: 15 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                { $unwind: '$user' },
                { $project: { name: '$user.name', employeeId: '$user.employeeId', total: 1, count: 1 } }
            ]),
            // 4. Claim status distribution
            ExpenseClaim.aggregate([
                { $match: claimMatch },
                { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } }
            ]),
            // 5. City tier breakdown
            Expense.aggregate([
                { $match: { ...expenseMatch, cityTier: { $ne: 'na' } } },
                { $group: { _id: '$cityTier', total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } } },
                { $sort: { _id: 1 } }
            ]),
            // 6. Payment method distribution
            Expense.aggregate([
                { $match: expenseMatch },
                { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ]),
            // 7. Compliance stats (claims with AI audit)
            ExpenseClaim.aggregate([
                { $match: { ...claimMatch, 'aiAudit.overallStatus': { $exists: true } } },
                { $group: { _id: '$aiAudit.overallStatus', count: { $sum: 1 }, avgScore: { $avg: '$aiAudit.complianceScore' } } }
            ]),
            // 8. Top individual expenses
            Expense.find(expenseMatch)
                .populate('createdBy', 'name employeeId')
                .sort({ amount: -1 })
                .limit(10)
                .lean()
        ]);

        // Aggregate totals
        const totalExpenses = categoryBreakdown.reduce((s, c) => s + c.total, 0);
        const totalExpenseCount = categoryBreakdown.reduce((s, c) => s + c.count, 0);
        const totalClaims = claimStatusStats.reduce((s, c) => s + c.count, 0);
        const totalClaimAmount = claimStatusStats.reduce((s, c) => s + c.totalAmount, 0);
        const pendingClaims = claimStatusStats
            .filter(s => ['submitted', 'under_review'].includes(s._id))
            .reduce((sum, s) => sum + s.count, 0);

        res.json({
            success: true,
            data: {
                overview: {
                    totalExpenses,
                    totalExpenseCount,
                    totalClaims,
                    totalClaimAmount,
                    pendingClaims,
                    avgExpenseAmount: totalExpenseCount > 0 ? Math.round(totalExpenses / totalExpenseCount) : 0
                },
                categoryBreakdown,
                monthlyTrends,
                employeeSpending,
                claimStatusStats,
                cityTierBreakdown,
                paymentMethodStats,
                complianceStats,
                topExpenses
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

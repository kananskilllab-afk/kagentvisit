const express = require('express');
const router = express.Router();
const {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getClaims,
    getClaimById,
    createClaim,
    updateClaim,
    submitClaim,
    updateClaimStatus,
    deleteClaim,
    getExpenseSummary,
    auditClaim,
    getExpenseAnalytics
} = require('../controllers/expenses.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

// ── Expense Analytics (admin/accounts/superadmin only) ──
router.get('/analytics', authorize('admin', 'accounts', 'superadmin'), getExpenseAnalytics);

// ── Expense Claims (MUST be before /:id to avoid route collision) ──
router.get('/claims/summary', getExpenseSummary);

router.route('/claims')
    .get(getClaims)
    .post(createClaim);

router.route('/claims/:id')
    .get(getClaimById)
    .put(updateClaim)
    .delete(deleteClaim);

router.post('/claims/:id/submit', submitClaim);
// Only accounts + superadmin can approve/reject. Admin has read-only access.
router.put('/claims/:id/status', authorize('accounts', 'superadmin'), updateClaimStatus);
// AI Policy Audit (admin/accounts/superadmin)
router.post('/claims/:id/audit', authorize('admin', 'accounts', 'superadmin'), auditClaim);

// ── Expense CRUD ──
router.route('/')
    .get(getExpenses)
    .post(createExpense);

router.route('/:id')
    .put(updateExpense)
    .delete(deleteExpense);

module.exports = router;

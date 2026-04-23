const ExpenseTemplate = require('../models/ExpenseTemplate');
const Expense = require('../models/Expense');
const AuditLog = require('../models/AuditLog');

// GET /api/expense-templates?planType=&active=
exports.listTemplates = async (req, res) => {
    try {
        const q = {};
        if (req.query.active !== 'false') q.isActive = true;
        if (req.query.planType) q.allowedPlanTypes = req.query.planType;
        if (req.query.category) q.category = req.query.category;
        const templates = await ExpenseTemplate.find(q).sort({ category: 1, name: 1 }).lean();
        res.json({ success: true, data: templates });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/expense-templates
exports.createTemplate = async (req, res) => {
    try {
        const t = await ExpenseTemplate.create({ ...req.body, createdBy: req.user._id });
        AuditLog.create({
            userId: req.user._id, action: 'CREATE_EXPENSE_TEMPLATE',
            targetId: t._id, targetModel: 'ExpenseTemplate'
        }).catch(() => {});
        res.status(201).json({ success: true, data: t });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// PUT /api/expense-templates/:id
exports.updateTemplate = async (req, res) => {
    try {
        const t = await ExpenseTemplate.findById(req.params.id);
        if (!t) return res.status(404).json({ success: false, message: 'Template not found' });
        const editable = ['name', 'category', 'defaultAmount', 'currency', 'description',
            'allowedPlanTypes', 'autoSelectForPlanType', 'cityTierOverride',
            'lockedBookingModes', 'isActive'];
        editable.forEach(f => { if (req.body[f] !== undefined) t[f] = req.body[f]; });
        await t.save();
        res.json({ success: true, data: t });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// DELETE /api/expense-templates/:id — soft by default
exports.deleteTemplate = async (req, res) => {
    try {
        const t = await ExpenseTemplate.findById(req.params.id);
        if (!t) return res.status(404).json({ success: false, message: 'Template not found' });

        const referenced = await Expense.exists({ templateRef: t._id });
        if (referenced) {
            t.isActive = false;
            await t.save();
            return res.json({ success: true, message: 'Template deactivated (still referenced by expenses)', data: t });
        }
        await t.deleteOne();
        res.json({ success: true, message: 'Template deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

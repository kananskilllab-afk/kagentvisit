const Policy = require('../models/Policy');
const ExpenseClaim = require('../models/ExpenseClaim');
const AuditLog = require('../models/AuditLog');

// GET /api/policies?kind=standard|leadership
exports.listPolicies = async (req, res) => {
    try {
        const q = {};
        if (req.query.kind) q.policyKind = req.query.kind;
        const policies = await Policy.find(q)
            .populate('activatedBy', 'name email')
            .populate('createdBy', 'name email')
            .sort({ policyKind: 1, effectiveFrom: -1 })
            .lean();
        res.json({ success: true, data: policies });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/policies/active?kind=standard
exports.getActive = async (req, res) => {
    try {
        const kind = req.query.kind || 'standard';
        const p = await Policy.findOne({ policyKind: kind, isActive: true }).lean();
        res.json({ success: true, data: p || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/policies/:id
exports.getPolicy = async (req, res) => {
    try {
        const p = await Policy.findById(req.params.id).lean();
        if (!p) return res.status(404).json({ success: false, message: 'Policy not found' });
        res.json({ success: true, data: p });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/policies (draft)
exports.createPolicy = async (req, res) => {
    try {
        const policy = await Policy.create({
            ...req.body,
            isActive: false,
            createdBy: req.user._id
        });
        AuditLog.create({
            userId: req.user._id, action: 'CREATE_POLICY',
            targetId: policy._id, targetModel: 'Policy',
            details: { name: policy.name, version: policy.version, kind: policy.policyKind }
        }).catch(() => {});
        res.status(201).json({ success: true, data: policy });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// PUT /api/policies/:id — only if not activated
exports.updatePolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);
        if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
        if (policy.isActive || policy.activatedAt) {
            return res.status(400).json({ success: false, message: 'Activated policies are immutable. Create a new version.' });
        }
        const editable = ['name', 'version', 'description', 'effectiveFrom', 'rules', 'globalRequirements'];
        editable.forEach(f => { if (req.body[f] !== undefined) policy[f] = req.body[f]; });
        await policy.save();
        res.json({ success: true, data: policy });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// POST /api/policies/:id/activate — deactivates current active of same kind
exports.activatePolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);
        if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

        const prev = await Policy.findOne({ policyKind: policy.policyKind, isActive: true });
        if (prev) {
            prev.isActive = false;
            prev.supersededBy = policy._id;
            await prev.save();
        }

        policy.isActive = true;
        policy.activatedAt = new Date();
        policy.activatedBy = req.user._id;
        await policy.save();

        AuditLog.create({
            userId: req.user._id, action: 'ACTIVATE_POLICY',
            targetId: policy._id, targetModel: 'Policy',
            details: { name: policy.name, version: policy.version, kind: policy.policyKind }
        }).catch(() => {});

        res.json({ success: true, data: policy });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// DELETE /api/policies/:id — drafts only
exports.deletePolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);
        if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
        if (policy.isActive || policy.activatedAt) {
            return res.status(400).json({ success: false, message: 'Cannot delete activated policies.' });
        }
        await policy.deleteOne();
        res.json({ success: true, message: 'Policy draft deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/policies/:id/usage
exports.policyUsage = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id).lean();
        if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
        const count = await ExpenseClaim.countDocuments({
            policyKindApplied: policy.policyKind,
            policyVersionSnapshot: policy.version
        });
        res.json({ success: true, data: { claims: count } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

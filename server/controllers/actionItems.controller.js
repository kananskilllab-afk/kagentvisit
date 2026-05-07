const mongoose = require('mongoose');
const Visit = require('../models/Visit');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { notifyActionItemAssigned } = require('../services/notification.service');

async function canMutateActionItem(user, visit) {
    if (!visit) return false;
    if (user.role === 'superadmin' || user.role === 'admin') return true;
    if (String(visit.submittedBy) === String(user._id)) return true;
    if (user.role === 'hod') {
        const me = await User.findById(user._id).select('assignedEmployees');
        const ids = (me?.assignedEmployees || []).map(String);
        return ids.includes(String(visit.submittedBy));
    }
    return false;
}

function auditActionItem(req, action, item, visitId, extra = {}) {
    AuditLog.create({
        userId: req.user._id,
        action,
        targetId: item?._id,
        targetModel: 'ActionItem',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { visitId, text: item?.text, ...extra }
    }).catch(err => console.error('[AuditLog]', err.message));
}

exports.getActionItems = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id)
            .select('actionItems')
            .populate('actionItems.assignee', 'name employeeId role')
            .populate('actionItems.createdBy', 'name employeeId')
            .populate('actionItems.history.by', 'name employeeId');
        if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
        return res.status(200).json({ success: true, data: visit.actionItems });
    } catch (err) {
        console.error('[ActionItems]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyOpenActionItems = async (req, res) => {
    try {
        const now = new Date();
        const isPrivileged = ['admin', 'superadmin'].includes(req.user.role);
        const match = {
            'actionItems.status': 'open',
            ...(isPrivileged ? {} : {
                $or: [
                    { submittedBy: req.user._id },
                    { forUser: req.user._id },
                    { 'actionItems.assignee': req.user._id }
                ]
            })
        };

        const visits = await Visit.find(match)
            .select('meta studentInfo submittedBy forUser actionItems createdAt')
            .populate('submittedBy', 'name employeeId')
            .populate('forUser', 'name employeeId')
            .populate('actionItems.assignee', 'name employeeId role')
            .sort({ createdAt: -1 })
            .limit(25);

        const items = visits.flatMap(visit => {
            const visitObj = visit.toObject();
            return (visitObj.actionItems || [])
                .filter(item => item.status === 'open')
                .filter(item => isPrivileged ||
                    String(item.assignee?._id || item.assignee || '') === String(req.user._id) ||
                    String(visitObj.submittedBy?._id || visitObj.submittedBy || '') === String(req.user._id) ||
                    String(visitObj.forUser?._id || visitObj.forUser || '') === String(req.user._id)
                )
                .map(item => ({
                    ...item,
                    visitId: visitObj._id,
                    visitTitle: visitObj.meta?.companyName || visitObj.studentInfo?.name || 'Untitled visit',
                    submittedBy: visitObj.submittedBy,
                    isOverdue: item.dueDate ? new Date(item.dueDate) < now : false
                }));
        }).sort((a, b) => {
            if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
            return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
        });

        return res.status(200).json({ success: true, count: items.length, data: items });
    } catch (err) {
        console.error('[ActionItems]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.createActionItem = async (req, res) => {
    try {
        const { text, assignee, dueDate } = req.body;
        if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

        const canMutate = await canMutateActionItem(req.user, visit);
        if (!canMutate) return res.status(403).json({ success: false, message: 'Not authorized to mutate action items for this visit' });

        const newItem = {
            _id: new mongoose.Types.ObjectId(),
            text,
            assignee: assignee || null,
            dueDate: dueDate || null,
            status: 'open',
            createdBy: req.user._id,
            createdAt: new Date(),
            history: [{ at: new Date(), by: req.user._id, change: 'created' }]
        };

        await Visit.findByIdAndUpdate(
            req.params.id,
            { $push: { actionItems: newItem } },
            { new: true, runValidators: true }
        );

        auditActionItem(req, 'ACTION_ITEM_CREATE', newItem, req.params.id);

        if (assignee && String(assignee) !== String(req.user._id)) {
            notifyActionItemAssigned(newItem, req.params.id, req.user, assignee)
                .catch(err => console.error('[ActionItems] Assign notification failed:', err.message));
        }

        return res.status(201).json({ success: true, data: newItem });
    } catch (err) {
        console.error('[ActionItems]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateActionItem = async (req, res) => {
    try {
        const { text, assignee, dueDate, note } = req.body;
        if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

        const item = visit.actionItems.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Action item not found' });

        const canMutate = await canMutateActionItem(req.user, visit);
        if (!canMutate) return res.status(403).json({ success: false, message: 'Not authorized to mutate action items for this visit' });

        const histEntry = { at: new Date(), by: req.user._id, change: 'edited', note: note?.trim() || 'text updated' };

        const updated = await Visit.findByIdAndUpdate(
            req.params.id,
            { 
                $set: {
                    'actionItems.$[elem].text': text,
                    'actionItems.$[elem].assignee': assignee || null,
                    'actionItems.$[elem].dueDate': dueDate || null
                },
                $push: { 'actionItems.$[elem].history': histEntry }
            },
            { arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(req.params.itemId) }], new: true }
        )
            .populate('actionItems.assignee', 'name employeeId role')
            .populate('actionItems.createdBy', 'name employeeId')
            .populate('actionItems.history.by', 'name employeeId');

        auditActionItem(req, 'ACTION_ITEM_EDIT', item, req.params.id);

        const prevAssignee = item.assignee?.toString() || '';
        const newAssignee = assignee?.toString() || '';
        if (newAssignee && newAssignee !== prevAssignee && newAssignee !== String(req.user._id)) {
            notifyActionItemAssigned({ text, dueDate }, req.params.id, req.user, newAssignee)
                .catch(err => console.error('[ActionItems] Reassign notification failed:', err.message));
        }

        return res.status(200).json({ success: true, data: updated.actionItems.id(req.params.itemId) });
    } catch (err) {
        console.error('[ActionItems]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.changeActionItemStatus = async (req, res) => {
    try {
        const { status, note } = req.body;
        if (!status || !['open', 'done'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid status is required' });
        }

        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

        const item = visit.actionItems.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Action item not found' });

        const canMutate = await canMutateActionItem(req.user, visit);
        if (!canMutate) return res.status(403).json({ success: false, message: 'Not authorized to mutate action items for this visit' });

        const histEntry = { at: new Date(), by: req.user._id, change: 'status_changed', note: note?.trim() || `status -> ${status}` };

        const updated = await Visit.findByIdAndUpdate(
            req.params.id,
            { 
                $set: { 'actionItems.$[elem].status': status },
                $push: { 'actionItems.$[elem].history': histEntry }
            },
            { arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(req.params.itemId) }], new: true }
        )
            .populate('actionItems.assignee', 'name employeeId role')
            .populate('actionItems.createdBy', 'name employeeId')
            .populate('actionItems.history.by', 'name employeeId');

        auditActionItem(req, 'ACTION_ITEM_STATUS_CHANGE', item, req.params.id, { newStatus: status });

        return res.status(200).json({ success: true, data: updated.actionItems.id(req.params.itemId) });
    } catch (err) {
        console.error('[ActionItems]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteActionItem = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

        const item = visit.actionItems.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Action item not found' });

        const canMutate = await canMutateActionItem(req.user, visit);
        if (!canMutate) return res.status(403).json({ success: false, message: 'Not authorized to mutate action items for this visit' });

        auditActionItem(req, 'ACTION_ITEM_DELETE', item, req.params.id);

        await Visit.findByIdAndUpdate(
            req.params.id,
            { $pull: { actionItems: { _id: new mongoose.Types.ObjectId(req.params.itemId) } } },
            { new: true }
        );

        return res.status(200).json({ success: true, message: 'Action item deleted' });
    } catch (err) {
        console.error('[ActionItems]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

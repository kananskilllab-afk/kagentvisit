const Visit = require('../models/Visit');
const Agent = require('../models/Agent');
const aiService = require('../services/ai.service');

const toObjectIdValue = (value, fallback = null) => {
    if (!value) return fallback;
    return value._id || value;
};

const normalizeSubmittedActionItems = (items, userId) => {
    if (!Array.isArray(items)) return [];
    return items
        .filter(item => item?.text && String(item.text).trim())
        .map(item => ({
            ...(item._id ? { _id: item._id } : {}),
            text: String(item.text).trim(),
            assignee: toObjectIdValue(item.assignee, null),
            dueDate: item.dueDate || null,
            status: item.status === 'done' ? 'done' : 'open',
            createdBy: toObjectIdValue(item.createdBy, userId),
            createdAt: item.createdAt || new Date(),
            history: Array.isArray(item.history) && item.history.length > 0
                ? item.history.map(entry => ({
                    ...entry,
                    by: toObjectIdValue(entry.by, userId)
                }))
                : [{ at: new Date(), by: userId, change: 'created', note: 'created from visit form' }]
        }));
};

// Fire-and-forget: generate both AI insights + audit and save to MongoDB
const triggerBackgroundAI = (visitId) => {
    (async () => {
        try {
            const v = await Visit.findById(visitId);
            if (!v) return;
            const visitData = v.toObject();
            const [insightsResult, auditResult] = await Promise.allSettled([
                aiService.generateVisitInsights(visitData),
                aiService.evaluateAdminAudit(visitData)
            ]);
            const updateFields = {};
            if (insightsResult.status === 'fulfilled') {
                updateFields.aiInsights = { ...insightsResult.value, generatedAt: new Date() };
            }
            if (auditResult.status === 'fulfilled') {
                updateFields.adminAuditEval = { ...auditResult.value, evaluatedAt: new Date() };
            }
            if (Object.keys(updateFields).length > 0) {
                await Visit.findByIdAndUpdate(visitId, updateFields);
            }
            console.log(`[AI] Background generation complete for visit ${visitId}`);
        } catch (e) {
            console.error(`[AI] Background generation failed for visit ${visitId}:`, e.message);
        }
    })();
};

// @desc    Get all visits (User: own, Admin+: all)
exports.getVisits = async (req, res) => {
    try {
        let query = {};
        const andConditions = [];
        const isPrivileged = ['admin', 'superadmin'].includes(req.user.role);

        // Non-admins see only visits they submitted OR visits created for them
        if (!isPrivileged) {
            andConditions.push({ $or: [{ submittedBy: req.user._id }, { forUser: req.user._id }] });
        }

        // Additional filters from query params
        const { status, companyName, startDate, endDate, city, formType, submittedBy, agentId, unlockRequestSent, bdmName } = req.query;
        if (status) query.status = status;
        if (agentId) query['meta.agentId'] = agentId;
        if (bdmName) query['meta.bdmName'] = { $regex: bdmName, $options: 'i' };
        if (unlockRequestSent === 'true') query.unlockRequestSent = true;

        // Admin/superadmin can filter by specific user
        if (submittedBy && isPrivileged) {
            query.submittedBy = submittedBy;
        }
        
        if (companyName) {
            andConditions.push({ $or: [
                { 'meta.companyName': { $regex: companyName, $options: 'i' } },
                { 'studentInfo.name': { $regex: companyName, $options: 'i' } }
            ]});
        }

        // Apply formType filter from query or from Admin's department
        if (formType) {
            query.formType = formType === 'home_visit' ? 'home_visit' : 'generic';
        }

        // Admin visit access can come from department or explicit form assignment.
        if (req.user.role === 'admin') {
            const allowedFormTypes = new Set();
            if (req.user.department === 'B2B') allowedFormTypes.add('generic');
            if (req.user.department === 'B2C') allowedFormTypes.add('home_visit');
            if (req.user.formAccess?.includes('b2b_visit')) allowedFormTypes.add('generic');
            if (req.user.formAccess?.includes('b2c_visit')) allowedFormTypes.add('home_visit');

            if (formType) {
                const requestedFormType = formType === 'home_visit' ? 'home_visit' : 'generic';
                if (!allowedFormTypes.has(requestedFormType)) {
                    return res.json({ success: true, count: 0, data: [] });
                }
                query.formType = requestedFormType;
            } else if (allowedFormTypes.size > 0) {
                query.formType = { $in: Array.from(allowedFormTypes) };
            }
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        if (city) {
            andConditions.push({ $or: [
                { 'agencyProfile.address': { $regex: city, $options: 'i' } },
                { 'location.city': { $regex: city, $options: 'i' } },
                { 'location.address': { $regex: city, $options: 'i' } }
            ]});
        }

        if (andConditions.length > 0) {
            query.$and = andConditions;
        }

        const visits = await Visit.find(query)
            .populate('submittedBy', 'name employeeId')
            .populate('forUser', 'name employeeId')
            .populate('reviewedBy', 'name')
            .select('-__v')
            .sort({ createdAt: -1 });

        // Add logical lock status to results
        // Drafts are NEVER locked. Only submitted forms lock 24h after submittedAt.
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const visitsWithLocked = visits.map(v => {
            const vObj = v.toObject();
            const isSubmitted = v.status !== 'draft';
            const lockAnchor = v.submittedAt || v.createdAt;
            const isWindowExpired = isSubmitted && lockAnchor < twentyFourHoursAgo;
            vObj.isLocked = !isAdmin && isWindowExpired && !v.isAdminUnlocked;
            return vObj;
        });

        res.json({ success: true, count: visits.length, data: visitsWithLocked });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new visit (draft)
exports.createVisit = async (req, res) => {
    try {
        const visitData = {
            ...req.body,
            submittedBy: req.user._id,
            status: req.body.status || 'draft',
            actionItems: normalizeSubmittedActionItems(req.body.actionItems, req.user._id)
        };

        // Set submittedAt when creating directly as submitted
        if (visitData.status === 'submitted') {
            visitData.submittedAt = new Date();
        }

        const visit = await Visit.create(visitData);

        // Update Agent visit stats if submitted
        if (visit.status === 'submitted' && visit.meta?.agentId) {
            await Agent.findByIdAndUpdate(visit.meta.agentId, {
                $inc: { visitCount: 1 },
                lastVisitDate: new Date()
            });
        }

        // Auto-register new company in Manage Agents if it's not already there
        if (visit.status === 'submitted' && visit.meta?.companyName && !visit.meta?.agentId) {
            const companyName = visit.meta.companyName.trim();
            const existing = await Agent.findOne({
                name: { $regex: new RegExp(`^${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            });
            if (!existing) {
                try {
                    await Agent.create({
                        name: companyName,
                        city: visit.location?.city || visit.agencyProfile?.address || '',
                        emailId: visit.agencyProfile?.emailId || visit.meta?.email || '',
                        mobile: String(visit.agencyProfile?.contactNumber || ''),
                        bdmName: visit.meta?.bdmName || '',
                        rmName: visit.meta?.rmName || '',
                        isActive: true,
                        visitCount: 1,
                        lastVisitDate: new Date(),
                        createdBy: req.user._id
                    });
                    console.log(`[Agent Auto-Register] Created new agent: ${companyName}`);
                } catch (agentErr) {
                    // Non-fatal: duplicate or validation error — log and continue
                    console.warn(`[Agent Auto-Register] Skipped: ${agentErr.message}`);
                }
            } else {
                // Company exists but was entered as custom name — bump visit count
                await Agent.findByIdAndUpdate(existing._id, {
                    $inc: { visitCount: 1 },
                    lastVisitDate: new Date()
                });
            }
        }

        // Auto-generate AI analysis in background (non-blocking)
        if (visit.status !== 'draft') {
            triggerBackgroundAI(visit._id);
        }

        res.status(201).json({ success: true, data: visit });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get single visit
exports.getVisitById = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id)
            .populate('submittedBy', 'name employeeId')
            .populate('forUser', 'name employeeId')
            .populate('adminNotes.addedBy', 'name')
            .populate('reviewedBy', 'name');

        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }

        // Check ownership — allow access if submittedBy or forUser matches
        const ownerId = visit.submittedBy?._id?.toString() || visit.submittedBy?.toString();
        const forUserId = visit.forUser?._id?.toString() || visit.forUser?.toString();
        const isUserLevel = !['admin', 'superadmin'].includes(req.user.role);
        if (
            isUserLevel &&
            ownerId !== req.user._id.toString() &&
            forUserId !== req.user._id.toString()
        ) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this visit' });
        }

        // Calculate lock status for frontend
        // Drafts are NEVER locked. Lock timer starts from submittedAt.
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const isSubmitted = visit.status !== 'draft';
        const lockAnchor = visit.submittedAt || visit.createdAt;
        const isWindowExpired = isSubmitted && lockAnchor < twentyFourHoursAgo;

        const visitObj = visit.toObject();
        visitObj.isLocked = !isAdmin && isWindowExpired && !visit.isAdminUnlocked;

        res.json({ success: true, data: visitObj });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update visit (24h window constraint)
exports.updateVisit = async (req, res) => {
    try {
        let visit = await Visit.findById(req.params.id);

        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }

        // Check permission — submittedBy or forUser can edit
        const ownerId = visit.submittedBy?.toString();
        const forUserId = visit.forUser?.toString();
        const isOwner = ownerId === req.user._id.toString() || forUserId === req.user._id.toString();
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this visit' });
        }

        // 24-hour edit lock check for NON-admins
        // Drafts are NEVER locked — lock only applies after submission
        if (!isAdmin && visit.status !== 'draft') {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const lockAnchor = visit.submittedAt || visit.createdAt;
            const isWindowExpired = lockAnchor < twentyFourHoursAgo;

            // If window expired and NOT admin-unlocked, block edit
            if (isWindowExpired && !visit.isAdminUnlocked) {
                return res.status(403).json({
                    success: false,
                    message: 'Edit window (24h) has expired. Please contact admin to unlock.',
                    isLocked: true
                });
            }
        }

        // Determine effective status after this update
        const effectiveNewStatus = req.body.status || visit.status;
        const shouldRegenerateAI = effectiveNewStatus !== 'draft';

        // Prepare update data
        let updateData = { ...req.body };
        if (Object.prototype.hasOwnProperty.call(req.body, 'actionItems')) {
            updateData.actionItems = normalizeSubmittedActionItems(req.body.actionItems, req.user._id);
        }

        // Handle Admin-specific notes
        if (isAdmin && (req.body.adminNote || req.body.adminNoteObj)) {
            const noteData = req.body.adminNoteObj || { note: req.body.adminNote };
            updateData.$push = {
                adminNotes: {
                    ...noteData,
                    addedBy: req.user._id
                }
            };
            delete updateData.adminNote;
            delete updateData.adminNoteObj;
        }

        // Set submittedAt when transitioning from draft to submitted
        if (visit.status === 'draft' && updateData.status === 'submitted' && !visit.submittedAt) {
            updateData.submittedAt = new Date();
        }

        // Clear stale AI data so frontend knows to refresh after edit
        if (shouldRegenerateAI) {
            updateData.$unset = { aiInsights: '', adminAuditEval: '' };
        }

        // Record history
        const historyEntry = {
            editedAt: new Date(),
            editedBy: req.user._id,
            changesSummary: isAdmin ? 'Admin correction' : 'Update survey details'
        };

        if (!updateData.$push) updateData.$push = {};
        updateData.$push.editHistory = historyEntry;

        const updatedVisit = await Visit.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('meta.agentId');

        if (!updatedVisit) {
            return res.status(404).json({ success: false, message: 'Failed to retrieve updated visit' });
        }
        
        // Handle Agent stats update on status change
        const wasSubmitted = visit.status === 'submitted';
        const isNowSubmitted = updatedVisit.status === 'submitted';
        
        const oldAgentId = visit.meta?.agentId?.toString();
        const newAgentId = updatedVisit.meta?.agentId?._id?.toString() || updatedVisit.meta?.agentId?.toString();
        const agentChanged = oldAgentId !== newAgentId;

        if ((!wasSubmitted && isNowSubmitted) || (wasSubmitted && isNowSubmitted && agentChanged)) {
            // Increment new agent
            const targetNewAgentId = updatedVisit.meta?.agentId?._id || (typeof updatedVisit.meta?.agentId === 'string' ? updatedVisit.meta.agentId : null);
            if (targetNewAgentId) {
                await Agent.findByIdAndUpdate(targetNewAgentId, {
                    $inc: { visitCount: 1 },
                    lastVisitDate: new Date()
                });
            }
            // Decrement old agent if it was a re-assignment
            if (wasSubmitted && agentChanged && oldAgentId) {
                await Agent.findByIdAndUpdate(oldAgentId, {
                    $inc: { visitCount: -1 }
                });
            }
        }

        // Auto-register new company when transitioning to submitted and no agentId
        if (!wasSubmitted && isNowSubmitted && updatedVisit.meta?.companyName && !newAgentId) {
            const companyName = updatedVisit.meta.companyName.trim();
            const existing = await Agent.findOne({
                name: { $regex: new RegExp(`^${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            });
            if (!existing) {
                try {
                    await Agent.create({
                        name: companyName,
                        city: updatedVisit.location?.city || updatedVisit.agencyProfile?.address || '',
                        emailId: updatedVisit.agencyProfile?.emailId || updatedVisit.meta?.email || '',
                        mobile: String(updatedVisit.agencyProfile?.contactNumber || ''),
                        bdmName: updatedVisit.meta?.bdmName || '',
                        rmName: updatedVisit.meta?.rmName || '',
                        isActive: true,
                        visitCount: 1,
                        lastVisitDate: new Date(),
                        createdBy: req.user._id
                    });
                    console.log(`[Agent Auto-Register] Created new agent on update: ${companyName}`);
                } catch (agentErr) {
                    console.warn(`[Agent Auto-Register] Skipped on update: ${agentErr.message}`);
                }
            } else {
                await Agent.findByIdAndUpdate(existing._id, {
                    $inc: { visitCount: 1 },
                    lastVisitDate: new Date()
                });
            }
        }

        // Regenerate AI in background for non-draft visits
        if (shouldRegenerateAI) {
            triggerBackgroundAI(req.params.id);
        }

        res.json({ success: true, data: updatedVisit });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete visit
exports.deleteVisit = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);

        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }

        // SuperAdmin can delete anything
        if (req.user.role === 'superadmin') {
            await visit.deleteOne();
            return res.json({ success: true, message: 'Visit removed' });
        }

        // User can delete own visits or visits created for them
        const isOwner = visit.submittedBy?.toString() === req.user._id.toString() ||
                        visit.forUser?.toString() === req.user._id.toString();
        if (isOwner) {
            await visit.deleteOne();
            return res.json({ success: true, message: 'Visit removed' });
        }

        res.status(403).json({ success: false, message: 'Not authorized to delete this visit' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Request visit unlock
exports.requestVisitUnlock = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }
        if (visit.submittedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        
        visit.unlockRequestSent = true;
        await visit.save();
        
        res.json({ success: true, message: 'Unlock request sent to admin' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Approve/Override visit unlock (Admin only)
exports.approveVisitUnlock = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }
        
        const unlock = req.body.unlock !== false; 
        visit.isAdminUnlocked = unlock;
        if (unlock) visit.unlockRequestSent = false; 
        
        await visit.save();
        
        res.json({ success: true, message: unlock ? 'Visit unlocked for editing' : 'Visit lock maintained' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update visit status (Admin only: reviewed / action_required / closed)
exports.updateVisitStatus = async (req, res) => {
    try {
        const { status, comment } = req.body;
        const allowed = ['reviewed', 'action_required', 'closed', 'submitted'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${allowed.join(', ')}` });
        }

        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

        if (visit.status === 'draft') {
            return res.status(400).json({ success: false, message: 'Cannot review a draft visit' });
        }

        if (status === 'action_required' && !comment?.trim()) {
            return res.status(400).json({ success: false, message: 'A comment is required when requesting action' });
        }

        visit.statusHistory.push({
            status,
            changedBy: req.user._id,
            comment: comment?.trim() || null,
            timestamp: new Date()
        });

        visit.status = status;
        visit.reviewedBy = req.user._id;
        visit.reviewedAt = new Date();
        visit.reviewComment = comment?.trim() || null;

        await visit.save();

        const populated = await Visit.findById(visit._id)
            .populate('submittedBy', 'name employeeId')
            .populate('reviewedBy', 'name')
            .populate('adminNotes.addedBy', 'name');

        res.json({ success: true, data: populated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add follow-up meeting
exports.addFollowUpMeeting = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }

        const newMeeting = {
            date: req.body.date || new Date(),
            meetingStart: req.body.meetingStart || null,
            meetingEnd: req.body.meetingEnd || null,
            notes: req.body.notes,
            keyOutcomes: req.body.keyOutcomes || null,
            addedBy: req.user._id
        };

        if (!visit.followUpMeetings) {
            visit.followUpMeetings = [];
        }

        visit.followUpMeetings.push(newMeeting);
        await visit.save();

        res.json({ success: true, data: visit });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

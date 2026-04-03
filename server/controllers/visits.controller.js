const Visit = require('../models/Visit');
const Agent = require('../models/Agent');

// @desc    Get all visits (User: own, Admin+: all)
exports.getVisits = async (req, res) => {
    try {
        let query = {};

        // Role-based filtering
        if (req.user.role === 'user' || req.user.role === 'home_visit') {
            query.submittedBy = req.user._id;
        }

        // Additional filters from query params
        const { status, companyName, startDate, endDate, city, formType, submittedBy, agentId, unlockRequestSent, bdmName } = req.query;
        if (status) query.status = status;
        if (agentId) query['meta.agentId'] = agentId;
        if (bdmName) query['meta.bdmName'] = { $regex: bdmName, $options: 'i' };
        if (unlockRequestSent === 'true') query.unlockRequestSent = true;

        // Admin/superadmin can filter by specific user
        if (submittedBy && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
            query.submittedBy = submittedBy;
        }
        
        if (companyName) {
            query.$or = [
                { 'meta.companyName': { $regex: companyName, $options: 'i' } },
                { 'studentInfo.name': { $regex: companyName, $options: 'i' } }
            ];
        }

        // Apply formType filter from query or from Admin's department
        if (formType) {
            query.formType = formType === 'home_visit' ? 'home_visit' : 'generic';
        }

        // Admin department restriction (overrides or restricts query params)
        if (req.user.role === 'admin') {
            if (req.user.department === 'B2C') {
                query.formType = 'home_visit';
            } else if (req.user.department === 'B2B') {
                query.formType = 'generic';
            }
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        if (city) {
            if (!query.$or) query.$or = [];
            query.$or.push(
                { 'agencyProfile.address': { $regex: city, $options: 'i' } },
                { 'location.city': { $regex: city, $options: 'i' } },
                { 'location.address': { $regex: city, $options: 'i' } }
            );
        }

        const visits = await Visit.find(query)
            .populate('submittedBy', 'name employeeId')
            .select('-__v')
            .sort({ createdAt: -1 });

        // Add logical lock status to results
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const visitsWithLocked = visits.map(v => {
            const vObj = v.toObject();
            const isWindowExpired = v.createdAt < twentyFourHoursAgo;
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
            status: req.body.status || 'draft'
        };

        const visit = await Visit.create(visitData);
        
        // Update Agent visit stats if submitted
        if (visit.status === 'submitted' && visit.meta?.agentId) {
            await Agent.findByIdAndUpdate(visit.meta.agentId, {
                $inc: { visitCount: 1 },
                lastVisitDate: new Date()
            });
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
            .populate('adminNotes.addedBy', 'name');

        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }

        // Check ownership
        const ownerId = visit.submittedBy?._id?.toString() || visit.submittedBy?.toString();
        if ((req.user.role === 'user' || req.user.role === 'home_visit') && ownerId !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this visit' });
        }

        // Calculate lock status for frontend
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const isWindowExpired = visit.createdAt < twentyFourHoursAgo;
        
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

        // Check permission
        const ownerId = visit.submittedBy?.toString();
        const isOwner = ownerId === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this visit' });
        }

        // 24-hour edit lock check for NON-admins
        if (!isAdmin) {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const isWindowExpired = visit.createdAt < twentyFourHoursAgo;
            
            // If window expired and NOT admin-unlocked, block edit
            if (isWindowExpired && !visit.isAdminUnlocked) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Edit window (24h) has expired. Please contact admin to unlock.',
                    isLocked: true 
                });
            }
        }

        // Prepare update data
        let updateData = { ...req.body };

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

        // User can only delete own visits
        if (visit.submittedBy.toString() === req.user._id.toString()) {
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

// @desc    Add follow-up meeting
exports.addFollowUpMeeting = async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }

        const newMeeting = {
            date: req.body.date || new Date(),
            notes: req.body.notes,
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

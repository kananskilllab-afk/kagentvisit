const Visit = require('../models/Visit');

// @desc    Get all visits (User: own, Admin+: all)
exports.getVisits = async (req, res) => {
    try {
        let query = {};

        // Role-based filtering
        if (req.user.role === 'user' || req.user.role === 'home_visit') {
            query.submittedBy = req.user._id;
        }

        // Additional filters from query params
        const { status, companyName, startDate, endDate, city, formType, submittedBy } = req.query;
        if (status) query.status = status;

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
            .sort({ createdAt: -1 });

        res.json({ success: true, count: visits.length, data: visits });
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
        if ((req.user.role === 'user' || req.user.role === 'home_visit') && visit.submittedBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this visit' });
        }

        res.json({ success: true, data: visit });
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
        const isOwner = visit.submittedBy.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this visit' });
        }

        // 24-hour edit lock check for NON-admins (if not draft)
        if (!isAdmin && visit.status !== 'draft') {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (visit.updatedAt < twentyFourHoursAgo) {
                return res.status(403).json({ success: false, message: 'Edit window (24h) has expired' });
            }
        }

        // Prepare update data
        let updateData = { ...req.body };

        // Handle Admin-specific notes
        if (isAdmin && req.body.adminNote) {
            updateData.$push = {
                adminNotes: {
                    note: req.body.adminNote,
                    addedBy: req.user._id
                }
            };
            delete updateData.adminNote;
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
        );

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

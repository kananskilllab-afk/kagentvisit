const Visit = require('../models/Visit');
const User = require('../models/User');

const buildQuery = (reqQuery, user) => {
    let query = {};
    if (user.role === 'user' || user.role === 'home_visit') {
        query.submittedBy = user._id;
    }

    const { pinCode, bdmName, rmName, officerName, status, city, startDate, endDate, reportType } = reqQuery;

    if (pinCode && pinCode !== '') {
        query.$or = query.$or || [];
        query.$or.push({ 'agencyProfile.pinCode': pinCode });
        query.$or.push({ 'location.pinCode': pinCode });
    }
    if (bdmName) query['meta.bdmName'] = { $regex: bdmName, $options: 'i' };
    if (officerName) query['visitInfo.officer'] = { $regex: officerName, $options: 'i' };
    if (rmName) query['meta.rmName'] = { $regex: rmName, $options: 'i' };
    if (status) query.status = status;
    if (city) {
        query.$or = query.$or || [];
        query.$or.push({ 'agencyProfile.address': { $regex: city, $options: 'i' } });
        query.$or.push({ 'location.city': { $regex: city, $options: 'i' } });
        query.$or.push({ 'location.address': { $regex: city, $options: 'i' } });
    }

    if (reportType === 'B2B') query.formType = 'generic';
    if (reportType === 'B2C') query.formType = 'home_visit';

    // Role-based department restriction for Admin
    if (user.role === 'admin') {
        if (user.department === 'B2B') query.formType = 'generic';
        else if (user.department === 'B2C') query.formType = 'home_visit';
    }

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt.$lte = end;
        }
    }

    return query;
};

// ── Summary ───────────────────────────────────────────────────────────────────
exports.getSummary = async (req, res) => {
    try {
        const query = buildQuery(req.query, req.user);

        const totalVisits      = await Visit.countDocuments(query);
        const pendingReview    = await Visit.countDocuments({ ...query, status: 'submitted' });
        const actionRequired   = await Visit.countDocuments({ ...query, status: 'action_required' });
        const closedVisits     = await Visit.countDocuments({ ...query, status: 'closed' });
        const draftVisits      = await Visit.countDocuments({ ...query, status: 'draft' });
        const reviewedVisits   = await Visit.countDocuments({ ...query, status: 'reviewed' });
        const activeUsersCount = (req.user.role !== 'user' && req.user.role !== 'home_visit')
            ? await User.countDocuments({ isActive: true })
            : null;

        // Monthly Trends – last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const trends = await Visit.aggregate([
            { $match: { ...query, createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Status Distribution
        const statusDist = await Visit.aggregate([
            { $match: query },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Form Type Distribution
        const formTypeDist = await Visit.aggregate([
            { $match: query },
            { $group: { _id: '$formType', count: { $sum: 1 } } }
        ]);

        // Daily trend – last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

        const dailyTrends = await Visit.aggregate([
            { $match: { ...query, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                stats: {
                    totalVisits,
                    pendingReview,
                    actionRequired,
                    closedVisits,
                    draftVisits,
                    reviewedVisits,
                    activeUsers: activeUsersCount
                },
                trends,
                dailyTrends,
                statusDist,
                formTypeDist
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── User Performance ──────────────────────────────────────────────────────────
exports.getUserPerformance = async (req, res) => {
    try {
        const matchQuery = buildQuery(req.query, req.user);

        const performance = await Visit.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$submittedBy',
                    visitsCount:     { $sum: 1 },
                    submittedCount:  { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
                    closedCount:     { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                    lastSubmission:  { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    name:           '$user.name',
                    employeeId:     '$user.employeeId',
                    department:     '$user.department',
                    region:         '$user.region',
                    visitsCount:    1,
                    submittedCount: 1,
                    closedCount:    1,
                    lastSubmission: 1
                }
            },
            { $sort: { visitsCount: -1 } }
        ]);

        res.json({ success: true, data: performance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Detailed Analytics (admin/superadmin only) ────────────────────────────────
exports.getDetailedAnalytics = async (req, res) => {
    try {
        const query = buildQuery(req.query, req.user);

        // Visits by day of week
        const byDayOfWeek = await Visit.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $dayOfWeek: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayOfWeekData = days.map((day, i) => {
            const found = byDayOfWeek.find(d => d._id === i + 1);
            return { day, count: found ? found.count : 0 };
        });

        // Visits by hour
        const byHour = await Visit.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const topPincodes = await Visit.aggregate([
            {
                $match: {
                    ...query,
                    $or: [
                        { 'agencyProfile.pinCode': { $exists: true, $ne: '' } },
                        { 'location.pinCode': { $exists: true, $ne: '' } }
                    ]
                }
            },
            {
                $project: {
                    pinCode: {
                        $cond: [
                            { $ifNull: ['$agencyProfile.pinCode', false] },
                            '$agencyProfile.pinCode',
                            '$location.pinCode'
                        ]
                    }
                }
            },
            { $group: { _id: '$pinCode', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Business Model Distribution (B2B)
        const businessModels = await Visit.aggregate([
            { $match: { ...query, formType: 'generic' } },
            { $unwind: '$agencyProfile.businessModel' },
            { $group: { _id: '$agencyProfile.businessModel', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Countries Promoted Distribution (B2B)
        const countriesPromoted = await Visit.aggregate([
            { $match: { ...query, formType: 'generic' } },
            { $unwind: '$promoterTeam.countriesPromoted' },
            { $group: { _id: '$promoterTeam.countriesPromoted', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Preferred Countries (B2B partnership)
        const partnershipCountries = await Visit.aggregate([
            { $match: { ...query, formType: 'generic' } },
            { $unwind: '$partnership.preferredCountries' },
            { $group: { _id: '$partnership.preferredCountries', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Avg infrastructure rating
        const avgInfraRating = await Visit.aggregate([
            { $match: { ...query, formType: 'generic', 'agencyProfile.infraRating': { $exists: true } } },
            { $group: { _id: null, avg: { $avg: '$agencyProfile.infraRating' }, total: { $sum: 1 } } }
        ]);

        // B2C Visit outcomes
        const visitOutcomes = await Visit.aggregate([
            { $match: { ...query, formType: 'home_visit', 'outcome.status': { $exists: true } } },
            { $group: { _id: '$outcome.status', count: { $sum: 1 } } }
        ]);

        // Completion funnel
        const funnelStages = ['draft', 'submitted', 'reviewed', 'action_required', 'closed'];
        const funnelData = await Promise.all(
            funnelStages.map(async (stage) => ({
                stage,
                count: await Visit.countDocuments({ ...query, status: stage })
            }))
        );

        res.json({
            success: true,
            data: {
                dayOfWeekData,
                byHour,
                topPincodes,
                businessModels,
                countriesPromoted,
                partnershipCountries,
                avgInfraRating: avgInfraRating[0]?.avg?.toFixed(1) || 0,
                visitOutcomes,
                funnelData
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

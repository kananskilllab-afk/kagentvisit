const Visit = require('../models/Visit');
const User = require('../models/User');

const buildQuery = (reqQuery, user) => {
    let query = {};
    if (user.role === 'user' || user.role === 'home_visit') {
        query.submittedBy = user._id;
    }

    const { pinCode, bdmName, rmName, officerName, status, city, startDate, endDate, reportType } = reqQuery;

    // Each multi-field OR condition is wrapped in its own $and clause so that
    // combining multiple filters means AND (not OR) between them.
    const andConditions = [];

    if (pinCode && pinCode !== '') {
        andConditions.push({ $or: [
            { 'agencyProfile.pinCode': pinCode },
            { 'location.pinCode': pinCode }
        ]});
    }
    if (city) {
        andConditions.push({ $or: [
            { 'agencyProfile.address': { $regex: city, $options: 'i' } },
            { 'location.city': { $regex: city, $options: 'i' } },
            { 'location.address': { $regex: city, $options: 'i' } }
        ]});
    }
    if (andConditions.length > 0) query.$and = andConditions;

    if (bdmName) query['meta.bdmName'] = { $elemMatch: { $regex: bdmName, $options: 'i' } };
    if (officerName) query['visitInfo.officer'] = { $regex: officerName, $options: 'i' };
    if (rmName) query['meta.rmName'] = { $regex: rmName, $options: 'i' };
    if (status) query.status = status;

    if (reportType === 'B2B') query.formType = 'generic';
    if (reportType === 'B2C') query.formType = 'home_visit';

    // Role-based department restriction for Admin (always wins)
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

// ── BDM Report ────────────────────────────────────────────────────────────────
exports.getBdmReport = async (req, res) => {
    try {
        const query = buildQuery(req.query, req.user);

        // BDM-wise aggregation (B2B only)
        const bdmStats = await Visit.aggregate([
            { $match: { ...query, formType: 'generic', 'meta.bdmName': { $exists: true, $ne: '' } } },
            // Normalize bdmName: if it's an array, unwind each element; if string, keep it
            {
                $addFields: {
                    bdmNameNormalized: {
                        $cond: [
                            { $isArray: '$meta.bdmName' },
                            '$meta.bdmName',
                            { $cond: [
                                { $and: [{ $ne: ['$meta.bdmName', ''] }, { $ne: ['$meta.bdmName', null] }] },
                                ['$meta.bdmName'],
                                []
                            ]}
                        ]
                    }
                }
            },
            { $unwind: { path: '$bdmNameNormalized', preserveNullAndEmptyArrays: false } },
            { $match: { bdmNameNormalized: { $ne: '', $type: 'string' } } },
            {
                $group: {
                    _id: '$bdmNameNormalized',
                    totalVisits:    { $sum: 1 },
                    pendingCount:   { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
                    actionRequired: { $sum: { $cond: [{ $eq: ['$status', 'action_required'] }, 1, 0] } },
                    closedCount:    { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                    reviewedCount:  { $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] } },
                    draftCount:     { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                    companies:      { $addToSet: '$meta.companyName' },
                    lastVisit:      { $max: '$createdAt' },
                    avgInfraRating: { $avg: '$agencyProfile.infraRating' }
                }
            },
            { $sort: { totalVisits: -1 } }
        ]);

        res.json({ success: true, data: bdmStats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Summary ───────────────────────────────────────────────────────────────────
exports.getSummary = async (req, res) => {
    try {
        const query = buildQuery(req.query, req.user);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        // Single atomic aggregation for all counts — guarantees consistency
        const [facetResult] = await Visit.aggregate([
            { $match: query },
            {
                $facet: {
                    byStatus: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    activeSurveyors: [
                        { $group: { _id: '$submittedBy' } },
                        { $count: 'n' }
                    ],
                    dailyTrends: [
                        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                        { $sort: { _id: 1 } }
                    ],
                    monthlyTrends: [
                        { $match: { createdAt: { $gte: sixMonthsAgo } } },
                        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
                        { $sort: { _id: 1 } }
                    ]
                }
            }
        ]);

        // Build status map from the single aggregation result
        const statusMap = {};
        let totalVisits = 0;
        for (const s of (facetResult?.byStatus || [])) {
            statusMap[s._id] = s.count;
            totalVisits += s.count;
        }

        const activeSurveyors = (req.user.role !== 'user' && req.user.role !== 'home_visit')
            ? (facetResult?.activeSurveyors[0]?.n || 0)
            : null;

        res.json({
            success: true,
            data: {
                stats: {
                    totalVisits,
                    pendingReview:  statusMap['submitted']       || 0,
                    actionRequired: statusMap['action_required'] || 0,
                    closedVisits:   statusMap['closed']          || 0,
                    draftVisits:    statusMap['draft']           || 0,
                    reviewedVisits: statusMap['reviewed']        || 0,
                    // Distinct surveyors who submitted at least one visit in this period
                    activeUsers: activeSurveyors
                },
                trends:      facetResult?.monthlyTrends || [],
                dailyTrends: facetResult?.dailyTrends   || []
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
                    // Total including drafts
                    visitsCount:        { $sum: 1 },
                    // Drafts (not yet submitted — don't count as work done)
                    draftCount:         { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                    // Submitted (pending review)
                    submittedCount:     { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
                    // Reviewed
                    reviewedCount:      { $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] } },
                    // Action required
                    actionRequiredCount:{ $sum: { $cond: [{ $eq: ['$status', 'action_required'] }, 1, 0] } },
                    // Closed / resolved
                    closedCount:        { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                    lastSubmission:     { $max: '$createdAt' }
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
                    name:                '$user.name',
                    employeeId:          '$user.employeeId',
                    department:          '$user.department',
                    region:              '$user.region',
                    visitsCount:         1,
                    draftCount:          1,
                    submittedCount:      1,
                    reviewedCount:       1,
                    actionRequiredCount: 1,
                    closedCount:         1,
                    lastSubmission:      1
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

        // Completion funnel — single aggregation, consistent with summary counts
        const funnelAgg = await Visit.aggregate([
            { $match: query },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const funnelMap = {};
        for (const f of funnelAgg) funnelMap[f._id] = f.count;
        const funnelData = ['draft', 'submitted', 'reviewed', 'action_required', 'closed'].map(stage => ({
            stage,
            count: funnelMap[stage] || 0
        }));

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

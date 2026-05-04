
// @desc    Backfill: create Agent records for any visit-history companyNames not yet in Agents
// @route   POST /api/agents/backfill-from-visits
// @access  superadmin only
exports.backfillAgentsFromVisits = async (req, res) => {
    try {
        const companiesInVisits = await Visit.distinct('meta.companyName', {
            'meta.companyName': { $exists: true, $ne: null },
            status: { $ne: 'draft' }
        });

        const validCompanies = companiesInVisits.filter(n => n && n.trim());

        if (validCompanies.length === 0) {
            return res.json({ success: true, message: 'No company names found in visit history.', created: 0, skipped: 0 });
        }

        const existingAgents = await Agent.find({
            name: { $in: validCompanies.map(n => new RegExp('^' + n.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')) }
        }).select('name');

        const existingNamesLower = new Set(existingAgents.map(a => a.name.toLowerCase()));
        const toCreate = validCompanies.filter(n => !existingNamesLower.has(n.trim().toLowerCase()));

        let created = 0;
        let skipped = validCompanies.length - toCreate.length;

        for (const companyName of toCreate) {
            try {
                const safeRx = new RegExp('^' + companyName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
                const latestVisit = await Visit.findOne({
                    'meta.companyName': { $regex: safeRx },
                    status: { $ne: 'draft' }
                }).sort({ createdAt: -1 }).lean();

                const visitCount = await Visit.countDocuments({
                    'meta.companyName': { $regex: safeRx },
                    status: { $ne: 'draft' }
                });

                await Agent.create({
                    name: companyName.trim(),
                    city: latestVisit?.location?.city || '',
                    state: latestVisit?.location?.state || '',
                    pinCode: latestVisit?.agencyProfile?.pinCode || latestVisit?.location?.pinCode || '',
                    emailId: latestVisit?.agencyProfile?.emailId || latestVisit?.meta?.email || '',
                    mobile: String(latestVisit?.agencyProfile?.contactNumber || ''),
                    bdmName: String(latestVisit?.meta?.bdmName || ''),
                    rmName: String(latestVisit?.meta?.rmName || ''),
                    isActive: true,
                    visitCount,
                    lastVisitDate: latestVisit?.submittedAt || latestVisit?.createdAt || null,
                    createdBy: req.user._id
                });
                created++;
            } catch (err) {
                console.warn('[Backfill] Skipped "' + companyName + '": ' + err.message);
                skipped++;
            }
        }

        res.json({
            success: true,
            message: `Backfill complete. ${created} new agents created, ${skipped} already existed or skipped.`,
            created,
            skipped,
            total: validCompanies.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

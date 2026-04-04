const Visit = require('../models/Visit');
const aiService = require('../services/ai.service');

// Generate Insights for User/Submitter
exports.generateInsights = async (req, res) => {
    try {
        const { id } = req.params;
        const visit = await Visit.findById(id);

        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }

        // Only allow if user is admin or the submitter
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && visit.submittedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to view insights for this visit' });
        }

        // Call Gemini
        const generatedData = await aiService.generateVisitInsights(visit.toObject());
        
        // Save to DB
        visit.aiInsights = {
            ...generatedData,
            generatedAt: Date.now()
        };
        await visit.save();

        res.status(200).json({ success: true, data: visit.aiInsights });
    } catch (error) {
        console.error('generateInsights Controller Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error while generating insights' });
    }
};

// Generate Audit for Admin
exports.evaluateAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const visit = await Visit.findById(id);

        if (!visit) {
            return res.status(404).json({ success: false, message: 'Visit not found' });
        }

        // Only allow if user is admin
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Only admins can evaluate audits' });
        }

        // Call Gemini
        const generatedData = await aiService.evaluateAdminAudit(visit.toObject());
        
        // Save to DB
        visit.adminAuditEval = {
            ...generatedData,
            evaluatedAt: Date.now()
        };
        await visit.save();

        res.status(200).json({ success: true, data: visit.adminAuditEval });
    } catch (error) {
        console.error('evaluateAudit Controller Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error while evaluating audit' });
    }
};

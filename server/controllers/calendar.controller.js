const VisitSchedule = require('../models/VisitSchedule');
const VisitPlan = require('../models/VisitPlan');
const Notification = require('../models/Notification');
const Expense = require('../models/Expense');
const gcal = require('../services/googleCalendar.service');

// ─── Get Scheduled Visits (plan-aware) ────────────────────────────────────
// GET /api/calendar?start=&end=&agent=&city=&hasOpenClaim=&view=week&planStatus=
exports.getScheduledVisits = async (req, res) => {
    try {
        const { start, end, agent, city, hasOpenClaim, planStatus } = req.query;

        // Build plan query for scope
        const planQuery = {};
        if (req.user.role === 'user' || req.user.role === 'home_visit') {
            planQuery.owner = req.user._id;
        }
        if (city) planQuery.city = { $regex: city, $options: 'i' };
        if (planStatus) planQuery.status = planStatus;

        const scheduleQuery = {};
        if (agent) scheduleQuery.agentId = agent;

        // Date range
        if (start || end) {
            scheduleQuery.scheduledDate = {};
            if (start) scheduleQuery.scheduledDate.$gte = new Date(start);
            if (end) scheduleQuery.scheduledDate.$lte = new Date(end);
        }

        // If user is scoped, filter by their plans
        if (req.user.role === 'user' || req.user.role === 'home_visit') {
            const planIds = await VisitPlan.find(planQuery).distinct('_id');
            scheduleQuery.visitPlanRef = { $in: planIds };
        } else if (city || planStatus) {
            const planIds = await VisitPlan.find(planQuery).distinct('_id');
            if (planIds.length) scheduleQuery.visitPlanRef = { $in: planIds };
        } else {
            // Legacy schedules (no visitPlanRef) should still show up for their owner
            if (req.user.role !== 'accounts' && req.user.role !== 'superadmin') {
                scheduleQuery.$or = [
                    { user: req.user._id },
                    { visitPlanRef: { $exists: true } }
                ];
            }
        }

        const schedules = await VisitSchedule.find(scheduleQuery)
            .populate('agentId', 'name city state')
            .populate({
                path: 'visitPlanRef',
                select: 'title planType city state cities status plannedStartAt plannedEndAt cityTier',
                populate: { path: 'agents', select: 'name city' }
            })
            .populate('clientPhoto.uploadRef', 'url')
            .sort({ scheduledDate: 1 })
            .lean();

        res.json({ success: true, data: schedules });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Create Scheduled Visit (legacy — prefer /api/visit-plans/:id/schedules) ─
exports.createScheduledVisit = async (req, res) => {
    try {
        const {
            title, scheduledDate, scheduledEndDate, reminderOffset,
            notes, visitType, location, linkedVisit, syncToGoogle,
            visitPlanRef, agentId
        } = req.body;

        const schedule = await VisitSchedule.create({
            user: req.user._id,
            title,
            scheduledDate,
            scheduledEndDate,
            reminderOffset: reminderOffset || 0,
            notes,
            visitType: visitType || 'generic',
            location,
            linkedVisit: linkedVisit || null,
            visitPlanRef: visitPlanRef || null,
            agentId: agentId || null,
            syncToGoogle: !!syncToGoogle
        });

        if (syncToGoogle && req.user.googleCalendar?.connected) {
            try {
                const eventId = await gcal.createEvent(req.user, schedule);
                if (eventId) { schedule.googleCalendarEventId = eventId; await schedule.save(); }
            } catch (e) { /* non-fatal */ }
        }

        res.status(201).json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── Update Scheduled Visit ────────────────────────────────────────────────
exports.updateScheduledVisit = async (req, res) => {
    try {
        const schedule = await VisitSchedule.findOne({ _id: req.params.id, user: req.user._id });
        if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

        const allowedFields = [
            'title', 'scheduledDate', 'scheduledEndDate', 'reminderOffset',
            'notes', 'visitType', 'location', 'linkedVisit', 'syncToGoogle', 'status'
        ];
        allowedFields.forEach(f => {
            if (req.body[f] !== undefined) schedule[f] = req.body[f];
        });

        if (req.body.scheduledDate || req.body.reminderOffset !== undefined) {
            schedule.reminderSent = false;
        }

        await schedule.save();

        if (schedule.syncToGoogle && req.user.googleCalendar?.connected) {
            try {
                if (schedule.googleCalendarEventId) {
                    await gcal.updateEvent(req.user, schedule.googleCalendarEventId, schedule);
                } else {
                    const id = await gcal.createEvent(req.user, schedule);
                    if (id) { schedule.googleCalendarEventId = id; await schedule.save(); }
                }
            } catch (e) { /* non-fatal */ }
        }

        res.json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── Delete Scheduled Visit ────────────────────────────────────────────────
exports.deleteScheduledVisit = async (req, res) => {
    try {
        // Block if expenses are linked
        const hasExpense = await Expense.exists({ visitScheduleRef: req.params.id });
        if (hasExpense) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete — expenses are linked to this schedule.'
            });
        }

        const schedule = await VisitSchedule.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

        if (schedule.googleCalendarEventId && req.user.googleCalendar?.connected) {
            try { await gcal.deleteEvent(req.user, schedule.googleCalendarEventId); } catch (_) {}
        }

        res.json({ success: true, message: 'Scheduled visit deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Reschedule (drag-and-drop) ────────────────────────────────────────────
// POST /api/calendar/reschedule
exports.rescheduleVisit = async (req, res) => {
    try {
        const { scheduleId, newStart, newEnd } = req.body;
        if (!scheduleId || !newStart) {
            return res.status(400).json({ success: false, message: 'scheduleId and newStart required' });
        }

        const schedule = await VisitSchedule.findOne({ _id: scheduleId, user: req.user._id });
        if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

        // 7-day reimbursement-window rule: if linked plan exists, new date must stay within plan window
        if (schedule.visitPlanRef) {
            const plan = await VisitPlan.findById(schedule.visitPlanRef);
            if (plan) {
                const newDate = new Date(newStart);
                const planStart = new Date(plan.plannedStartAt);
                const planEnd = new Date(plan.plannedEndAt);
                planEnd.setDate(planEnd.getDate() + 1);
                if (newDate < planStart || newDate > planEnd) {
                    return res.status(400).json({
                        success: false,
                        message: `Rescheduled date must be within the plan window (${plan.plannedStartAt.toISOString().slice(0,10)} – ${plan.plannedEndAt.toISOString().slice(0,10)}).`,
                        errorCode: 'OUT_OF_PLAN_WINDOW'
                    });
                }
            }
        }

        schedule.scheduledDate = new Date(newStart);
        if (newEnd) schedule.scheduledEndDate = new Date(newEnd);
        schedule.reminderSent = false;
        await schedule.save();

        if (schedule.syncToGoogle && req.user.googleCalendar?.connected && schedule.googleCalendarEventId) {
            try { await gcal.updateEvent(req.user, schedule.googleCalendarEventId, schedule); } catch (_) {}
        }

        res.json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── Bulk cancel (all schedules in a plan) ────────────────────────────────
// POST /api/calendar/bulk-cancel { planId }
exports.bulkCancel = async (req, res) => {
    try {
        const { planId } = req.body;
        if (!planId) return res.status(400).json({ success: false, message: 'planId required' });

        const plan = await VisitPlan.findById(planId);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (String(plan.owner) !== String(req.user._id) && !['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await VisitSchedule.updateMany(
            { visitPlanRef: planId, status: 'pending' },
            { status: 'cancelled' }
        );
        plan.status = 'cancelled';
        await plan.save();

        res.json({ success: true, message: 'Plan and all pending schedules cancelled' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── Conflict check (used by drag-create) ─────────────────────────────────
// GET /api/calendar/conflicts?agentId=&start=&end=
exports.checkConflicts = async (req, res) => {
    try {
        const { agentId, start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({ success: false, message: 'start and end required' });
        }

        const q = {
            scheduledDate: { $gte: new Date(start), $lte: new Date(end) },
            status: { $nin: ['cancelled', 'missed'] }
        };
        if (agentId) q.agentId = agentId;

        const conflicts = await VisitSchedule.find(q)
            .populate('agentId', 'name')
            .populate('visitPlanRef', 'title')
            .lean();

        res.json({ success: true, data: conflicts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Trigger Due Reminders ─────────────────────────────────────────────────
exports.triggerReminders = async (req, res) => {
    try {
        const now = new Date();
        const due = await VisitSchedule.find({
            user: req.user._id,
            reminderSent: false,
            reminderOffset: { $gt: 0 }
        });

        const toFire = due.filter(s => {
            const fireAt = new Date(s.scheduledDate.getTime() - s.reminderOffset * 60 * 1000);
            return fireAt <= now;
        });

        if (toFire.length === 0) return res.json({ success: true, fired: 0 });

        const notifications = toFire.map(s => ({
            recipient: req.user._id,
            type: 'visit_reminder',
            title: 'Upcoming Visit Reminder',
            message: `Your visit "${s.title}" is scheduled for ${new Date(s.scheduledDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
            visitScheduleRef: s._id
        }));

        await Notification.insertMany(notifications);
        await VisitSchedule.updateMany(
            { _id: { $in: toFire.map(s => s._id) } },
            { reminderSent: true }
        );

        res.json({ success: true, fired: toFire.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

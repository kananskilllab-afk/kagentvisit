const VisitSchedule = require('../models/VisitSchedule');
const Notification   = require('../models/Notification');
const gcal           = require('../services/googleCalendar.service');

// ─── Get Scheduled Visits ──────────────────────────────────────────────────────
// GET /api/calendar?start=<ISO>&end=<ISO>
exports.getScheduledVisits = async (req, res) => {
    try {
        const { start, end } = req.query;
        const query = { user: req.user._id };

        if (start || end) {
            query.scheduledDate = {};
            if (start) query.scheduledDate.$gte = new Date(start);
            if (end)   query.scheduledDate.$lte = new Date(end);
        }

        const schedules = await VisitSchedule.find(query).sort({ scheduledDate: 1 });
        res.json({ success: true, data: schedules });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Create Scheduled Visit ────────────────────────────────────────────────────
// POST /api/calendar
exports.createScheduledVisit = async (req, res) => {
    try {
        const { title, scheduledDate, reminderOffset, notes, visitType, location, linkedVisit, syncToGoogle } = req.body;

        const schedule = await VisitSchedule.create({
            user: req.user._id,
            title,
            scheduledDate,
            reminderOffset: reminderOffset || 0,
            notes,
            visitType: visitType || 'generic',
            location,
            linkedVisit: linkedVisit || null,
            syncToGoogle: !!syncToGoogle
        });

        // Sync to Google Calendar if requested and user is connected
        if (syncToGoogle && req.user.googleCalendar?.connected) {
            try {
                const eventId = await gcal.createEvent(req.user, schedule);
                if (eventId) {
                    schedule.googleCalendarEventId = eventId;
                    await schedule.save();
                }
            } catch (gcErr) {
                console.error('Google Calendar sync (create) failed:', gcErr.message);
            }
        }

        res.status(201).json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── Update Scheduled Visit ────────────────────────────────────────────────────
// PUT /api/calendar/:id
exports.updateScheduledVisit = async (req, res) => {
    try {
        const schedule = await VisitSchedule.findOne({ _id: req.params.id, user: req.user._id });
        if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

        const allowedFields = ['title', 'scheduledDate', 'reminderOffset', 'notes', 'visitType', 'location', 'linkedVisit', 'syncToGoogle'];
        allowedFields.forEach(f => {
            if (req.body[f] !== undefined) schedule[f] = req.body[f];
        });

        // If date or offset changed, reset reminderSent so it fires again
        if (req.body.scheduledDate || req.body.reminderOffset !== undefined) {
            schedule.reminderSent = false;
        }

        await schedule.save();

        // Sync update to Google Calendar
        if (schedule.syncToGoogle && req.user.googleCalendar?.connected) {
            try {
                if (schedule.googleCalendarEventId) {
                    await gcal.updateEvent(req.user, schedule.googleCalendarEventId, schedule);
                } else {
                    const eventId = await gcal.createEvent(req.user, schedule);
                    if (eventId) {
                        schedule.googleCalendarEventId = eventId;
                        await schedule.save();
                    }
                }
            } catch (gcErr) {
                console.error('Google Calendar sync (update) failed:', gcErr.message);
            }
        }

        res.json({ success: true, data: schedule });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─── Delete Scheduled Visit ────────────────────────────────────────────────────
// DELETE /api/calendar/:id
exports.deleteScheduledVisit = async (req, res) => {
    try {
        const schedule = await VisitSchedule.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });

        // Delete from Google Calendar if it was synced
        if (schedule.googleCalendarEventId && req.user.googleCalendar?.connected) {
            try {
                await gcal.deleteEvent(req.user, schedule.googleCalendarEventId);
            } catch (gcErr) {
                console.error('Google Calendar sync (delete) failed:', gcErr.message);
            }
        }

        res.json({ success: true, message: 'Scheduled visit deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Trigger Due Reminders ─────────────────────────────────────────────────────
// POST /api/calendar/reminders
// Called when the user opens the calendar page — lightweight check for past-due reminders.
exports.triggerReminders = async (req, res) => {
    try {
        const now = new Date();

        // Find all unsent reminders for this user where (scheduledDate - reminderOffset minutes) <= now
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

        // Create in-app notifications
        const notifications = toFire.map(s => ({
            recipient:  req.user._id,
            type:       'visit_reminder',
            title:      `Upcoming Visit Reminder`,
            message:    `Your visit "${s.title}" is scheduled for ${new Date(s.scheduledDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
            visitScheduleRef: s._id
        }));

        await Notification.insertMany(notifications);

        // Mark reminders as sent
        await VisitSchedule.updateMany(
            { _id: { $in: toFire.map(s => s._id) } },
            { reminderSent: true }
        );

        res.json({ success: true, fired: toFire.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

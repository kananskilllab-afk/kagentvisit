'use strict';
const cron = require('node-cron');
const Visit = require('../models/Visit');
const VisitSchedule = require('../models/VisitSchedule');
const { createNotification } = require('../services/notification.service');

/**
 * Queries Visit and VisitSchedule for open action items with dueDate < now,
 * groups them by assignee (falling back to visit submitter / schedule user),
 * and emits ONE digest Notification per affected user.
 *
 * Fires daily at 09:00 IST (Asia/Kolkata).
 * Registered in server.js AFTER connectDB() resolves.
 */
async function runOverdueDigest() {
    console.log('[Cron] overdueActionItems: running digest at', new Date().toISOString());
    try {
        const now = new Date();

        // Query uses $elemMatch so the compound index on actionItems.status + actionItems.dueDate is used
        const [overdueVisits, overdueSchedules] = await Promise.all([
            Visit.find({
                actionItems: { $elemMatch: { status: 'open', dueDate: { $lt: now } } }
            }).select('submittedBy actionItems').lean(),

            VisitSchedule.find({
                actionItems: { $elemMatch: { status: 'open', dueDate: { $lt: now } } }
            }).select('user actionItems').lean()
        ]);

        // Build map: userId (string) -> count of overdue items
        const userMap = new Map();

        const addItems = (docs, ownerField) => {
            for (const doc of docs) {
                const overdue = doc.actionItems.filter(
                    i => i.status === 'open' && i.dueDate && new Date(i.dueDate) < now
                );
                for (const item of overdue) {
                    // Assignee takes precedence; fall back to visit owner
                    const uid = String(item.assignee || doc[ownerField]);
                    userMap.set(uid, (userMap.get(uid) || 0) + 1);
                }
            }
        };

        addItems(overdueVisits,   'submittedBy');
        addItems(overdueSchedules, 'user');

        if (userMap.size === 0) {
            console.log('[Cron] overdueActionItems: no overdue items found');
            return;
        }

        // Emit one notification per user — no await on individual promises (fire-and-settle)
        const promises = [];
        for (const [uid, count] of userMap) {
            promises.push(
                createNotification({
                    recipient: uid,
                    type: 'action_item_overdue',
                    title: `You have ${count} overdue action item${count > 1 ? 's' : ''}`,
                    message: `${count} action item${count > 1 ? 's are' : ' is'} past due. Please review your visits and take action.`,
                    sendEmailFlag: false   // in-app only per REQUIREMENTS.md Future scope
                }).catch(err => console.error('[Cron] notification failed for user', uid, err.message))
            );
        }
        await Promise.allSettled(promises);
        console.log('[Cron] overdueActionItems: sent', userMap.size, 'digest notification(s)');

    } catch (err) {
        console.error('[Cron] overdueActionItems failed:', err.message);
    }
}

function scheduleOverdueDigest() {
    // '0 9 * * *' = 09:00 daily; timezone option ensures IST regardless of server TZ
    cron.schedule('0 9 * * *', runOverdueDigest, {
        timezone: 'Asia/Kolkata'
    });
    console.log('[Cron] overdueActionItems: scheduled for 09:00 IST daily');
}

module.exports = { scheduleOverdueDigest, runOverdueDigest };

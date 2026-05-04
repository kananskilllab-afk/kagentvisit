'use strict';
/**
 * AIT-05: Overdue digest cron job tests
 * Verifies grouping logic and notification emission in runOverdueDigest().
 * Skeleton only — bodies implemented after Wave 3 runs.
 *
 * Note on visitRef (by design):
 * The digest notification covers MULTIPLE visits per user (one notification per user,
 * not one per visit). Therefore visitRef is intentionally null on action_item_overdue
 * notifications — there is no single visit to reference. This is documented in
 * overdueActionItems.job.js with an inline comment.
 */

describe('runOverdueDigest — grouping logic', () => {
    it.todo('emits ONE notification per user regardless of how many overdue items they have');
    it.todo('groups by assignee first, falls back to submittedBy when assignee is absent');
    it.todo('does not emit notifications when no overdue items exist');
    it.todo('handles both Visit and VisitSchedule overdue items in the same digest run');
});

describe('runOverdueDigest — notification shape', () => {
    it.todo('notification type is "action_item_overdue"');
    it.todo('notification title includes the overdue item count');
    it.todo('sendEmailFlag is false (in-app only)');
    it.todo('visitRef is null by design — digest covers multiple visits per user');
});

describe('scheduleOverdueDigest — registration', () => {
    it.todo('scheduleOverdueDigest registers a cron task without throwing');
    it.todo('exported function is typeof function');
});

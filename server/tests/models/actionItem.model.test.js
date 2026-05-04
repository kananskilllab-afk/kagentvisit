'use strict';
/**
 * AIT-01: actionItems schema shape tests
 * These tests verify the Mongoose schema added in Plan 02-01.
 * Skeleton only — bodies implemented after Wave 1 runs.
 */

describe('ActionItem schema — Visit model', () => {
    it.todo('actionItems path resolves on visitSchema');
    it.todo('actionItemSchema has required text field');
    it.todo('actionItemSchema status defaults to "open"');
    it.todo('actionItemSchema status rejects invalid values');
    it.todo('actionItemHistorySchema change field has correct enum');
    it.todo('3 compound indexes are declared on visitSchema');
});

describe('ActionItem schema — VisitSchedule model', () => {
    it.todo('actionItems path resolves on visitScheduleSchema');
    it.todo('actionItems field defaults to []');
    it.todo('3 compound indexes are declared on visitScheduleSchema');
});

describe('AuditLog enum extension', () => {
    it.todo('targetModel enum includes "ActionItem"');
});

describe('Notification enum extension', () => {
    it.todo('type enum includes "action_item_overdue"');
    it.todo('visitRef field exists on notificationSchema');
});

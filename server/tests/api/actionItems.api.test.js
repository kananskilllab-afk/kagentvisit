'use strict';
/**
 * AIT-02: Action item CRUD endpoint tests
 * AIT-03: History append + AuditLog write tests
 * These tests exercise the routes added in Plan 02-02.
 * Skeleton only — bodies implemented after Wave 2 runs.
 */

describe('GET /api/visits/:id/action-items', () => {
    it.todo('returns 200 with actionItems array for existing visit');
    it.todo('returns 404 when visit does not exist');
    it.todo('returns 200 with empty array when visit has no action items');
});

describe('POST /api/visits/:id/action-items', () => {
    it.todo('returns 201 with new action item on valid request');
    it.todo('new item has status "open" and history[0].change === "created"');
    it.todo('returns 400 when text is missing');
    it.todo('returns 404 when visit does not exist');
});

describe('PUT /api/visits/:id/action-items/:itemId', () => {
    it.todo('returns 200 and updates text');
    it.todo('history gains one entry with change === "edited"');
    it.todo('returns 400 when text is missing');
    it.todo('returns 404 when item does not exist');
});

describe('PUT /api/visits/:id/action-items/:itemId/status', () => {
    it.todo('returns 200 and updates status');
    it.todo('history gains one entry with change === "status_changed"');
    it.todo('returns 400 for invalid status value');
});

describe('DELETE /api/visits/:id/action-items/:itemId', () => {
    it.todo('returns 200 and item is removed from actionItems[]');
    it.todo('AuditLog row with targetModel "ActionItem" exists after deletion');
});

describe('AuditLog writes (AIT-03)', () => {
    it.todo('createActionItem writes exactly one AuditLog row with action ACTION_ITEM_CREATE');
    it.todo('updateActionItem writes exactly one AuditLog row with action ACTION_ITEM_EDIT');
    it.todo('changeActionItemStatus writes one AuditLog row with action ACTION_ITEM_STATUS_CHANGE');
    it.todo('deleteActionItem writes AuditLog BEFORE pulling from array');
});

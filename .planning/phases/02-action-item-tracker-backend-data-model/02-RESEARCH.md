# Phase 2: Action Item Tracker — Backend & Data Model — Research

**Researched:** 2026-05-02
**Domain:** Node.js/Express + Mongoose embedded sub-documents, REST sub-resources, AuditLog, Notification, cron
**Confidence:** HIGH — all findings derived from reading the actual codebase; no guesswork

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AIT-01 | `actionItems[]` persisted on `VisitSchedule` and `Visit` with shape `{ _id, text, assignee, dueDate, status, createdBy, createdAt, history[] }` | Schema addition pattern clear from existing sub-schema conventions; default `[]` satisfies no-breaking-change constraint |
| AIT-02 | Add/edit/delete/status-change via `/api/visits/:visitId/action-items` REST endpoints | Existing visit route file + controller pattern gives the exact template; sub-resource routes added to `visits.routes.js` |
| AIT-03 | Every mutation appends to `history[]` (append-only) and writes one `AuditLog` row with `targetModel: 'ActionItem'` | `visitPlans.controller.js` `audit()` helper is the canonical pattern; `AuditLog.targetModel` enum must be extended |
| AIT-04 | Visit owner, manager/HOD, and account-team members can mark done; other roles get 403 | Role taxonomy from `User.role` enum; inline `canMutateActionItem()` guard pattern needed (no `authorize` middleware covers this compound rule) |
| AIT-05 | Daily cron at 09:00 emits one `action_item_overdue` digest notification per user | `node-cron` not yet installed; `notification.service.js` `createNotification()` is the pattern; `Notification.type` enum must be extended |
| AIT-06 | Indexes on `actionItems.status` and `actionItems.dueDate` for <100ms queries | Mongoose compound and single-field index syntax identified; must be added to both `Visit` and `VisitSchedule` schemas |
</phase_requirements>

---

## Summary

Phase 2 delivers the backend plumbing for Action Items — no frontend touches at all. The domain is well-understood because the codebase already contains strong precedents for every required pattern: embedded sub-documents (see `adminNoteSchema`, `statusHistorySchema`, `followUpMeetingSchema` in Visit.js), append-only history arrays (see `editHistory` and `statusHistory` in Visit.js), AuditLog writes (see the `audit()` helper in visitPlans.controller.js), Notification creation (see notification.service.js `createNotification()`), and role-based guards with compound access logic (see `canAccessPlan()` in visitPlans.controller.js).

The only genuinely new infrastructure is the daily cron job (currently zero cron machinery exists in the server). `node-cron` is the ecosystem standard and is not yet installed — it must be added as a dependency. The `Notification.type` enum and `AuditLog.targetModel` enum are the only existing models that need backward-compatible extension.

The action-item shape is locked by STATE.md: `{ _id, text, assignee, dueDate, status, createdBy, createdAt, history[] }`. History is append-only by compliance requirement — no plan should add edit or delete paths to history entries.

**Primary recommendation:** Embed `actionItems[]` directly in both `Visit` and `VisitSchedule` (not a separate collection), following the same sub-schema pattern used for `adminNotes`, `editHistory`, and `followUpMeetings`. Use `node-cron` for the scheduled digest. Write all AuditLog entries inline in the controller, following the `visitPlans.controller.js` fire-and-forget pattern.

---

## Standard Stack

### Core (already in server/package.json)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| mongoose | 9.2.4 | ODM — sub-schemas, indexes, `$push`, `$pull` | Installed |
| express | 4.22.1 | REST router | Installed |
| jsonwebtoken | 9.0.3 | Auth — `protect` middleware reads httpOnly cookie | Installed |

### New Dependency Required
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-cron | 4.2.1 (latest) | Cron job scheduler for daily digest at 09:00 | Industry default for Node cron; zero native cron API in Node.js; `node-schedule` is an alternative but node-cron is simpler for time-based rules |

**node-cron is NOT currently installed.** Wave 0 of the plan must `npm install node-cron`.

**Installation:**
```bash
cd server && npm install node-cron
```

**Version verification:** `npm view node-cron version` returned `4.2.1` on 2026-05-02. This is current.

---

## Architecture Patterns

### Recommended File Layout for Phase 2
```
server/
├── models/
│   ├── Visit.js              # ADD actionItemSchema sub-schema + actionItems[] field + indexes
│   └── VisitSchedule.js      # ADD actionItems[] field (same sub-schema) + indexes
├── controllers/
│   └── actionItems.controller.js   # NEW — all 4 CRUD handlers + status-change
├── routes/
│   └── visits.routes.js      # ADD sub-resource routes /:id/action-items/*
├── services/
│   └── notification.service.js  # EXTEND — add notifyActionItemOverdue()
└── jobs/
    └── overdueActionItems.job.js  # NEW — cron definition, exported for server.js to require
```

The `server/jobs/` directory does not yet exist — it should be created.

### Pattern 1: Embedded Sub-Schema for actionItemSchema

**What:** Define a Mongoose sub-schema and embed it as an array field on the parent document.
**When to use:** When child documents are always accessed via their parent, never queried standalone, and the child collection is bounded (action items per visit are bounded — not an unbounded write stream).
**Why NOT a separate collection:** The app never needs `ActionItem.find()` across all visits independently — queries are always scoped to a visit or a user's open items. Embedding keeps atomic updates simple.

Canonical example from the existing codebase (Visit.js line 5–11):
```javascript
// Source: server/models/Visit.js (existing adminNoteSchema pattern)
const adminNoteSchema = new mongoose.Schema({
    note:      { type: String, required: true },
    addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt:   { type: Date, default: Date.now }
}, { _id: true });
```

Apply the same pattern for `actionItemHistorySchema` and `actionItemSchema`:
```javascript
// NEW — to be added to Visit.js and referenced in VisitSchedule.js
const actionItemHistorySchema = new mongoose.Schema({
    at:      { type: Date, default: Date.now },
    by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    change:  { type: String, required: true },  // 'created' | 'edited' | 'status_changed' | 'deleted'
    note:    { type: String }                    // optional comment from the actor
}, { _id: true });

const actionItemSchema = new mongoose.Schema({
    text:      { type: String, required: true, trim: true },
    assignee:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueDate:   { type: Date },
    status:    { type: String, enum: ['open', 'done'], default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    history:   [actionItemHistorySchema]         // append-only
}, { _id: true });
```

Add to both `visitSchema` and `visitScheduleSchema`:
```javascript
actionItems: { type: [actionItemSchema], default: [] }
```

**`default: []`** is critical — it satisfies the "no breaking schema changes" constraint from PROJECT.md because all legacy documents will read back `[]` without a migration.

### Pattern 2: Sub-Resource REST Routes

**What:** Nest action-item endpoints under the visit resource.
**When to use:** When child operations always require the parent ID for authorization.

Existing pattern from `visits.routes.js` (line 23–27):
```javascript
// Source: server/routes/visits.routes.js (existing sub-resource pattern)
router.post('/:id/request-unlock', requestVisitUnlock);
router.put('/:id/approve-unlock', authorize('admin', 'superadmin'), approveVisitUnlock);
router.post('/:id/follow-ups', addFollowUpMeeting);
```

New routes to add:
```javascript
// To be added to server/routes/visits.routes.js
router.get('/:id/action-items',              getActionItems);
router.post('/:id/action-items',             createActionItem);
router.put('/:id/action-items/:itemId',      updateActionItem);
router.delete('/:id/action-items/:itemId',   deleteActionItem);
router.put('/:id/action-items/:itemId/status', changeActionItemStatus);
```

Note: all routes sit under the existing `router.use(protect)` so `req.user` is always populated.

### Pattern 3: AuditLog Write (fire-and-forget)

**What:** Write an AuditLog entry after each successful mutation without blocking the response.
**Canonical source:** `visitPlans.controller.js` lines 99–109 — the `audit()` helper function.

```javascript
// Source: server/controllers/visitPlans.controller.js (lines 99-109)
function audit(req, action, plan, extra = {}) {
    AuditLog.create({
        userId: req.user._id,
        action,
        targetId: plan?._id,
        targetModel: 'VisitPlan',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { planTitle: plan?.title, ...extra }
    }).catch(err => console.error('[AuditLog]', err.message));
}
```

Adapt for action items — the `targetModel` must be `'ActionItem'` (requires enum extension) and `targetId` should be the action item's `_id`:
```javascript
// Pattern for actionItems.controller.js
function auditActionItem(req, action, item, visitId, extra = {}) {
    AuditLog.create({
        userId: req.user._id,
        action,                          // e.g. 'ACTION_ITEM_CREATE', 'ACTION_ITEM_STATUS_CHANGE'
        targetId: item?._id,
        targetModel: 'ActionItem',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { visitId, text: item?.text, ...extra }
    }).catch(err => console.error('[AuditLog]', err.message));
}
```

**AuditLog.targetModel enum must be extended** — current enum in AuditLog.js (line 21–28) does not include `'ActionItem'`. Add it.

### Pattern 4: Role-Based Authorization (Compound Guard)

**What:** Custom inline authorization function because the AIT-04 rule is compound: "visit owner OR manager/HOD reviewing OR account-team member."
**When to use:** When `authorize(...roles)` middleware is too coarse and the access rule depends on document ownership.

Existing compound-guard pattern from `visitPlans.controller.js` (lines 30–40):
```javascript
// Source: server/controllers/visitPlans.controller.js (canAccessPlan)
async function canAccessPlan(user, plan) {
    if (!plan) return false;
    if (user.role === 'accounts' || user.role === 'superadmin') return true;
    if (String(plan.owner) === String(user._id)) return true;
    if (user.role === 'admin' || user.role === 'hod') {
        const me = await User.findById(user._id).select('assignedEmployees');
        const ids = (me?.assignedEmployees || []).map(String);
        return ids.includes(String(plan.owner));
    }
    return false;
}
```

For action items the equivalent guard:
```javascript
// Pattern for actionItems.controller.js
async function canMutateActionItem(user, visit) {
    // superadmin and admin can always mutate
    if (user.role === 'superadmin' || user.role === 'admin') return true;
    // visit owner can mutate
    const ownerId = visit.submittedBy?.toString() || visit.submittedBy;
    if (String(ownerId) === String(user._id)) return true;
    // HOD reviewing: must have this user in assignedEmployees
    if (user.role === 'hod') {
        const me = await User.findById(user._id).select('assignedEmployees');
        const ids = (me?.assignedEmployees || []).map(String);
        return ids.includes(String(ownerId));
    }
    // accounts role: read-only across the app (AIT-04 does NOT grant accounts mutate rights)
    return false;
}
```

**Key decision required for AIT-04:** The requirement says "members of the agent's account team." This maps to `admin`/`hod` users who have the visit owner in their `assignedEmployees`. The `accounts` role is read-only per PROJECT.md constraints. Resolve this reading before planning tasks.

### Pattern 5: Notification Creation

**What:** Call `createNotification()` from `notification.service.js` once per recipient.
**Canonical source:** `notification.service.js` lines 33–58.

The `Notification.type` enum currently has 7 values (lines 13–20 of Notification.js) — none match `action_item_overdue`. **The enum must be extended** to include `'action_item_overdue'`.

```javascript
// Source: server/services/notification.service.js (createNotification pattern)
const createNotification = async ({ recipient, type, title, message, claimRef, sendEmailFlag }) => {
    const notification = await Notification.create({
        recipient: recipient._id || recipient,
        type,
        title,
        message,
        claimRef
    });
    // ... optionally sends email
};
```

For the overdue digest, a new `visitRef` field on Notification may be needed (currently only `claimRef` and `visitScheduleRef` exist). Alternatively, pack the visit reference into `details` as a string in the `message`. The simpler approach: add a `visitRef` field to `Notification` schema (additive, non-breaking).

### Pattern 6: Cron Job

**What:** Schedule a daily function at 09:00 server time using `node-cron`.
**When to use:** Any time-based background work independent of HTTP requests.

`node-cron` is not yet installed. The server has no existing cron infrastructure — no `server/jobs/` directory. The pattern is to create a job file and require it from `server.js` at startup (after DB connects).

```javascript
// server/jobs/overdueActionItems.job.js (NEW FILE)
const cron = require('node-cron');
const Visit = require('../models/Visit');
const VisitSchedule = require('../models/VisitSchedule');
const User = require('../models/User');
const { createNotification } = require('../services/notification.service');

function scheduleOverdueDigest() {
    // '0 9 * * *' = 09:00 every day in the server's local timezone
    cron.schedule('0 9 * * *', async () => {
        console.log('[Cron] Running overdue action-item digest...');
        try {
            const now = new Date();
            // ... query logic (see Indexing section below)
        } catch (err) {
            console.error('[Cron] overdueActionItems failed:', err.message);
        }
    });
}

module.exports = { scheduleOverdueDigest };
```

Register in `server.js` after `connectDB()` succeeds:
```javascript
// In server.js, inside the connectDB().then() chain
const { scheduleOverdueDigest } = require('./jobs/overdueActionItems.job');
scheduleOverdueDigest();
```

**Timezone note:** `node-cron` 4.x defaults to the process's local timezone. The server likely runs UTC. To fire at IST 09:00 (UTC+5:30), use cron expression `'30 3 * * *'` (UTC) or pass `{ timezone: 'Asia/Kolkata' }` as a schedule option. Verify server timezone before choosing.

### Pattern 7: MongoDB Indexing for Overdue Queries

**What:** Add sparse/compound indexes on `actionItems.status` and `actionItems.dueDate`.
**Why:** AIT-06 requires overdue and per-agent open-items queries to complete in <100ms.

MongoDB supports indexing into array sub-document fields via dot notation. However, because `actionItems` is an array of sub-documents, a multikey index is used automatically when you index `actionItems.status` or `actionItems.dueDate`.

Indexes to add to `Visit.js`:
```javascript
// Multikey index — queries filtering by actionItems.status
visitSchema.index({ 'actionItems.status': 1 });
// Compound multikey — primary overdue query shape
visitSchema.index({ 'actionItems.status': 1, 'actionItems.dueDate': 1 });
// Per-submittedBy open-items (most common query — agent's own items)
visitSchema.index({ submittedBy: 1, 'actionItems.status': 1 });
```

Same indexes needed on `VisitSchedule.js`.

**Performance note (HIGH confidence):** Multikey indexes on embedded arrays are less efficient than top-level field indexes because each array element generates an index entry. For a bounded array (typically <20 action items per visit) with a realistic data set (hundreds to low thousands of visits), these indexes are sufficient for <100ms. If the dataset grows to tens of thousands of visits with dozens of items each, a separate ActionItem collection or Atlas Search would be needed — but that is out of scope for this milestone.

**Overdue query pattern:**
```javascript
// Aggregate across Visit documents to find open items past dueDate
// Run inside the cron job
const now = new Date();
const overdueVisits = await Visit.find({
    'actionItems.status': 'open',
    'actionItems.dueDate': { $lt: now }
}).select('submittedBy forUser actionItems').lean();
```

Then in the application layer, filter `actionItems` to those with `status === 'open' && dueDate < now`, group by `assignee` (or `submittedBy` as fallback), and emit one digest notification per affected user.

### Anti-Patterns to Avoid

- **Creating a separate ActionItem collection:** Over-engineered for this use case; adds join complexity; all access is parent-scoped.
- **Using the generic `auditLogger` middleware for action-item audit:** The existing `auditLogger.js` middleware fires on every successful mutation and generates action names from the URL path. It will produce `POST_VISITS` instead of `ACTION_ITEM_CREATE`. Prefer the explicit `auditActionItem()` helper pattern from visitPlans.controller.js.
- **Blocking the HTTP response on AuditLog.create:** The existing codebase uses fire-and-forget (`.catch()`). Keep this pattern — AuditLog failures must not fail the main request.
- **Storing history entries as sparse fields (edit/delete possible):** Compliance requirement from STATE.md — append-only, never edit or remove history entries. Do not add `DELETE` or `PUT` endpoints for history entries.
- **Hardcoding UTC in the cron expression:** The server may run UTC while business is IST. Use `node-cron`'s `timezone` option explicitly.
- **Sending individual notification per overdue item:** The requirement says ONE digest notification per user, not one per item. Build the digest in the cron job and emit a single Notification with a summary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scheduled daily job | Custom `setInterval` or `setTimeout` loop | `node-cron` | setInterval drifts; doesn't survive restarts correctly; no cron syntax |
| Unique `_id` on embedded sub-documents | Manual UUID or nanoid generation | Mongoose `{ _id: true }` (default) | Mongoose auto-generates ObjectId `_id` for sub-documents when `_id: true` in schema options — no manual generation needed |
| Authorization for compound role rules | Duplicating role logic per controller | Shared `canMutateActionItem()` helper in the controller file | Deduplicates the logic across create/edit/delete/status-change handlers |
| Notification deduplication | Manual Set-based dedupe | Build the digest once per user in the cron job | The `notification.service.js` `notifyClaimSubmitted` already shows the dedupe-by-Set pattern |

---

## Common Pitfalls

### Pitfall 1: AuditLog targetModel Enum Mismatch
**What goes wrong:** `AuditLog.create({ targetModel: 'ActionItem' })` silently fails or throws a Mongoose `ValidatorError` because `'ActionItem'` is not in the current enum.
**Why it happens:** `AuditLog.js` line 21–28 defines a strict enum. The current values are: `'Visit', 'User', 'FormConfig', 'PinCode', 'VisitPlan', 'VisitSchedule', 'VisitPlanBalance', 'Expense', 'ExpenseClaim', 'ExpenseTemplate', 'Policy', 'Upload', 'Agent', null`.
**How to avoid:** Add `'ActionItem'` to the enum array in `AuditLog.js` before writing any AuditLog in the controller.
**Warning signs:** `[AuditLog] Cast to string failed` or `Validator error` messages in server logs.

### Pitfall 2: Notification.type Enum Mismatch
**What goes wrong:** `Notification.create({ type: 'action_item_overdue' })` throws a Mongoose validation error.
**Why it happens:** `Notification.js` line 10–21 defines a strict enum with 7 values — `'action_item_overdue'` is not in it.
**How to avoid:** Extend the enum in `Notification.js` before the cron job runs.

### Pitfall 3: Mongoose Array Update Operator Confusion
**What goes wrong:** Using `findByIdAndUpdate` with `$set: { 'actionItems': [...] }` (replacing the entire array) instead of `$push` / `$pull` / `$set: { 'actionItems.$[elem].status': 'done' }`.
**Why it happens:** Replacing the full array loses concurrent updates from other operations and is not atomic.
**How to avoid:** Use MongoDB array update operators:
- Adding an item: `$push: { actionItems: newItem }`
- Updating a specific item: `$set: { 'actionItems.$[elem].status': 'done' }` with `arrayFilters: [{ 'elem._id': itemId }]`
- Removing an item: `$pull: { actionItems: { _id: itemId } }`
- Appending to history: `$push: { 'actionItems.$[elem].history': historyEntry }` with `arrayFilters`

### Pitfall 4: History Append Not Atomic With Status Change
**What goes wrong:** Two separate `findByIdAndUpdate` calls — one to update `status` and one to `$push` to `history` — can interleave if the connection drops between them.
**Why it happens:** Developers often split the update into two operations for readability.
**How to avoid:** Combine both updates in a single `findByIdAndUpdate` call using the MongoDB positional operator and multiple update operators:
```javascript
await Visit.findByIdAndUpdate(visitId, {
    $set: { 'actionItems.$[elem].status': newStatus },
    $push: { 'actionItems.$[elem].history': historyEntry }
}, {
    arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(itemId) }],
    new: true
});
```

### Pitfall 5: node-cron Fires Before DB Connects
**What goes wrong:** The cron job tries to query MongoDB before `connectDB()` has finished.
**Why it happens:** If `scheduleOverdueDigest()` is called at module-load time (top of server.js), the cron may fire at 09:00 before a reconnect completes.
**How to avoid:** Call `scheduleOverdueDigest()` inside the `connectDB().then()` callback, not at module load time. The existing server.js pattern already does DB-first initialization (lines 318–335) — follow that pattern.

### Pitfall 6: Multikey Index Compound Limitation
**What goes wrong:** MongoDB cannot use a compound multikey index where more than one indexed field is from the same array. A query like `{ 'actionItems.status': 'open', 'actionItems.dueDate': { $lt: now } }` may not use the compound index efficiently because both fields come from the same `actionItems` array.
**Why it happens:** MongoDB multikey index restriction — compound indexes on two fields from the same array are created but may not be used for all query shapes.
**How to avoid:** Add both a compound index AND individual single-field indexes. MongoDB's query planner will choose the most efficient plan. For the overdue cron (runs once daily), a collection scan is acceptable if indexes aren't optimal — the <100ms requirement is for the per-agent open-items query (which can filter by `submittedBy` first).

---

## Code Examples

### Creating an Action Item (Mongoose array push)
```javascript
// Source: pattern from server/controllers/visitPlans.controller.js (addSchedule)
// Using $push to atomically append to embedded array
const newItem = {
    _id: new mongoose.Types.ObjectId(),
    text: req.body.text,
    assignee: req.body.assignee || null,
    dueDate: req.body.dueDate || null,
    status: 'open',
    createdBy: req.user._id,
    createdAt: new Date(),
    history: [{
        at: new Date(),
        by: req.user._id,
        change: 'created'
    }]
};
const updated = await Visit.findByIdAndUpdate(
    visitId,
    { $push: { actionItems: newItem } },
    { new: true, runValidators: true }
);
```

### Updating a Specific Embedded Item (positional filtered)
```javascript
// MongoDB positional filtered operator — updates one array element by _id
const updated = await Visit.findByIdAndUpdate(
    visitId,
    {
        $set: { 'actionItems.$[elem].text': newText },
        $push: { 'actionItems.$[elem].history': {
            at: new Date(), by: req.user._id, change: 'edited', note: `text changed`
        }}
    },
    {
        arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(itemId) }],
        new: true,
        runValidators: true
    }
);
```

### Status Change (same pattern)
```javascript
const updated = await Visit.findByIdAndUpdate(
    visitId,
    {
        $set: { 'actionItems.$[elem].status': newStatus },
        $push: { 'actionItems.$[elem].history': {
            at: new Date(), by: req.user._id, change: 'status_changed',
            note: `status → ${newStatus}`
        }}
    },
    {
        arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(itemId) }],
        new: true
    }
);
```

### Soft Delete (remove from array)
```javascript
// AIT-02 requires delete support. Use $pull.
// Still write AuditLog before deleting (so targetId is valid).
auditActionItem(req, 'ACTION_ITEM_DELETE', item, visitId);
const updated = await Visit.findByIdAndUpdate(
    visitId,
    { $pull: { actionItems: { _id: new mongoose.Types.ObjectId(itemId) } } },
    { new: true }
);
```

### Overdue Digest Cron Query
```javascript
// Run daily at 09:00
const now = new Date();

// Collect open overdue items from Visit documents
const visitsWithOverdue = await Visit.find({
    'actionItems': {
        $elemMatch: { status: 'open', dueDate: { $lt: now } }
    }
}).select('submittedBy forUser actionItems').lean();

// Build a map: userId -> [overdueItems]
const userMap = new Map();
for (const v of visitsWithOverdue) {
    const overdueItems = v.actionItems.filter(
        i => i.status === 'open' && i.dueDate && i.dueDate < now
    );
    for (const item of overdueItems) {
        const uid = String(item.assignee || v.submittedBy);
        if (!userMap.has(uid)) userMap.set(uid, []);
        userMap.get(uid).push({ visitId: v._id, item });
    }
}

// Emit one notification per user
for (const [uid, items] of userMap) {
    await createNotification({
        recipient: uid,
        type: 'action_item_overdue',
        title: `You have ${items.length} overdue action item${items.length > 1 ? 's' : ''}`,
        message: `${items.length} action item${items.length > 1 ? 's are' : ' is'} past due. Please review your visits.`,
        sendEmailFlag: false   // in-app only per REQUIREMENTS.md Future section
    });
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Custom `setInterval` for background tasks | `node-cron` with cron syntax | Declarative, survives server restarts when registered at startup |
| `$set` on full embedded array | Positional filtered operator `$[elem]` with `arrayFilters` | Atomic, safe for concurrent updates |
| Separate collections for sub-documents | Embedded arrays with `_id: true` sub-schemas | Simpler for bounded, always-parent-accessed data |

---

## Open Questions

1. **"Account team" in AIT-04 — exact mapping**
   - What we know: Requirement says "members of the agent's account team can mark items done."
   - What's unclear: Does "account team" mean the `accounts` role, or `admin`/`hod` users with the visit owner in their `assignedEmployees`? The `accounts` role is read-only elsewhere in the app (PROJECT.md constraints say "accounts is read-only").
   - Recommendation: Treat "account team" as admin/hod with assigned-employee relationship (matching `canAccessPlan` pattern), NOT the `accounts` role. Confirm before implementing AIT-04.

2. **VisitSchedule actionItems vs Visit actionItems — duplication risk**
   - What we know: AIT-01 requires actionItems on BOTH models. A VisitSchedule can link to a Visit via `linkedVisit`.
   - What's unclear: When a visit is created from a schedule, are action items on the schedule carried forward to the visit, or do they live independently?
   - Recommendation: Keep them independent for Phase 2 — the carry-forward behavior is a Phase 5 concern (AH-09: "pre-fill for user review"). This keeps Phase 2 scope clean.

3. **Cron job timezone**
   - What we know: `node-cron` 4.x supports a `timezone` option. Server timezone is unknown (not documented).
   - What's unclear: Is the server running UTC (typical for cloud) or IST?
   - Recommendation: Use `{ timezone: 'Asia/Kolkata' }` in the cron schedule options so the cron fires at 09:00 IST regardless of server timezone. This is safer than hardcoding UTC offset.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server code | Yes | v22.20.0 | — |
| mongoose | Schema changes, queries | Yes | 9.2.4 | — |
| express | REST routes | Yes | 4.22.1 | — |
| node-cron | AIT-05 cron job | **No** | 4.2.1 (registry) | node-schedule (not installed either) |
| MongoDB Atlas | All queries | Assumed yes (server running) | — | — |

**Missing dependencies with no fallback:**
- `node-cron` — must be installed (`npm install node-cron`) in Wave 0 before the cron job task executes.

---

## Model Change Summary

A concise list of every model file that needs modification (for the planner to create discrete tasks):

| Model File | Change | Breaking? |
|------------|--------|-----------|
| `server/models/Visit.js` | Add `actionItemHistorySchema` sub-schema, `actionItemSchema` sub-schema, `actionItems` field (default `[]`), 3 new indexes | No — `default: []` |
| `server/models/VisitSchedule.js` | Add `actionItems` field (same schema ref), 3 new indexes | No — `default: []` |
| `server/models/AuditLog.js` | Add `'ActionItem'` to `targetModel` enum | No — additive |
| `server/models/Notification.js` | Add `'action_item_overdue'` to `type` enum; optionally add `visitRef` field | No — additive |

---

## Validation Architecture

> `workflow.nyquist_validation` key absent from `.planning/config.json` (file not present) — treating as enabled.

### Test Framework
No test framework is currently installed in the server. The codebase has no `server/tests/` directory, no `jest.config.*`, no `vitest.config.*`, and no test script in `server/package.json`.

| Property | Value |
|----------|-------|
| Framework | None installed — Wave 0 must install |
| Recommended | `jest` + `supertest` (industry standard for Express) |
| Quick run | `npx jest --testPathPattern=action-items --forceExit` |
| Full suite | `npx jest --forceExit` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AIT-01 | Visit/VisitSchedule persists actionItems[] with correct shape | unit | `npx jest tests/models/actionItem.model.test.js -x` | No — Wave 0 |
| AIT-02 | CRUD endpoints return correct status codes; 404 for unknown visit/item | integration | `npx jest tests/api/actionItems.api.test.js -x` | No — Wave 0 |
| AIT-03 | Each mutation appends one history entry and creates one AuditLog row | integration | (same file as AIT-02) | No — Wave 0 |
| AIT-04 | Unauthorized role receives 403; authorized role receives 200 | integration | `npx jest tests/api/actionItems.auth.test.js -x` | No — Wave 0 |
| AIT-05 | Cron job creates exactly one notification per user with overdue items | unit | `npx jest tests/jobs/overdueDigest.test.js -x` | No — Wave 0 |
| AIT-06 | Overdue query executes in <100ms on seed dataset | performance smoke | manual + `explain()` log | N/A — manual |

### Wave 0 Gaps
- [ ] `npm install --save-dev jest supertest` in `server/` (no test runner installed)
- [ ] `server/jest.config.js` — Jest config (testEnvironment: node, forceExit)
- [ ] `server/tests/models/actionItem.model.test.js` — covers AIT-01
- [ ] `server/tests/api/actionItems.api.test.js` — covers AIT-02, AIT-03
- [ ] `server/tests/api/actionItems.auth.test.js` — covers AIT-04
- [ ] `server/tests/jobs/overdueDigest.test.js` — covers AIT-05

---

## Sources

### Primary (HIGH confidence)
- `server/models/Visit.js` — existing sub-schema patterns (adminNoteSchema, statusHistorySchema, editHistorySchema, followUpMeetingSchema)
- `server/models/VisitSchedule.js` — field structure, existing indexes
- `server/models/AuditLog.js` — targetModel enum, fire-and-forget create pattern
- `server/models/Notification.js` — type enum, existing fields
- `server/models/User.js` — role enum, assignedEmployees field
- `server/controllers/visitPlans.controller.js` — `audit()` helper pattern, `canAccessPlan()` pattern
- `server/services/notification.service.js` — `createNotification()` API
- `server/routes/visits.routes.js` — sub-resource route patterns
- `server/middleware/auth.middleware.js` — `protect` populates `req.user`
- `server/middleware/role.middleware.js` — `authorize(...roles)` for simple role gates
- `server/server.js` — startup sequence, DB-first initialization
- `server/package.json` — confirmed dependencies; no cron library present
- npm registry `node-cron` — version 4.2.1 confirmed current as of 2026-05-02

### Secondary (MEDIUM confidence)
- MongoDB documentation on multikey indexes and `arrayFilters` positional operator — patterns verified against Mongoose 9.x usage
- `node-cron` v4 `timezone` option — documented in npm registry; timezone support is stable since v3

### Tertiary (LOW confidence — flag for validation)
- Performance estimate for multikey indexes on bounded arrays (<100ms) — based on general MongoDB indexing knowledge; should be validated with `explain()` against actual Atlas dataset before shipping

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — read directly from package.json and live npm registry
- Schema patterns: HIGH — copied from existing model files in the codebase
- AuditLog/Notification patterns: HIGH — read from actual service and model files
- Cron job pattern: MEDIUM — node-cron API is stable but timezone behavior on this specific server needs validation
- Index performance: MEDIUM — bounded array assumption is sound; actual performance depends on dataset size

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (stable domain; node-cron releases are infrequent)

# Phase 3: Action Item Tracker - Frontend & FormConfig Field Type

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Agents and reviewers interact with persisted action items through the dynamic visit form, visit review modal, and dashboard widget. FormBuilder exposes `action_items` as a config-driven field type, and frontend submissions must persist into `Visit.actionItems[]`.

</domain>

<decisions>
## Implementation Decisions

### Tracker Placement
- Use a reusable `ActionItemTracker` component for both form-time draft items and persisted visit review items.
- Render form-time items through `DynamicField` so FormConfig remains the source of truth.
- Render review-time items in `VisitDetailModal`, which is the existing VisitsList detail surface.
- Show dashboard open-item widgets for non-accounts roles only.

### Data Contract
- `action_items` fields must use `id: actionItems` so values land on the existing `Visit.actionItems[]` schema.
- Backend create/update normalizes form-submitted action items with `createdBy`, default assignee, due date, status, and creation history.
- Persisted reviewer edits continue to use the Phase 2 REST sub-resource.

### the agent's Discretion
- Keep styling aligned with the existing current app chrome; deeper Meridian visual polish remains in later UI phases.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DynamicField.jsx` already handles FormConfig field-type switching.
- `VisitDetailModal.jsx` is the existing review/detail surface opened from `VisitsList.jsx`.
- `Dashboard.jsx` already fetches visits and analytics in one dashboard load effect.

### Established Patterns
- Client API calls use `client/src/utils/api.js`.
- Form validation is generated from FormConfig in `visitFormValidation.js`.
- Admin-only assignable users are fetched from `/users/assignable`.

### Integration Points
- `server/routes/visits.routes.js` contains the action item sub-resource.
- `server/controllers/visits.controller.js` create/update visit flows need to accept form-submitted action items.

</code_context>

<specifics>
## Specific Ideas

Use the approved item shape: `{ text, assignee, dueDate, status, history[] }`.

</specifics>

<deferred>
## Deferred Ideas

Notification bell live polling is deferred to the shell/topbar phase because the current layout does not yet use the Phase 1 `NotifBell` primitive.

</deferred>

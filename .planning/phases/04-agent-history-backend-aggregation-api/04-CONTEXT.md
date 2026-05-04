# Phase 4: Agent History - Backend Aggregation & API

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Expose fast, role-gated agent history APIs that return KPI summary, last-five visits, open action item count/items, and paginated full visit history for later UI embedding.

</domain>

<decisions>
## Implementation Decisions

### API Contract
- Add endpoints under existing `/api/agents` router: `GET /:id/history` and `GET /:id/visits`.
- Keep `accounts` as read-only via a response flag; block `home_visit` with 403.
- Reuse `Visit.meta.agentId` as the join key because the visit schema already indexes it.

### Payload Shape
- Summary endpoint returns `{ agent, readOnly, kpis, openItems, visits }`.
- Paginated endpoint returns `{ data, pagination, readOnly }`.
- Visit rows include status, submitted/review dates, submitter, open/done action item counts, and best-available rating.

### the agent's Discretion
- Average rating uses available visit rating fields (`agencyProfile.infraRating`, trainer rating, counsellor rating) until a dedicated rating contract exists.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/controllers/agents.controller.js` already owns agent CRUD.
- `server/routes/agents.routes.js` already mounts protected agent routes.
- `Visit.meta.agentId` is indexed in `server/models/Visit.js`.

### Established Patterns
- Protected routers use `router.use(protect)`.
- Controllers return `{ success, data }` envelopes.
- Invalid ObjectId requests return 400 before DB lookup.

### Integration Points
- Phase 5 UI will call these endpoints from `AgentHistoryCard` and `AgentVisitsDrawer`.

</code_context>

<specifics>
## Specific Ideas

Agent history is hidden from `home_visit`, available read-only for `accounts`, and available to superadmin/admin/user/hod/regional_bdm.

</specifics>

<deferred>
## Deferred Ideas

Fine-grained account-team authorization is deferred until the account-team data relationship is explicit in the data model.

</deferred>

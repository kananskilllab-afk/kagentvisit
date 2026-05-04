# Phase 5: Agent History - UI in PlanModal & ManageAgent

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface agent visit history wherever users select or review an agent: PlanModal, ManageAgent, and NewVisit. Reuse Phase 4 backend endpoints and Phase 3 open-action-item data.

</domain>

<decisions>
## Implementation Decisions

### Shared Components
- Build `AgentHistoryCard` as the reusable embed for KPI row, last visits, and "View all".
- Build `AgentVisitsDrawer` for paginated full history and status filtering.
- Hide the card for `home_visit` role inside the component so all embedding surfaces inherit the guard.

### Integration
- PlanModal renders compact history under each selected directory agent.
- ManageAgent opens a history modal using the same card.
- NewVisit shows compact history when `meta.agentId` is selected.
- NewVisit carries forward prior open action items into the editable `actionItems` form value only when the current form has no items yet.

### the agent's Discretion
- Use the current app card styling for this phase; broader Meridian shell styling remains Phase 6+.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 4 exposes `/agents/:id/history` and `/agents/:id/visits`.
- `AgentAutocomplete` writes `meta.agentId` when selecting an agent in NewVisit.
- `ActionItemTracker` can render carried-forward form values via `actionItems`.

### Established Patterns
- Client uses `api` utility for axios calls.
- Visit planning uses `PlanModal` selected agent state.
- ManageAgent currently edits agents via a modal and list/table actions.

### Integration Points
- `PlanModal.jsx`
- `ManageAgent.jsx`
- `NewVisit.jsx`

</code_context>

<specifics>
## Specific Ideas

`accounts` remains read-only from the backend response. `home_visit` sees no card.

</specifics>

<deferred>
## Deferred Ideas

Full ManageAgent tabbed drawer polish is deferred to Phase 10 admin-surface rebuild.

</deferred>

# Requirements — Milestone v1.1

**Milestone:** Meridian UI + Action Items + Agent History
**Started:** 2026-05-01
**Status:** Mapped — see ROADMAP.md

---

## v1.1 Requirements

### Design System (DS)

- [ ] **DS-01**: Inter + Manrope fonts loaded application-wide via Google Fonts in `client/index.html`
- [ ] **DS-02**: Meridian color palette (navy, blue, gold, green, red, sky, purple, bg, border, text, sub, muted, rowHov) registered in `client/tailwind.config.js` under `meridian.*` namespace
- [ ] **DS-03**: Meridian shadow / radius / typography scale registered as Tailwind utilities
- [ ] **DS-04**: Reusable design primitives (`Card`, `Btn`, `Input`, `Lbl`, `Avatar`, `StatusBadge`, `EmptyState`, `NotifBell`, `RolePill`, `SectionTitle`, `SparkArea`, `SparkBar`, `Icon`) live in `client/src/design/` and consume only Tailwind tokens
- [ ] **DS-05**: A dev-only `/design-system` route renders every primitive in isolation for visual review

### Action Item Tracker — Backend (AIT)

- [ ] **AIT-01**: User can persist `actionItems[]` on a `VisitSchedule` and `Visit` with shape `{ _id, text, assignee, dueDate, status, createdBy, createdAt, history[] }`
- [ ] **AIT-02**: User can add, edit, delete, and change-status action items via `/api/visits/:visitId/action-items` REST endpoints
- [ ] **AIT-03**: Every action item mutation appends to `history[]` (append-only — entries never edited or removed) and writes an `AuditLog` row with `targetModel: 'ActionItem'`
- [ ] **AIT-04**: Visit owner, manager / HOD reviewing the visit, and members of the agent's account team can mark items done; other roles get 403
- [ ] **AIT-05**: A daily cron at 09:00 server time enqueues one digest `Notification` (kind: `action_item_overdue`) per user with pending items past their `dueDate`
- [ ] **AIT-06**: Indexes on `actionItems.status` and `actionItems.dueDate` so the overdue query and per-agent open-items query stay <100ms with realistic data

### Action Item Tracker — Frontend (AITUI)

- [ ] **AITUI-01**: `FormConfig` supports a new field type `action_items` so admins can place the tracker at any step (currently used at "step 10")
- [ ] **AITUI-02**: User filling a visit form via `NewVisit` can add action items one-by-one (Enter to add), edit text inline, set assignee from org users, and set due date
- [ ] **AITUI-03**: Reviewer in `VisitsList` detail drawer sees an "Action Items" tab with a tracker that lets them mark done/undone, write a note (which appends to history), and disclose history per item
- [ ] **AITUI-04**: Admin in `FormBuilder` can drag the new "Action Items" field block onto any step of any form
- [ ] **AITUI-05**: Dashboard surfaces a "My Open Action Items" widget for all roles except `accounts`, showing top-3 + count + deep link to filtered view
- [ ] **AITUI-06**: Overdue items appear in `NotifBell` within 1 minute of cron firing

### Agent History (AH)

- [ ] **AH-01**: User can fetch `GET /api/agents/:agentId/history` returning `{ agent, lastVisitAt, totalVisits, openActionItemsCount, openActionItems[], recentVisits[5], allVisitsCount, lastBdm, avgRating, plansCount }` in <200ms for an agent with 50 visits
- [ ] **AH-02**: User can fetch `GET /api/agents/:agentId/visits?limit=N&offset=M` for paginated full history
- [ ] **AH-03**: `home_visit` role gets 403 on both endpoints; `accounts` gets 200 read-only; other roles allowed
- [ ] **AH-04**: `AgentHistoryCard` component renders KPI row + last-5 visits + "View all" button, hidden from `home_visit` users via role context
- [ ] **AH-05**: `PlanModal` step 2 shows expandable `AgentHistoryCard` under each selected agent
- [ ] **AH-06**: `ManageAgent` detail drawer gains a "History" tab using the same component
- [ ] **AH-07**: `NewVisit` shows a compact `AgentHistoryCard` inline once an agent is selected on the institution step
- [ ] **AH-08**: "View all" opens `AgentVisitsDrawer` with paginated full history and status filter
- [ ] **AH-09**: When opening a NewVisit for an agent who has open items from prior visits, those items are pre-filled (not auto-added) for user review

### UI Rebuild — Shell & Home (UI-S)

- [ ] **UI-S-01**: `Layout.jsx` rebuilt as Meridian sidebar (236px navy, gold active accent) + 58px top bar using design primitives only
- [ ] **UI-S-02**: `Login.jsx` rebuilt with split-pane layout (navy left with stats, form right) matching `newui` mock
- [ ] **UI-S-03**: `Dashboard.jsx` rebuilt with 4 KPI cards + visit-activity chart + status-breakdown card + recent visits table + "My Open Action Items" widget
- [ ] **UI-S-04**: Sidebar collapses to icon-only at <1024px and to drawer at <768px

### UI Rebuild — Visits (UI-V)

- [ ] **UI-V-01**: `VisitsList.jsx` rebuilt with Meridian table, status pills, side detail drawer, search + status chip filter, Export / New Visit buttons
- [ ] **UI-V-02**: `NewVisit.jsx` chrome restyled with Meridian; `StepIndicator` shows gold current / green completed
- [ ] **UI-V-03**: `VisitDetailModal.jsx` rebuilt as Meridian full-screen modal with sticky header

### UI Rebuild — Planning (UI-P)

- [ ] **UI-P-01**: `Calendar.jsx` Month / Week / Day / Agenda views restyled with Meridian event chips and toolbar
- [ ] **UI-P-02**: `PlanModal.jsx` 4-step stepper restyled (gold current, navy completed)
- [ ] **UI-P-03**: `VisitPlanDetail.jsx` overview KPI cards + balance bar + tabs in Meridian style
- [ ] **UI-P-04**: `ScheduleModal.jsx` matches Meridian dialog pattern

### UI Rebuild — Money (UI-M)

- [ ] **UI-M-01**: `Expenses/*` list, `NewClaim` wizard, and `ClaimDetail` rebuilt in Meridian
- [ ] **UI-M-02**: Policy violation banner uses Meridian red alert pattern; submit flow still triggers `policy.evaluateClaim()`
- [ ] **UI-M-03**: Receipt upload zone and templates picker restyled

### UI Rebuild — Admin (UI-A)

- [ ] **UI-A-01**: `ManageAgent.jsx` table + detail drawer restyled (with History tab from AH-06)
- [ ] **UI-A-02**: `SuperAdmin/UserManagement.jsx` restyled with role pills + active dot
- [ ] **UI-A-03**: `FormBuilder.jsx` palette + canvas restyled; `action_items` block in palette
- [ ] **UI-A-04**: `Analytics.jsx` rebuilt with Meridian KPI cards + sparklines + Export PDF

### UI Rebuild — Tail Pages (UI-T)

- [ ] **UI-T-01**: `DailyReport.jsx`, `PostDemoFeedback.jsx`, `PostFieldDay.jsx`, `PostInPersonVisit.jsx`, `Profile.jsx`, `FormsHub.jsx`, `FormsAdmin.jsx` apply Meridian primitives
- [ ] **UI-T-02**: Dead Tailwind classes and unused custom CSS removed from `client/src/index.css`
- [ ] **UI-T-03**: Lighthouse a11y ≥ 90 on dashboard, visits, expenses

---

## Future Requirements

<!-- Deferred to later milestones; captured so they aren't lost. -->

- Action item assignment to non-org users (external partners) — needs identity decision
- Slack / email digest of overdue items (cron currently routes only to in-app notifications)
- Mobile-native experience for action item tracking
- Localization of UI copy
- Dark mode

---

## Out of Scope

- **Mobile-native app** — web-responsive only; no React Native or PWA install flow
- **Dark mode** — Meridian palette is light-mode-only by design
- **Internationalization** — English-only; user base is internal
- **Backwards-compat shims for old visual style** — Meridian replaces, doesn't coexist
- **Retroactive backfill of action items on legacy visits** — they default to `[]` and admins seed forward
- **Migrating Tailwind to a different CSS framework** — keep what works
- **Editable history entries on action items** — append-only by user decision (compliance)
- **Auto-add carry-forward action items on new visits** — pre-fill only, user reviews before saving
- **Re-research of v1.0 domain** — already shipped and validated

---

## Traceability

Generated 2026-05-01 by gsd-roadmapper. Coverage: 47 / 47 REQ-IDs mapped, no orphans, no duplicates.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DS-01 | Phase 1 | Pending |
| DS-02 | Phase 1 | Pending |
| DS-03 | Phase 1 | Pending |
| DS-04 | Phase 1 | Pending |
| DS-05 | Phase 1 | Pending |
| AIT-01 | Phase 2 | Pending |
| AIT-02 | Phase 2 | Pending |
| AIT-03 | Phase 2 | Pending |
| AIT-04 | Phase 2 | Pending |
| AIT-05 | Phase 2 | Pending |
| AIT-06 | Phase 2 | Pending |
| AITUI-01 | Phase 3 | Pending |
| AITUI-02 | Phase 3 | Pending |
| AITUI-03 | Phase 3 | Pending |
| AITUI-04 | Phase 3 | Pending |
| AITUI-05 | Phase 3 | Pending |
| AITUI-06 | Phase 3 | Pending |
| AH-01 | Phase 4 | Pending |
| AH-02 | Phase 4 | Pending |
| AH-03 | Phase 4 | Pending |
| AH-04 | Phase 5 | Pending |
| AH-05 | Phase 5 | Pending |
| AH-06 | Phase 5 | Pending |
| AH-07 | Phase 5 | Pending |
| AH-08 | Phase 5 | Pending |
| AH-09 | Phase 5 | Pending |
| UI-S-01 | Phase 6 | Pending |
| UI-S-02 | Phase 6 | Pending |
| UI-S-03 | Phase 6 | Pending |
| UI-S-04 | Phase 6 | Pending |
| UI-V-01 | Phase 7 | Pending |
| UI-V-02 | Phase 7 | Pending |
| UI-V-03 | Phase 7 | Pending |
| UI-P-01 | Phase 8 | Pending |
| UI-P-02 | Phase 8 | Pending |
| UI-P-03 | Phase 8 | Pending |
| UI-P-04 | Phase 8 | Pending |
| UI-M-01 | Phase 9 | Pending |
| UI-M-02 | Phase 9 | Pending |
| UI-M-03 | Phase 9 | Pending |
| UI-A-01 | Phase 10 | Pending |
| UI-A-02 | Phase 10 | Pending |
| UI-A-03 | Phase 10 | Pending |
| UI-A-04 | Phase 10 | Pending |
| UI-T-01 | Phase 11 | Pending |
| UI-T-02 | Phase 11 | Pending |
| UI-T-03 | Phase 11 | Pending |

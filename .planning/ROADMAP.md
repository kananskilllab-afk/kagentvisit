# ROADMAP — Milestone v1.1 (Meridian UI + Action Items + Agent History)

**Milestone:** v1.1
**Started:** 2026-05-01
**Granularity:** standard (compression-tolerant; the approved blueprint forced 11 phases by feature seam, not by template)
**Source of truth for phase boundaries:** `MERIDIAN_MILESTONE_PLAN.docx` (approved 2026-05-01)
**Coverage:** 47/47 REQ-IDs mapped, no orphans

---

## Phases

- [ ] **Phase 1: Design-System Extraction & Foundation** — Tailwind tokens + primitive library + dev-only `/design-system` route
- [ ] **Phase 2: Action Item Tracker — Backend & Data Model** — `actionItems[]` schema, REST endpoints, append-only history, audit, overdue cron, indexes
- [ ] **Phase 3: Action Item Tracker — Frontend & FormConfig Field Type** — `action_items` field type + NewVisit input + VisitsList review tab + FormBuilder block + dashboard widget + NotifBell
- [ ] **Phase 4: Agent History — Backend Aggregation & API** — `/api/agents/:agentId/history` + paginated visits endpoint with role gating
- [ ] **Phase 5: Agent History — UI in PlanModal & ManageAgent** — `AgentHistoryCard` embedded in PlanModal, NewVisit, ManageAgent, plus carry-forward pre-fill of open items
- [ ] **Phase 6: Layout + Login + Dashboard — Meridian Rebuild** — Sidebar/topbar shell, split-pane Login, KPI Dashboard, responsive collapse
- [ ] **Phase 7: Visits Module — VisitsList + NewVisit + VisitDetailModal** — Meridian table/drawer, restyled stepper, full-screen detail modal
- [ ] **Phase 8: Calendar + PlanModal + VisitPlanDetail** — Meridian Calendar views, plan stepper, plan detail tabs, ScheduleModal
- [ ] **Phase 9: Expenses + Claims + ClaimDetail** — Meridian list/wizard/detail; policy violation banner; receipt upload restyle
- [ ] **Phase 10: ManageAgent + Users + FormBuilder + Analytics** — Admin surfaces restyled with role pills, sparklines, palette
- [ ] **Phase 11: Tail Pages + Cleanup + Regression Sweep** — Remaining pages, dead-CSS purge, Lighthouse a11y ≥ 90

---

## Phase Details

### Phase 1: Design-System Extraction & Foundation
**Goal**: Every downstream phase can build UI from a Tailwind-token primitive library instead of inline styles.
**Depends on**: Nothing (first phase)
**Requirements**: DS-01, DS-02, DS-03, DS-04, DS-05
**Success Criteria** (what must be TRUE):
  1. Inter and Manrope fonts are loaded application-wide and visible on every existing page without per-page imports
  2. Tailwind config exposes a `meridian.*` color, shadow, radius, and typography namespace usable from any component file
  3. Every primitive listed (Card, Btn, Input, Lbl, Avatar, StatusBadge, EmptyState, NotifBell, RolePill, SectionTitle, SparkArea, SparkBar, Icon) renders correctly at the dev-only `/design-system` route
  4. No primitive in `client/src/design/` reads inline styles or non-tokenized colors
**Plans**: TBD
**UI hint**: yes

### Phase 2: Action Item Tracker — Backend & Data Model
**Goal**: Action items can be persisted, mutated, audited, and surfaced to overdue notifications without any frontend yet.
**Depends on**: Phase 1
**Requirements**: AIT-01, AIT-02, AIT-03, AIT-04, AIT-05, AIT-06
**Success Criteria** (what must be TRUE):
  1. `Visit` and `VisitSchedule` documents persist `actionItems[]` with the agreed shape and default-init for legacy rows
  2. Authorized callers can create, edit, status-change, and delete action items via REST; unauthorized roles receive 403
  3. Every mutation appends one entry to that item's `history[]` and writes one `AuditLog` row with `targetModel: 'ActionItem'`
  4. The 09:00 server-time cron emits one `action_item_overdue` digest notification per user with overdue items
  5. Overdue and per-agent open-items queries return in <100ms against a realistic dataset
**Plans**: TBD

### Phase 3: Action Item Tracker — Frontend & FormConfig Field Type
**Goal**: Agents and reviewers interact with action items through the visit form, the review drawer, and the dashboard.
**Depends on**: Phase 2
**Requirements**: AITUI-01, AITUI-02, AITUI-03, AITUI-04, AITUI-05, AITUI-06
**Success Criteria** (what must be TRUE):
  1. Admins can drag an "Action Items" block onto any step of any FormConfig in FormBuilder
  2. An agent filling NewVisit can add items with Enter, edit text inline, set assignee from org users, and set due date
  3. A reviewer in VisitsList sees an "Action Items" tab where marking done/undone or adding a note appends an entry to `history[]` visibly disclosed under each item
  4. Every role except `accounts` sees a "My Open Action Items" widget on the dashboard with top-3, count, and a link to the filtered list
  5. Items that the cron flagged as overdue appear in `NotifBell` within one minute of cron firing
**Plans**: TBD
**UI hint**: yes

### Phase 4: Agent History — Backend Aggregation & API
**Goal**: A single fast endpoint returns the rolled-up history for any agent, with role-correct access.
**Depends on**: Phase 2 (open-items count comes from action-item data)
**Requirements**: AH-01, AH-02, AH-03
**Success Criteria** (what must be TRUE):
  1. `GET /api/agents/:agentId/history` returns the agreed payload (KPIs + last-5 visits + open items) in <200ms for an agent with 50 visits
  2. `GET /api/agents/:agentId/visits?limit=N&offset=M` paginates the full visit history correctly across page boundaries
  3. `home_visit` callers receive 403 on both endpoints, `accounts` receives 200 read-only, and other roles receive 200
**Plans**: TBD

### Phase 5: Agent History — UI in PlanModal & ManageAgent
**Goal**: Anyone planning or reviewing a visit sees prior context for that agent before committing, and can carry forward unfinished work.
**Depends on**: Phase 4, Phase 1 (primitives), Phase 3 (open-items linkage)
**Requirements**: AH-04, AH-05, AH-06, AH-07, AH-08, AH-09
**Success Criteria** (what must be TRUE):
  1. `AgentHistoryCard` renders KPI row + last-5 visits + "View all" wherever embedded, and is hidden from `home_visit` users by role context (not by route guard alone)
  2. `PlanModal` step 2 shows an expandable `AgentHistoryCard` under each selected agent
  3. `ManageAgent` detail drawer exposes a "History" tab using the same component
  4. `NewVisit` shows a compact `AgentHistoryCard` inline once an agent is chosen on the institution step
  5. Opening NewVisit for an agent with prior open items pre-fills those items into the form for review (user can keep, edit, or remove before save) — never auto-added silently
  6. "View all" opens `AgentVisitsDrawer` with paginated full history and status filter working end-to-end
**Plans**: TBD
**UI hint**: yes

### Phase 6: Layout + Login + Dashboard — Meridian Rebuild
**Goal**: First impression of the app — shell, login, and dashboard — runs entirely on Meridian primitives.
**Depends on**: Phase 1, Phase 3 (dashboard widget), Phase 5 (open-items KPI source)
**Requirements**: UI-S-01, UI-S-02, UI-S-03, UI-S-04
**Success Criteria** (what must be TRUE):
  1. `Layout.jsx` renders the 236px navy sidebar with gold active accent and a 58px top bar, built only from `client/src/design/` primitives
  2. `Login.jsx` displays the navy-left/form-right split-pane layout matching the `newui` mock
  3. `Dashboard.jsx` shows 4 KPI cards, a visit-activity chart, a status-breakdown card, a recent-visits table, and the "My Open Action Items" widget
  4. Sidebar collapses to icon-only below 1024px and to a drawer below 768px without layout shift on the main content
**Plans**: TBD
**UI hint**: yes

### Phase 7: Visits Module — VisitsList + NewVisit + VisitDetailModal
**Goal**: The core visit lifecycle screens look and feel Meridian without losing existing functionality.
**Depends on**: Phase 1, Phase 6 (shell), Phase 3 (action items tab in detail)
**Requirements**: UI-V-01, UI-V-02, UI-V-03
**Success Criteria** (what must be TRUE):
  1. `VisitsList.jsx` shows a Meridian table with status pills, a side detail drawer, search + status chip filters, and Export / New Visit buttons that all work
  2. `NewVisit.jsx` chrome is restyled in Meridian and `StepIndicator` shows gold for current step and green for completed
  3. `VisitDetailModal.jsx` renders as a Meridian full-screen modal with a sticky header that stays visible while scrolling
**Plans**: TBD
**UI hint**: yes

### Phase 8: Calendar + PlanModal + VisitPlanDetail
**Goal**: Planning surfaces — calendar, plan creation modal, plan detail — match Meridian.
**Depends on**: Phase 1, Phase 6, Phase 5 (PlanModal embeds AgentHistoryCard)
**Requirements**: UI-P-01, UI-P-02, UI-P-03, UI-P-04
**Success Criteria** (what must be TRUE):
  1. `Calendar.jsx` Month / Week / Day / Agenda views render Meridian event chips and a Meridian toolbar without breaking reschedule, bulk-cancel, or conflict-check
  2. `PlanModal.jsx` 4-step stepper shows gold for current and navy for completed
  3. `VisitPlanDetail.jsx` overview shows KPI cards, a balance bar, and tabs all in Meridian style with no inline styles left
  4. `ScheduleModal.jsx` matches the Meridian dialog pattern (header, body, footer rhythm)
**Plans**: TBD
**UI hint**: yes

### Phase 9: Expenses + Claims + ClaimDetail
**Goal**: Money flow — expenses list, claim creation, claim detail — runs in Meridian without altering the policy engine.
**Depends on**: Phase 1, Phase 6
**Requirements**: UI-M-01, UI-M-02, UI-M-03
**Success Criteria** (what must be TRUE):
  1. `Expenses/*` list, `NewClaim` wizard, and `ClaimDetail` all render Meridian primitives end-to-end
  2. Policy violations show via the Meridian red alert banner; submit still calls `policy.evaluateClaim()` and the result still gates submission
  3. Receipt upload zone and templates picker are restyled and remain functional with Cloudinary uploads
**Plans**: TBD
**UI hint**: yes

### Phase 10: ManageAgent + Users + FormBuilder + Analytics
**Goal**: Admin surfaces — agent directory, user management, form builder, analytics — all in Meridian.
**Depends on**: Phase 1, Phase 6, Phase 5 (ManageAgent History tab), Phase 3 (FormBuilder action_items block)
**Requirements**: UI-A-01, UI-A-02, UI-A-03, UI-A-04
**Success Criteria** (what must be TRUE):
  1. `ManageAgent.jsx` table and detail drawer are restyled and the History tab from Phase 5 is wired in
  2. `SuperAdmin/UserManagement.jsx` renders role pills with an active dot for the current session
  3. `FormBuilder.jsx` palette and canvas are restyled and the `action_items` block is selectable in the palette
  4. `Analytics.jsx` shows Meridian KPI cards with sparklines and an Export PDF action that produces a valid PDF
**Plans**: TBD
**UI hint**: yes

### Phase 11: Tail Pages + Cleanup + Regression Sweep
**Goal**: Every remaining page is on Meridian, dead CSS is gone, and accessibility is verified.
**Depends on**: All prior phases
**Requirements**: UI-T-01, UI-T-02, UI-T-03
**Success Criteria** (what must be TRUE):
  1. `DailyReport.jsx`, `PostDemoFeedback.jsx`, `PostFieldDay.jsx`, `PostInPersonVisit.jsx`, `Profile.jsx`, `FormsHub.jsx`, and `FormsAdmin.jsx` use Meridian primitives only
  2. Unused Tailwind classes and unused custom CSS are removed from `client/src/index.css` (verified by grep + bundle diff)
  3. Lighthouse accessibility score is ≥ 90 on Dashboard, Visits, and Expenses pages
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design-System Extraction & Foundation | 0/0 | Not started | - |
| 2. Action Item Tracker — Backend & Data Model | 0/0 | Not started | - |
| 3. Action Item Tracker — Frontend & FormConfig Field Type | 0/0 | Not started | - |
| 4. Agent History — Backend Aggregation & API | 0/0 | Not started | - |
| 5. Agent History — UI in PlanModal & ManageAgent | 0/0 | Not started | - |
| 6. Layout + Login + Dashboard — Meridian Rebuild | 0/0 | Not started | - |
| 7. Visits Module — VisitsList + NewVisit + VisitDetailModal | 0/0 | Not started | - |
| 8. Calendar + PlanModal + VisitPlanDetail | 0/0 | Not started | - |
| 9. Expenses + Claims + ClaimDetail | 0/0 | Not started | - |
| 10. ManageAgent + Users + FormBuilder + Analytics | 0/0 | Not started | - |
| 11. Tail Pages + Cleanup + Regression Sweep | 0/0 | Not started | - |

---

## Coverage

47 / 47 v1.1 REQ-IDs mapped. No orphans. No duplicates.

| REQ category | Count | Phase |
|--------------|-------|-------|
| DS (Design System) | 5 | Phase 1 |
| AIT (Action Item backend) | 6 | Phase 2 |
| AITUI (Action Item frontend) | 6 | Phase 3 |
| AH-01..03 (Agent History API) | 3 | Phase 4 |
| AH-04..09 (Agent History UI) | 6 | Phase 5 |
| UI-S (Shell + Home) | 4 | Phase 6 |
| UI-V (Visits) | 3 | Phase 7 |
| UI-P (Planning) | 4 | Phase 8 |
| UI-M (Money) | 3 | Phase 9 |
| UI-A (Admin) | 4 | Phase 10 |
| UI-T (Tail + cleanup) | 3 | Phase 11 |

---

*Generated 2026-05-01. Phase boundaries follow `MERIDIAN_MILESTONE_PLAN.docx`.*

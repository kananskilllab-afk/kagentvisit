# Kanan AVS — Agent Visit System

## What This Is

Kanan AVS is a B2B/B2C field-visit management platform for Kanan International. Field agents, managers, HODs, accounts, and superadmins use it to plan visits to overseas-education partner agencies and consultants, capture structured visit reports, manage expense advances and reimbursements against versioned policies, and track activity across cities and teams. The app is a React + Tailwind SPA backed by a Node/Express + MongoDB API.

## Core Value

A field agent must be able to plan a visit, attend it with a structured form, capture expenses, and submit a compliant claim — without losing context across the workflow — and managers must be able to review and approve that flow with a clear audit trail.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Meridian design-system foundation: Inter + Manrope fonts, meridian.* Tailwind tokens, 12 primitive components (Card/Btn/Input/Lbl/Avatar/StatusBadge/EmptyState/NotifBell/RolePill/SectionTitle/SparkArea/SparkBar), Icon+IC catalog, design barrel — Phase 01 (2026-05-02)
- ✓ Visit Plan workflow: VisitPlan + VisitSchedule + VisitPlanBalance with advance → reimbursement lifecycle — v1.0
- ✓ Calendar (Month / Week / Day / Agenda) with reschedule, bulk-cancel, conflict-check — v1.0
- ✓ Dynamic visit forms via FormConfig (admin-configurable steps + fields) — v1.0
- ✓ Expense templates + multi-category claims with Cloudinary uploads — v1.0
- ✓ Policy engine (standard + leadership, versioned) running at submit + approve — v1.0
- ✓ Manage Agents directory with B2B/B2C type, BDM/RM assignment, ranks — v1.0
- ✓ Superadmin User Management with 6 roles (superadmin, admin, user, home_visit, accounts, hod, regional_bdm) — v1.0
- ✓ AuditLog across all major mutations — v1.0
- ✓ Google Calendar sync — v1.0
- ✓ Daily report + Post-Demo / Post-Field-Day / Post-In-Person-Visit specialized forms — v1.0

### Active

<!-- Current scope. Building toward these in v1.1 (Meridian milestone). -->

- [ ] Action Item Tracker on visits — capture, assign, due date, mark done with append-only history
- [ ] Overdue action item notifications + dashboard widget
- [ ] Agent History card surfaced in PlanModal / NewVisit / ManageAgent (last 5 visits + totals + open items)
- [ ] Meridian visual redesign across the entire app (Tailwind tokens, not inline styles)

### Out of Scope

<!-- Explicit boundaries. Reasoning kept to prevent re-adding. -->

- Mobile-native app — web-responsive only; no React Native or PWA install flow this milestone
- Dark mode — Meridian palette is light-mode-only by design
- Internationalization — English-only; user base is internal
- Backwards-compat shims for old visual style — Meridian replaces, doesn't coexist
- Retroactive backfill of action items on legacy visits — they default to `[]` and admins seed forward
- Migrating Tailwind to a different CSS framework — keep what works

## Context

**Tech stack**
- Client: React 18 (Vite), Tailwind CSS, react-router, react-hook-form, axios
- Server: Node.js + Express, Mongoose, JWT auth (httpOnly cookies)
- Storage: MongoDB Atlas, Cloudinary for receipts/photos
- Integrations: Google Calendar API
- Deploy: (not yet captured — confirm with team)

**Codebase shape**
- Client: `client/src/{pages, components, context, utils}`
- Server: `server/{models, controllers, routes, services, middleware, jobs, migration}`
- Models: Visit, VisitPlan, VisitSchedule, VisitPlanBalance, Expense, ExpenseClaim, ExpenseTemplate, Policy, Upload, User, Agent, AuditLog, FormConfig, Notification, DailyReport, Post* forms, PinCode

**Design source for v1.1**
- `newui/AVS Meridian.html` — full HTML preview
- `newui/meridian/{shared,layout,screens1-3}.jsx` — React components in inline-style form (to be ported to Tailwind)
- `MERIDIAN_MILESTONE_PLAN.docx` — phase-by-phase blueprint approved 2026-05-01

**Known issues to address in v1.1**
- Visual style is inconsistent across pages (organic growth from v1.0)
- No way to track follow-up commitments made during a visit
- When planning a visit, no signal showing prior history with that agent

## Constraints

- **Tech stack**: React + Tailwind on client, Mongoose on server — no framework swaps this milestone
- **Compatibility**: No breaking schema changes; all v1.1 model additions must default-init for existing rows
- **Permissions**: 6 roles must be respected for every new endpoint and UI surface (home_visit hidden from agent history; accounts read-only)
- **Performance**: Agent history endpoint must respond <200ms for an agent with 50 visits
- **Audit**: Every action-item mutation goes through AuditLog (compliance requirement carried over from v1.0 policy work)
- **No feature flags long-term**: Meridian rollout may use `?meridian=1` during phases for rollback, but ships unflagged at end of milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Action item shape `{text, assignee, dueDate, status, history[]}` (vs simple text+done) | Append-only history needed for compliance follow-up; assignee+dueDate enables real overdue notifications | — Pending |
| Append-only history on action items (vs editable note) | User chose former for compliance/follow-up auditability | — Pending |
| Tailwind tokens (vs porting inline styles from newui) | Project already on Tailwind; tokens scale better than inline-style soup | — Pending |
| Keep existing logo (don't swap to `newui/logo.png`) | User explicitly chose existing logo | — Pending |
| Hide Agent History from `home_visit` role | Home-visit users don't need agent context (one-shot consumer visits) | — Pending |
| Open action items = pending follow-ups (no separate field) | Reduces schema; the data already says it | — Pending |
| Carry-forward open items as pre-fill (not auto-add) on next visit | Keeps user in control; orchestrator's recommendation accepted | — Pending |
| Phase rebuilds behind `?meridian=1` query flag during P6–P11 | Cheap rollback if visual regressions appear in production | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

## Current Milestone: v1.1 Meridian UI + Action Items + Agent History

**Goal:** Roll out the Meridian visual system across every page while delivering the Action Item Tracker and Agent History features that close known gaps in follow-up tracking and pre-visit context.

**Target features:**
- Action Item Tracker (model, FormConfig field type, NewVisit input, VisitsList review tab, append-only history, overdue notifications, dashboard widget)
- Agent History (aggregation API, AgentHistoryCard component embedded in PlanModal, NewVisit, and ManageAgent)
- Meridian design system (Tailwind tokens + primitive library) applied to every page in the app

---
*Last updated: 2026-05-01 after milestone v1.1 kickoff*

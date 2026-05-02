---
phase: 2
slug: action-item-tracker-backend-data-model
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (server-side) — Wave 0 installs if not present |
| **Config file** | `server/package.json` scripts.test (or Wave 0 adds) |
| **Quick run command** | `cd server && node -e "require('./models/Visit'); console.log('schema OK')"` |
| **Full suite command** | `cd server && npm test 2>/dev/null \|\| echo "no tests yet"` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run schema smoke test
- **After every plan wave:** Run full suite + REST endpoint integration check
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 02-01-01 | 01 | 1 | AIT-01 | schema | `node -e "const V=require('./server/models/Visit'); console.log(!!V.schema.path('actionItems'))"` | ⬜ pending |
| 02-01-02 | 01 | 1 | AIT-01 | schema | `node -e "const VS=require('./server/models/VisitSchedule'); console.log(!!VS.schema.path('actionItems'))"` | ⬜ pending |
| 02-02-01 | 02 | 2 | AIT-02 | rest | curl POST /api/action-items (returns 201) | ⬜ pending |
| 02-02-02 | 02 | 2 | AIT-03 | rest | curl PATCH status → history[] grows | ⬜ pending |
| 02-02-03 | 02 | 2 | AIT-04 | rest | curl without auth → 401; wrong role → 403 | ⬜ pending |
| 02-03-01 | 03 | 3 | AIT-05 | cron | node -e "require('./server/jobs/actionItemCron')" runs without error | ⬜ pending |
| 02-03-02 | 03 | 3 | AIT-06 | perf | explain() on overdue query shows index hit | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/jobs/` directory created
- [ ] `node-cron` installed in server package.json
- [ ] `AuditLog.targetModel` enum extended to include `'ActionItem'`
- [ ] `Notification.type` enum extended to include `'action_item_overdue'`

*These must be in Wave 1 (schema) before controller code can reference them.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cron fires at 09:00 IST | AIT-05 | Time-based trigger | Set system clock or mock node-cron scheduler |
| Notification digest groups correctly per user | AIT-05 | Multi-user setup needed | Create 2 users with overdue items, verify digest sends once per user |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

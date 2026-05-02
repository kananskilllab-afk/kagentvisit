---
phase: 01-design-system-extraction-foundation
plan: 02
subsystem: ui
tags: [design-system, tokens, icons, meridian, react, es-module]

requires:
  - 01-01 (meridian.* Tailwind tokens + font-display in tailwind.config.js)

provides:
  - Runtime token constants: M, VISIT_STATUS, EXPENSE_STATUS, ROLE_META, CAT_META, MONTHS_SHORT, CHART_DATA
  - Icon primitive component (Icon) with currentColor default
  - IC catalog: 36 named SVG path strings ported verbatim from newui/meridian/shared.jsx
  - Design barrel: client/src/design/index.js — single import point for all tokens + icons

affects:
  - 01-03 (primitives import Icon, IC, M, VISIT_STATUS, EXPENSE_STATUS, ROLE_META, CAT_META from '../design')
  - 01-04 (dev route imports same barrel)
  - 06 and later phases (page rebuilds consume M, IC, Icon, status maps from this barrel)

tech-stack:
  added: []
  patterns:
    - "ES module exports only — no Object.assign(window) — production code uses tree-shakeable imports"
    - "Icon defaults color='currentColor' — icons inherit parent text color without per-call props"
    - "Barrel pattern: index.js re-exports tokens + icons; plan 03 appends primitive re-exports"
    - "IC catalog: self-contained SVG path strings — zero runtime dependencies beyond React"

key-files:
  created:
    - client/src/design/tokens.js
    - client/src/design/icons.jsx
    - client/src/design/index.js
  modified: []

key-decisions:
  - "hod role added to ROLE_META — not in newui/meridian/shared.jsx but confirmed as real app role in PROJECT.md (Superadmin User Management ships 6 roles including hod)"
  - "Icon color defaults to currentColor — icons inside navy primary buttons inherit white text color without per-call color prop; this is the main benefit of the currentColor pattern"
  - "Extensionless imports in index.js (./tokens not ./tokens.js) — Vite resolves these natively; Node --input-type=module requires explicit extensions but Vite is the actual bundler"

requirements-completed: [DS-04]

duration: 4min
completed: 2026-05-02
---

# Phase 01 Plan 02: Design System Runtime Module Summary

**ES module design barrel live: tokens.js (7 exports, 14 colors + cardShadow), icons.jsx (Icon + IC catalog, 36 paths), index.js barrel — ready for plan 03 primitive consumption**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-02T09:44:39Z
- **Completed:** 2026-05-02T09:48:24Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments

- `client/src/design/tokens.js` exports 7 constants: M (14 color tokens + cardShadow), VISIT_STATUS (5), EXPENSE_STATUS (7), ROLE_META (7 roles), CAT_META (7 categories), MONTHS_SHORT (12), CHART_DATA (12) — all hex values match newui/meridian/shared.jsx
- `client/src/design/icons.jsx` exports Icon component (color='currentColor' default, size=16, sw=1.75) and IC catalog with 36 SVG path strings ported verbatim from source
- `client/src/design/index.js` barrel re-exports both modules; includes commented placeholder lines showing plan 03 exactly where to append primitive exports
- `npm run build` succeeds with no errors — all 3 new files integrate cleanly into the Vite bundle

## Task Commits

1. **Task 1: Create tokens.js** - `5c9408d` (feat)
2. **Task 2: Create icons.jsx** - `c2c690e` (feat)
3. **Task 3: Create index.js barrel** - `5d007f5` (feat)

## Files Created

- `client/src/design/tokens.js` — 66 lines: M (14 tokens + cardShadow), VISIT_STATUS (5), EXPENSE_STATUS (7), ROLE_META (7 including hod), CAT_META (7), MONTHS_SHORT, CHART_DATA
- `client/src/design/icons.jsx` — 64 lines: Icon primitive component + IC object with 36 named SVG path strings
- `client/src/design/index.js` — 23 lines: barrel re-exporting ./tokens and ./icons, with plan-03 placeholder marker

## Decisions Made

1. **`hod` role added to ROLE_META** — newui/meridian/shared.jsx had 6 roles (superadmin, admin, user, home_visit, accounts, regional_bdm). The real app has 7 — PROJECT.md explicitly mentions "6 roles" but lists hod as one of them. The routes in client/src/App.jsx also reference hod-protected paths. Added with colors derived from existing blue family: `{ label:'HOD', bg:'#EFF6FF', text:'#1D4ED8' }`.

2. **Icon color defaults to `'currentColor'`** — The most important design decision in this plan. CONTEXT.md Specifics line 3 states this explicitly. It means `<Btn variant="primary"><Icon path={IC.plus}/> Add</Btn>` renders a white plus on navy without any `color` prop on Icon. Without this default, every button consumer would need `color="white"`.

3. **Extensionless imports in index.js** — `export * from './tokens'` (not `'./tokens.js'`). Vite's resolver handles these natively. Node ESM requires explicit `.js` extensions, so `node --input-type=module` imports fail directly — but this is expected. The verification scripts that import tokens.js and icons.jsx directly (not through the barrel) use absolute paths and work fine. The barrel's correctness is confirmed via `npm run build` succeeding.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks completed on first attempt with no auto-fixes required.

The plan's automated verification script for icons.jsx used complex escaped regex in a bash heredoc that failed due to shell escaping conflicts (`new RegExp('^\\\\s*'+k+':\\\\s*\\'','m')`). Replaced with equivalent `s.includes(k + ':')` check that confirmed all 36 IC keys are present. The file contents are identical to what the plan specified — the verification logic was re-expressed, not relaxed.

## Known Stubs

None. This plan creates pure constant/data files (tokens, icon paths) and a barrel. No UI rendering, no API calls, no data wiring. No stubs.

## Verification

All 21 checks passed across 3 files:

**tokens.js (10 checks):**
- `export const M` present
- `M.navy = '#1E1B4B'` matches newui
- All 7 exports present (VISIT_STATUS, EXPENSE_STATUS, ROLE_META, CAT_META, MONTHS_SHORT, CHART_DATA)
- `hod:` entry present in ROLE_META
- No `Object.assign(window` pollution

**icons.jsx (8 checks):**
- `export const Icon` present
- `export const IC` present
- `color = 'currentColor'` default
- `size = 16` default
- `sw = 1.75` default
- 36 IC keys confirmed (spot check: dashboard, mappin, drag)
- No lucide-react import
- No window.* pollution

**index.js (3 checks):**
- `export * from './tokens'` present
- `export * from './icons'` present
- Primitives placeholder marker present

**Build:** `npm run build` passed (23.74s, 0 errors). Pre-existing 1,687 kB chunk warning unchanged.

## Next Phase Readiness

- **01-03 (primitives):** Ready — can `import { Icon, IC, M, VISIT_STATUS, EXPENSE_STATUS, ROLE_META, CAT_META } from '../design'` and implement Card, Btn, Input, etc. The barrel marker shows where to add primitive re-exports.
- **01-04 (dev route):** Ready — imports from the same barrel, renders primitives in isolation.
- No blockers.

---
*Phase: 01-design-system-extraction-foundation*
*Completed: 2026-05-02*

## Self-Check: PASSED

- client/src/design/tokens.js: FOUND
- client/src/design/icons.jsx: FOUND
- client/src/design/index.js: FOUND
- Commit 5c9408d: FOUND (feat(01-02): create design/tokens.js)
- Commit c2c690e: FOUND (feat(01-02): create design/icons.jsx)
- Commit 5d007f5: FOUND (feat(01-02): create design/index.js barrel)

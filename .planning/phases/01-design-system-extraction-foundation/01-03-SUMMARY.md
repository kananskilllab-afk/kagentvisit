---
phase: 01-design-system-extraction-foundation
plan: 03
subsystem: ui
tags: [design-system, primitives, tailwind, meridian, react, components]

requires:
  - 01-01 (meridian.* Tailwind tokens + font-display + shadow-meridian-card)
  - 01-02 (tokens.js: M, VISIT_STATUS, EXPENSE_STATUS, ROLE_META; icons.jsx: Icon, IC)

provides:
  - 12 Meridian primitive components at client/src/design/primitives/
  - Card: bg-white rounded-lg shadow-meridian-card wrapper
  - Lbl: 10px uppercase tracking-[0.16em] text-meridian-sub micro-label
  - SectionTitle: flex h2 + action slot with font-display
  - EmptyState: centered icon/title/sub column, icon inherits text-meridian-muted via currentColor
  - Btn: <button> element with 5 variants (primary/secondary/danger/ghost/blue) x 3 sizes (sm/md/lg)
  - Input: h-10 with optional left icon slot, spreads ...rest to native <input>
  - Avatar: dynamic initials (single-word=first 2 chars, multi-word=first letter each), prop-driven bg
  - NotifBell: <button> with aria-label, IC.bell icon, bg-meridian-red count badge
  - StatusBadge: data-map driven bg/text from VISIT_STATUS (default) or custom map prop
  - RolePill: ROLE_META lookup with unknown-role fallback, 9px uppercase pill
  - SparkArea: SVG area chart with linearGradient fill + polyline stroke
  - SparkBar: SVG bar chart with rect elements and opacity gradient
  - Updated barrel client/src/design/index.js re-exporting all 12 + tokens + icons (14 modules total)

affects:
  - 01-04 (dev route renders all 12 primitives in isolation)
  - 06 and later phases (every page rebuild consumes primitives from the barrel)

tech-stack:
  added: []
  patterns:
    - "Tailwind-only static colors: no inline hex for Card/Lbl/SectionTitle/EmptyState/Btn/Input/NotifBell"
    - "Exempted inline styles: Avatar (dynamic color/size props), StatusBadge/RolePill (data-map values), SparkArea/SparkBar (dynamic SVG coords)"
    - "currentColor inheritance: EmptyState/NotifBell/Input icon parents set text-meridian-* so SVG strokes inherit without per-call color props"
    - "Semantic HTML: Btn and NotifBell use <button> (not <div>) for keyboard + screen-reader support"
    - "Avatar single-word initials: first 2 chars per CONTEXT.md (differs from newui which used first letter only)"

key-files:
  created:
    - client/src/design/primitives/Card.jsx
    - client/src/design/primitives/Lbl.jsx
    - client/src/design/primitives/SectionTitle.jsx
    - client/src/design/primitives/EmptyState.jsx
    - client/src/design/primitives/Btn.jsx
    - client/src/design/primitives/Input.jsx
    - client/src/design/primitives/Avatar.jsx
    - client/src/design/primitives/NotifBell.jsx
    - client/src/design/primitives/StatusBadge.jsx
    - client/src/design/primitives/RolePill.jsx
    - client/src/design/primitives/SparkArea.jsx
    - client/src/design/primitives/SparkBar.jsx
  modified:
    - client/src/design/index.js

key-decisions:
  - "Btn uses <button> not <div>: newui mock used <div> for expediency; production must use <button> for keyboard navigation and disabled state support"
  - "NotifBell uses <button> + aria-label: semantic button with dynamic aria-label ('N unread notifications' or 'Notifications')"
  - "Avatar single-word initials = first 2 chars: CONTEXT.md Specifics explicitly requires this; newui used first-letter-only (diverged from spec)"
  - "text-meridian-muted on EmptyState icon parent: Icon renders <svg> which ignores className; parent div inherits text color to SVG via currentColor"
  - "Btn danger uses Tailwind arbitrary [#FEF2F2]/[#FECACA]: these are canonical Meridian danger colors from newui, not in meridian.* namespace, but expressed as Tailwind arbitrary values (not inline style)"

requirements-completed: [DS-04]

duration: ~8min
completed: 2026-05-02
---

# Phase 01 Plan 03: Meridian Primitive Components Summary

**12 Meridian primitive components authored as Tailwind-native React exports — Card through SparkBar — all ported from newui/meridian/ and converted from inline styles to meridian-* utility classes; barrel updated to 14 re-exports**

## Performance

- **Duration:** ~8 min
- **Completed:** 2026-05-02
- **Tasks:** 3
- **Files created:** 12 (primitives) + 1 modified (barrel)

## Accomplishments

- All 12 Meridian primitives created at `client/src/design/primitives/` — Card (11 lines), Lbl (10), SectionTitle (11), EmptyState (13), Btn (39), Input (28), Avatar (30), NotifBell (19), StatusBadge (19), RolePill (19), SparkArea (34), SparkBar (28)
- Zero inline hex static colors in 7 of 12 primitives (Card, Lbl, SectionTitle, EmptyState, Btn, Input, NotifBell, SectionTitle)
- Inline style used in exactly 5 files, all explicitly exempted per CONTEXT.md (Avatar: dynamic bg/size props; StatusBadge/RolePill: data-map values; SparkArea/SparkBar: dynamic SVG coordinates)
- `client/src/design/index.js` barrel updated: commented placeholder lines replaced with active `export * from './primitives/<Name>'` for all 12; barrel now re-exports 14 modules (tokens + icons + 12 primitives)
- `npm run build` passes with 0 errors — pre-existing 1,687 kB chunk warning unchanged

## Task Commits

1. **Task 1: Card, Lbl, SectionTitle, EmptyState** - `755b374` (feat)
2. **Task 2: Btn, Input, Avatar, NotifBell** - `90a35ff` (feat)
3. **Task 3: StatusBadge, RolePill, SparkArea, SparkBar + barrel update** - `4643cef` (feat)

## Files Created

| File | Lines | Key classes / patterns |
|------|-------|----------------------|
| `primitives/Card.jsx` | 11 | `bg-white rounded-lg shadow-meridian-card` |
| `primitives/Lbl.jsx` | 10 | `text-meridian-sub text-[10px] uppercase tracking-[0.16em]` |
| `primitives/SectionTitle.jsx` | 11 | `text-meridian-text font-display`, action slot |
| `primitives/EmptyState.jsx` | 13 | `bg-meridian-bg text-meridian-muted` on icon parent |
| `primitives/Btn.jsx` | 39 | 5 variants × 3 sizes, `<button>`, `bg-meridian-navy/blue` |
| `primitives/Input.jsx` | 28 | `h-10 border-meridian-border`, icon slot, `...rest` spread |
| `primitives/Avatar.jsx` | 30 | Dynamic `background`/`width`/`height` inline (exempt), initials logic |
| `primitives/NotifBell.jsx` | 19 | `<button>` + `aria-label`, `IC.bell`, `bg-meridian-red` badge |
| `primitives/StatusBadge.jsx` | 19 | `VISIT_STATUS` default map, `s.bg`/`s.text` inline (exempt) |
| `primitives/RolePill.jsx` | 19 | `ROLE_META` lookup + fallback, `r.bg`/`r.text` inline (exempt) |
| `primitives/SparkArea.jsx` | 34 | `<linearGradient>`, `<polygon>`, `<polyline>`, SVG inline (exempt) |
| `primitives/SparkBar.jsx` | 28 | `<rect>` mapped over data, SVG inline (exempt) |

## Decisions Made

1. **`Btn` uses `<button>` not `<div>`** — The newui mock used a `<div>` for expediency (inline-style prototype only). Production primitives must use `<button>` to get keyboard focus, `disabled` attribute support, and correct screen reader semantics without extra ARIA. This is the most important a11y correction in this plan.

2. **`NotifBell` uses `<button>` + `aria-label`** — Same rationale as Btn. Added dynamic `aria-label`: `"N unread notifications"` when count > 0, `"Notifications"` otherwise. Users with screen readers get count feedback without visual inspection.

3. **Avatar single-word initials = first 2 chars** — CONTEXT.md Specifics line 4 explicitly states "single word → first 2 chars." The newui reference (`name.split(' ').slice(0,2).map(w=>w[0])`) produces only 1 letter for single-word names. CONTEXT.md takes precedence. Implementation: `words.length === 1 ? words[0].slice(0, 2).toUpperCase()`.

4. **`text-meridian-muted` on EmptyState icon wrapper div** — `Icon` renders a bare `<svg>` element and ignores `className` prop. To make the SVG stroke muted, the parent div sets `text-meridian-muted` so `currentColor` (the default Icon stroke) inherits. This is the pattern CONTEXT.md recommends ("icons inherit parent text color without per-call color props").

5. **`Btn` danger uses Tailwind arbitrary values `bg-[#FEF2F2]` / `border-[#FECACA]`** — These are the canonical Meridian danger-button colors from newui. They are not in the `meridian.*` Tailwind namespace (which focuses on functional tokens), but are expressed as Tailwind arbitrary values in the class string — not as inline `style={{}}`. This satisfies the "no inline hex static colors" constraint while preserving exact newui colors.

## Deviations from Plan

None — plan executed exactly as written. All component code copied verbatim from plan spec with no adjustments needed.

The plan's automated verification script (single-line node -e with complex escaping) had shell escaping conflicts in PowerShell/bash on Windows. Replaced with equivalent multi-line verification scripts that check the same conditions. The file contents match the plan specification exactly — only the verification script form differed.

## Inline-Style Audit

Files where `style={{}}` is present and why (all explicitly exempted by CONTEXT.md Specifics):

| File | Inline style content | Reason for exemption |
|------|---------------------|---------------------|
| `Avatar.jsx` | `width`, `height`, `borderRadius`, `background`, `fontSize` | All driven by `size` and `color` props — dynamic, cannot be expressed as Tailwind utilities |
| `StatusBadge.jsx` | `background: s.bg`, `color: s.text`, `letterSpacing: 0.4` | `s.bg`/`s.text` are runtime values from a JS data map (VISIT_STATUS/EXPENSE_STATUS) |
| `RolePill.jsx` | `background: r.bg`, `color: r.text`, `letterSpacing: 0.5` | `r.bg`/`r.text` are runtime values from ROLE_META lookup |
| `SparkArea.jsx` | `height: ${height}px` on `<svg>` | Dynamic SVG dimension driven by `height` prop |
| `SparkBar.jsx` | `height: ${height}px` on `<svg>` | Dynamic SVG dimension driven by `height` prop |

SVG attributes `x`, `y`, `width`, `height`, `fill`, `stroke`, `opacity` on SVG children (`<rect>`, `<polygon>`, `<polyline>`) are SVG presentation attributes, not React `style` props — they are computed from data and are canonical SVG.

## Updated Barrel Exports

`client/src/design/index.js` now resolves 21 named symbols:

| Source | Exports |
|--------|---------|
| `./tokens` | `M`, `VISIT_STATUS`, `EXPENSE_STATUS`, `ROLE_META`, `CAT_META`, `MONTHS_SHORT`, `CHART_DATA` |
| `./icons` | `Icon`, `IC` |
| `./primitives/Card` | `Card` |
| `./primitives/Btn` | `Btn` |
| `./primitives/Input` | `Input` |
| `./primitives/Lbl` | `Lbl` |
| `./primitives/Avatar` | `Avatar` |
| `./primitives/StatusBadge` | `StatusBadge` |
| `./primitives/EmptyState` | `EmptyState` |
| `./primitives/NotifBell` | `NotifBell` |
| `./primitives/RolePill` | `RolePill` |
| `./primitives/SectionTitle` | `SectionTitle` |
| `./primitives/SparkArea` | `SparkArea` |
| `./primitives/SparkBar` | `SparkBar` |

## Known Stubs

None. All 12 primitives are pure, fully implemented UI components — no data wiring, no API calls, no placeholder text. StatusBadge/RolePill/SparkArea/SparkBar accept real data via props and render correctly.

## Verification

All checks passed:
- 12 primitive files exist with matching named exports
- No lucide-react imports anywhere in `client/src/design/`
- No inline hex static colors in Card, Lbl, SectionTitle, EmptyState, Btn, Input, NotifBell, SectionTitle
- Barrel re-exports all 12 primitives + tokens + icons
- `npm run build` passes (0 errors, pre-existing chunk warning)

---
*Phase: 01-design-system-extraction-foundation*
*Completed: 2026-05-02*

## Self-Check: PASSED

- client/src/design/primitives/Card.jsx: FOUND
- client/src/design/primitives/Btn.jsx: FOUND
- client/src/design/primitives/Input.jsx: FOUND
- client/src/design/primitives/Lbl.jsx: FOUND
- client/src/design/primitives/Avatar.jsx: FOUND
- client/src/design/primitives/StatusBadge.jsx: FOUND
- client/src/design/primitives/EmptyState.jsx: FOUND
- client/src/design/primitives/NotifBell.jsx: FOUND
- client/src/design/primitives/RolePill.jsx: FOUND
- client/src/design/primitives/SectionTitle.jsx: FOUND
- client/src/design/primitives/SparkArea.jsx: FOUND
- client/src/design/primitives/SparkBar.jsx: FOUND
- client/src/design/index.js: FOUND (barrel updated)
- 01-03-SUMMARY.md: FOUND
- Commit 755b374: FOUND (feat(01-03): Card, Lbl, SectionTitle, EmptyState)
- Commit 90a35ff: FOUND (feat(01-03): Btn, Input, Avatar, NotifBell)
- Commit 4643cef: FOUND (feat(01-03): StatusBadge, RolePill, SparkArea, SparkBar + barrel)

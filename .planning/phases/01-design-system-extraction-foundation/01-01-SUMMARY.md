---
phase: 01-design-system-extraction-foundation
plan: 01
subsystem: ui
tags: [tailwind, google-fonts, inter, manrope, design-tokens, meridian]

requires: []

provides:
  - Google Fonts (Inter 300-800, Manrope 500-900) loaded app-wide via index.html preconnect + stylesheet links
  - Tailwind meridian.* color namespace (14 tokens: navy/blue/gold/green/red/sky/purple/bg/white/border/text/sub/muted/row-hov)
  - Tailwind font-display family (Manrope-first fallback stack)
  - Tailwind shadow-meridian-card box shadow
  - All bg-meridian-*, text-meridian-*, font-display, shadow-meridian-card utility classes now resolve in CSS output

affects:
  - 01-02 (design/tokens.js + icons.jsx consume meridian color hex values)
  - 01-03 (primitive components rely on bg-meridian-*, shadow-meridian-card, font-display classes)
  - 01-04 (design-system route renders primitives that use these utilities)
  - 06 and later phases (every page rebuild consumes these Tailwind utility classes)

tech-stack:
  added: []
  patterns:
    - "Meridian namespace isolation: all new design tokens live under meridian.* to avoid collision with brand-* and kanan-* classes already in use"
    - "font-display idiom: Tailwind fontFamily.display maps Manrope-first; consumed as class font-display on headings and KPI numbers"
    - "Additive config: never remove existing keys — only extend — guarantees existing pages keep working during incremental migration"

key-files:
  created: []
  modified:
    - client/index.html
    - client/tailwind.config.js

key-decisions:
  - "Chose class name font-display (not font-manrope) — idiomatic Tailwind convention; future-proof if the display typeface changes from Manrope"
  - "Used CSS2 Google Fonts endpoint without version pinning — Google manages font versioning per CONTEXT.md recommendation"
  - "row-hov token uses kebab-case in Tailwind config (row-hov) even though shared.jsx uses camelCase (rowHov) — Tailwind requires kebab for utility class bg-meridian-row-hov"

patterns-established:
  - "Meridian color tokens live at theme.extend.colors.meridian.* — subsequent plans import hex values from tokens.js which mirrors these exact values"
  - "Fonts loaded once in index.html head — no per-page or per-component Google Fonts imports"

requirements-completed: [DS-01, DS-02, DS-03]

duration: 2min
completed: 2026-05-02
---

# Phase 01 Plan 01: Design System Foundation Tokens Summary

**Meridian Tailwind token layer wired: 14 color tokens under meridian.*, font-display (Manrope-first), shadow-meridian-card, and Google Fonts loaded app-wide via index.html preconnect**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-02T09:40:21Z
- **Completed:** 2026-05-02T09:41:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Inter (weights 300-800) and Manrope (weights 500-900) load on every page via three link tags in index.html head — no per-page imports required
- All 14 Meridian color tokens added to tailwind.config.js under `meridian.*` namespace; every bg-meridian-*, text-meridian-*, border-meridian-* utility class now resolves
- `font-display` (Manrope-first) and `shadow-meridian-card` added; all existing brand-*, kanan-*, shadow-card, animations, and gradients remain intact
- `npm run build` succeeds — no Tailwind config errors, no broken existing pages

## Task Commits

1. **Task 1: Add Google Fonts (Inter + Manrope) to client/index.html** - `36a6422` (feat)
2. **Task 2: Extend tailwind.config.js with meridian.* tokens, font-display, shadow-meridian-card** - `5f25daf` (feat)

## Files Created/Modified

- `client/index.html` — Added three link tags: preconnect to fonts.googleapis.com, preconnect to fonts.gstatic.com (crossorigin), stylesheet for Inter:wght@300;400;500;600;700;800 and Manrope:wght@500;600;700;800;900 via CSS2 endpoint
- `client/tailwind.config.js` — Added meridian color namespace (14 tokens), fontFamily.display (Manrope-first), boxShadow.meridian-card

## Decisions Made

1. **`font-display` over `font-manrope`** — Chose idiomatic Tailwind convention (`font-display`) rather than a typeface-coupled name (`font-manrope`). If the display face is ever swapped from Manrope to another typeface, the utility class name stays the same; only the config changes. This is explicitly noted in CONTEXT.md as "Claude's Discretion."

2. **No Google Fonts version pinning** — Used the current CSS2 endpoint without locking a specific font snapshot. Google Fonts manages versioning and cache busting. Pinning would require periodic manual updates with no benefit.

3. **Kebab-case `row-hov` in config** — `shared.jsx` uses camelCase `rowHov` in the JS M object. Tailwind config must use kebab-case keys for utility class generation to produce `bg-meridian-row-hov` (not `bg-meridian-rowHov`). The Tailwind class name takes precedence; tokens.js will mirror the same hex value under camelCase for runtime JS consumers.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Both automated verification scripts passed on first run. Build succeeded with no Tailwind errors. The chunk size warning in the build output (`index-C4PzAA-H.js: 1,687.87 kB`) is a pre-existing issue unrelated to this plan's changes.

## User Setup Required

None — no external service configuration required. Google Fonts loads client-side via CDN; no API keys or environment variables needed.

## Next Phase Readiness

- **01-02 (tokens.js + icons.jsx):** Ready — can import hex values from shared.jsx knowing the Tailwind class equivalents are now live
- **01-03 (primitives):** Ready — Card, Btn, Input, etc. can reference `bg-meridian-white`, `shadow-meridian-card`, `font-display` knowing they resolve
- **01-04 (design-system route):** Ready — primitives will render correctly in the preview route
- No blockers

## Verification

Utility classes confirmed to resolve (automated check, 21 assertions passed):
- `bg-meridian-navy` → `#1E1B4B`
- `bg-meridian-blue` → `#3B82F6`
- `bg-meridian-gold` → `#F59E0B`
- `bg-meridian-green` → `#10B981`
- `bg-meridian-red` → `#EF4444`
- `bg-meridian-sky` → `#0EA5E9`
- `bg-meridian-purple` → `#8B5CF6`
- `bg-meridian-bg` → `#F1F5F9`
- `bg-meridian-white` → `#FFFFFF`
- `bg-meridian-border` → `#E2E8F0`
- `text-meridian-text` → `#0F172A`
- `text-meridian-sub` → `#64748B`
- `text-meridian-muted` → `#94A3B8`
- `bg-meridian-row-hov` → `#F8FAFC`
- `font-display` → Manrope-first font stack
- `shadow-meridian-card` → `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`

Existing keys confirmed preserved: `brand.*`, `kanan.*`, `card`, `card-hover`, `glass`, `sidebar`, `nav`, `glow` shadows, `fade-in`, `slide-up`, `slide-down`, `pulse-slow` animations, `brand-gradient`, `gold-gradient`, `soft-mesh` gradients, `font-sans` (Inter-first).

---
*Phase: 01-design-system-extraction-foundation*
*Completed: 2026-05-02*

## Self-Check: PASSED

- client/index.html: FOUND
- client/tailwind.config.js: FOUND
- .planning/phases/01-design-system-extraction-foundation/01-01-SUMMARY.md: FOUND
- Commit 36a6422: FOUND (feat(01-01): add Google Fonts)
- Commit 5f25daf: FOUND (feat(01-01): extend tailwind.config.js)

# Phase 1: Design-System Extraction & Foundation — Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Source:** PRD Express Path — derived from `MERIDIAN_MILESTONE_PLAN.docx` Phase 1 section (approved 2026-05-01) + `newui/meridian/{shared,layout}.jsx`

<domain>
## Phase Boundary

This phase establishes the Meridian design language as a reusable, Tailwind-native primitive set. Every following phase (P2–P11) consumes the same building blocks. **No consumer-side migration happens in this phase** — existing pages keep working unchanged. Only foundation: fonts, Tailwind tokens, primitives library, and a dev-only preview route.

**In scope:**
- Loading Inter (300–800) + Manrope (500–900) via Google Fonts
- Extending `client/tailwind.config.js` with the Meridian color/shadow/radius/font scale under `meridian.*` namespace
- Creating `client/src/design/` module with tokens, icons, and primitive components
- Adding a dev-only `/design-system` route that renders every primitive

**Out of scope (deferred to later phases):**
- Migrating any existing page to use new primitives (P6+ does this page-by-page)
- Touching `client/src/index.css` global styles (P11)
- Replacing the existing logo (user explicitly chose to keep current)
- Server-side changes (none needed)

</domain>

<decisions>
## Implementation Decisions

### Styling approach (LOCKED)
- Tailwind tokens, not inline styles. The newui mock uses inline styles; we port them to Tailwind config + utility classes.
- Namespace under `meridian.*` (e.g. `bg-meridian-navy`) to avoid colliding with existing `brand-*` classes.
- Existing `brand-*` classes remain functional; no removal in P1.

### Color palette (LOCKED — copied from `newui/meridian/shared.jsx`)
| Token            | Hex      | Usage                                  |
|------------------|----------|----------------------------------------|
| `meridian-navy`  | `#1E1B4B`| Sidebar bg, primary buttons, headings  |
| `meridian-blue`  | `#3B82F6`| Accents, secondary CTAs                |
| `meridian-gold`  | `#F59E0B`| Active-state accent, focus highlights  |
| `meridian-green` | `#10B981`| Success states                         |
| `meridian-red`   | `#EF4444`| Error / destructive                    |
| `meridian-sky`   | `#0EA5E9`| Info chips                             |
| `meridian-purple`| `#8B5CF6`| Tertiary accent                        |
| `meridian-bg`    | `#F1F5F9`| Page background                        |
| `meridian-white` | `#FFFFFF`| Card surfaces                          |
| `meridian-border`| `#E2E8F0`| Default borders                        |
| `meridian-text`  | `#0F172A`| Primary text                           |
| `meridian-sub`   | `#64748B`| Secondary text                         |
| `meridian-muted` | `#94A3B8`| Placeholder / muted text               |
| `meridian-row-hov` | `#F8FAFC` | Table row hover                      |

### Shadows / radius / typography (LOCKED)
- `shadow-meridian-card`: `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- Border radius scale matches Meridian usage: `rounded-md=6`, `rounded-lg=7`, `rounded-xl=8` already in Tailwind defaults — no override needed
- `font-display`: `['Manrope', 'Inter', 'system-ui', 'sans-serif']` — used for headings/KPI numbers
- `font-sans`: `['Inter', 'system-ui', 'sans-serif']` — default body
- Letter spacing: keep Tailwind defaults; rely on inline `tracking-*` classes per primitive

### Fonts (LOCKED)
- Load both Inter (weights 300, 400, 500, 600, 700, 800) and Manrope (weights 500, 600, 700, 800, 900) from Google Fonts
- Preconnect to `fonts.googleapis.com` and `fonts.gstatic.com` (with `crossorigin`)
- Use latest Google Fonts URL as of 2026-05; do NOT pin to a specific font version (Google handles this)

### Primitives — file layout (LOCKED)
```
client/src/design/
├── index.js                   # barrel export
├── tokens.js                  # JS constants for runtime use (charts, dynamic styles)
├── icons.jsx                  # IC catalog + Icon primitive (ported from newui/meridian/shared.jsx)
└── primitives/
    ├── Card.jsx
    ├── Btn.jsx
    ├── Input.jsx
    ├── Lbl.jsx
    ├── Avatar.jsx
    ├── StatusBadge.jsx
    ├── EmptyState.jsx
    ├── NotifBell.jsx
    ├── RolePill.jsx
    ├── SectionTitle.jsx
    ├── SparkArea.jsx
    └── SparkBar.jsx
```

### Primitive API contracts (LOCKED — match newui/meridian/shared.jsx)
- **`<Card>`**: `{ children, className }` — wraps children in `bg-white rounded-lg shadow-meridian-card`
- **`<Btn>`**: `{ children, onClick, variant, size, icon, className }` with variants `primary | secondary | danger | ghost | blue` and sizes `sm | md | lg`
- **`<Input>`**: `{ value, onChange, type, placeholder, icon, className }` — 40px height default, icon slot left
- **`<Lbl>`**: `{ children }` — uppercase 10px tracking-wider muted label
- **`<Avatar>`**: `{ name, size, color }` — initials computed from `name.split(' ').slice(0,2)`
- **`<StatusBadge>`**: `{ status, map }` with default `map={VISIT_STATUS}` — exposes `VISIT_STATUS`, `EXPENSE_STATUS` maps
- **`<EmptyState>`**: `{ icon, title, sub }`
- **`<NotifBell>`**: `{ count }` — count badge over bell icon
- **`<RolePill>`**: `{ role }` — looks up `ROLE_META`
- **`<SectionTitle>`**: `{ children, action }`
- **`<SparkArea>`** / **`<SparkBar>`**: `{ data, color, height, uid }` — SVG charts

### `tokens.js` exports (LOCKED)
- `M` object: same shape as newui (navy, blue, gold, …) — for runtime style consumers (charts, dynamic colors)
- `VISIT_STATUS`, `EXPENSE_STATUS`, `ROLE_META`, `CAT_META`: same shape as newui (with `home_visit`, `accounts`, `hod`, `regional_bdm` roles preserved)
- `MONTHS_SHORT`, `CHART_DATA` (mock array) — used by SparkBar/SparkArea defaults

### Icons (LOCKED)
- Port the entire `IC` catalog from `newui/meridian/shared.jsx` — 30+ icon paths
- Export as `IC` constant + named individual exports (`IcDashboard`, `IcCalendar`, etc.) so consumers can tree-shake
- `Icon` primitive: `{ path, size=16, color='currentColor', sw=1.75, fill='none' }`

### `/design-system` route (LOCKED)
- Mounted only when `import.meta.env.DEV` is `true` — does NOT ship in prod build
- Renders every primitive in isolation, grouped by category (Foundations / Buttons / Inputs / Status / Charts / Icons)
- One section per primitive with: name, props table, live render, code example
- No router-guard required since dev-only

### Backwards compat (LOCKED)
- Do NOT touch any existing page component. Existing pages still use `brand-*` classes from current Tailwind config; those classes remain valid.
- Do NOT remove anything from current Tailwind config. We add to it.
- Do NOT touch `client/src/index.css` global styles (P11 cleanup phase).

### Claude's Discretion
- Exact Tailwind class names for fonts (e.g. `font-display` vs `font-manrope`) — pick whichever feels idiomatic, document in PLAN.md
- Whether `/design-system` route uses query-flag (`?design=1`) or path (`/design-system`) — recommend path (simpler)
- Whether to add Storybook (no — overkill for this size; the dev route is enough)
- Test strategy: visual smoke only via dev route — no Vitest snapshots (low ROI for primitive components this early)
- Whether to add a `<DesignSystemProvider>` context or rely on Tailwind classes — prefer Tailwind only (no extra runtime cost)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reference implementation (source of truth for visual + component shape)
- `newui/meridian/shared.jsx` — color tokens, IC icons, primitives (Card, Btn, Input, Lbl, Avatar, StatusBadge, EmptyState, SparkArea, SparkBar, mock data)
- `newui/meridian/layout.jsx` — Sidebar (NotifBell), TopBar, RolePill, AppShell — but only the *primitive* parts go in P1, the layout itself is P6

### Existing config to extend
- `client/tailwind.config.js` — current Tailwind config; add `meridian` to colors/fontFamily/boxShadow without removing existing `brand-*` keys
- `client/index.html` — add Google Fonts preconnect + stylesheet links
- `client/src/App.jsx` — add `/design-system` dev-only route

### Project guidelines
- `CLAUDE.md` (if present at project root) — follow project-specific guidelines
- `.planning/PROJECT.md` — Constraints section (no framework swaps, role taxonomy, audit requirements)

</canonical_refs>

<specifics>
## Specific Ideas

- The user emphasized "Tailwind, not inline styles" — every primitive's visual output must use Tailwind utility classes. Inline `style={{}}` is allowed only for dynamic values that cannot be expressed as Tailwind classes (e.g. SparkBar SVG `<rect>` y-coordinate, dynamic Avatar background color from a prop).
- Primitive components must render correctly even if a consumer forgets to wrap the app in any provider. They are pure props-in / DOM-out. No context dependencies.
- The `<Icon>` primitive must accept `color="currentColor"` and inherit from parent text color when not specified. This makes button icons (white on navy) work without per-call color props.
- Avatar's automatic initials must handle: empty name → `?`, single word → first 2 chars, multi-word → first letter of first 2 words. Match `newui/meridian/shared.jsx` line 178–185 behavior.
- `/design-system` route must be reachable from `localhost:5173/design-system` in dev — no link in sidebar (developer convenience only).

</specifics>

<deferred>
## Deferred Ideas

- **Storybook integration** — too heavy for this app's size; the dev route is enough.
- **Visual regression testing (Chromatic / Percy)** — out of scope for v1.1; can add in v1.2.
- **Dark mode tokens** — explicitly out of scope per PROJECT.md.
- **Migrating existing `brand-*` Tailwind classes to `meridian.*`** — happens organically as P6–P11 rebuild each page; no global find/replace.
- **Removing dead CSS from `client/src/index.css`** — deferred to P11 (Tail Pages + Cleanup).
- **Accessibility audit of primitives (focus rings, aria-labels)** — primitives ship with reasonable defaults in P1; full a11y sweep is P11 (Lighthouse a11y ≥ 90 acceptance criterion).

</deferred>

---

*Phase: 01-design-system-extraction-foundation*
*Context gathered: 2026-05-02 via PRD Express Path (source: MERIDIAN_MILESTONE_PLAN.docx)*

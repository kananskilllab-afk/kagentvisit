# Phase 06 Context - Layout, Login, and Dashboard Meridian Rebuild

## Goal

Make the app's first impression read as Meridian: persistent navy navigation, a split-pane login screen, and a dashboard entry surface using the shared token/primitives baseline.

## Inputs

- `.planning/ROADMAP.md` Phase 6 success criteria
- `.planning/REQUIREMENTS.md` UI-S-01 through UI-S-04
- Phase 1 Meridian tokens and primitives
- Phase 3 open action item dashboard source
- Phase 5 agent history and action item carry-forward context

## Constraints

- Preserve existing authentication and dashboard data fetch behavior.
- Keep responsive navigation behavior deterministic at desktop, tablet, and phone widths.
- Avoid broad workflow changes that belong to later module rebuild phases.

## Files Touched

- `client/src/components/Layout.jsx`
- `client/src/pages/Login.jsx`
- `client/src/pages/Dashboard.jsx`
- `client/src/index.css`

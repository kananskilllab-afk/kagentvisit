# Phase 07 Context - Visits Module Meridian Rebuild

## Goal

Move the core visit workflow surfaces onto the Meridian UI baseline without changing visit creation, review, locking, follow-up, or action item behavior.

## Inputs

- `.planning/ROADMAP.md` Phase 7 success criteria
- `.planning/REQUIREMENTS.md` UI-V-01 through UI-V-03
- Phase 1 design tokens and utility baseline
- Phase 3 action item tracker integration
- Phase 6 shell and global Meridian utilities

## Files Touched

- `client/src/pages/VisitsList.jsx`
- `client/src/pages/NewVisit.jsx`
- `client/src/components/VisitDetailModal.jsx`
- `client/src/components/SurveyForm/StepIndicator.jsx`

## Constraints

- Preserve all existing API calls.
- Preserve draft autosave, unlock, edit, delete, follow-up, admin review, and action item behavior.
- Keep changes scoped to visit module presentation and the required export button.

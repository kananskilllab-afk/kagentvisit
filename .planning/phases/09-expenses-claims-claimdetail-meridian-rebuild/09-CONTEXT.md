# Phase 09 Context - Expenses, Claims, and ClaimDetail

## Goal

Move money-flow surfaces onto the Meridian baseline without altering expense, claim, policy, or upload behavior.

## Inputs

- `.planning/ROADMAP.md` Phase 9 success criteria
- `.planning/REQUIREMENTS.md` UI-M-01 through UI-M-03
- Phase 6 global Meridian utility baseline

## Files Touched

- `client/src/pages/Expenses/AddExpense.jsx`
- `client/src/pages/Expenses/NewClaim.jsx`
- `client/src/pages/Expenses/ExpenseList.jsx`
- `client/src/pages/Expenses/ClaimsList.jsx`
- `client/src/pages/Expenses/ClaimDetail.jsx`

## Constraints

- Preserve Cloudinary/ImageUpload integration.
- Preserve claim submission and policy notice flow.
- Preserve list selection, detail review, audit, and claim actions.

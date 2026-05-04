# Plan 04-01 Summary

- Added `GET /api/agents/:id/history`.
  - Returns agent profile, read-only flag, KPIs, open action items, and last five visit rows.
  - KPIs include total visits, last visit date, open action item count, and average available rating.
- Added `GET /api/agents/:id/visits`.
  - Supports `limit`, `offset`, and optional `status`.
  - Returns pagination metadata with `hasMore`.
- Added role behavior:
  - `home_visit` receives 403.
  - `accounts` receives 200 with `readOnly: true`.
  - Other protected roles receive 200.
- Route order places `/history` and `/visits` before generic `/:id`.

## Verification

- `npm test --prefix server` passed: 4 test suites, 52 todo tests.

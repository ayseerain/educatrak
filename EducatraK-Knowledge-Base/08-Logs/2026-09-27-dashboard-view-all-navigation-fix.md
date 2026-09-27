# Dashboard View All Navigation Fix

**Timestamp:** Sunday, September 27, 2026 — 12:11:09 +08:00

## What changed

- Updated `frontend/src/features/dashboard/components/AccountStatusOverview.tsx` so the "View all" control uses React Router `Link` navigation to `/followup`.
- Added a regression test in `frontend/src/test/dashboard.test.tsx` confirming the "Accounts needing attention" panel opens the overdue follow-up route.

## Why

The control used a plain anchor with `href="/follow-up"`. That route does not exist, and the full document navigation cleared the prototype's in-memory session state, making the app appear to log the user out.

## Validation

- `npm test -- dashboard.test.tsx` passed.
- `npm test` passed.
- `npm run build` passed.

## Follow-up

- React Router future-flag warnings and jsdom chart-size warnings still appear during tests, but they did not affect this fix.

# Accounting Trend Range Bar Consistency

Timestamp: Thursday, October 22, 2026 — 20:12:07 +08:00

## What Changed

- Removed the range-specific 24-pixel maximum bar size for Today and Last 7 days.
- All collection-trend ranges now use the same Recharts bar sizing behavior.
- Added a regression test comparing the bar geometry across Today, Last 7 days, and Last 30 days.

## Validation

- `frontend: npm run test -- src/test/dashboard.test.tsx` passed: 22 tests.
- `frontend: npm run build` passed.
- `git diff --check` passed for the changed frontend files.

## Follow-Up

- None.

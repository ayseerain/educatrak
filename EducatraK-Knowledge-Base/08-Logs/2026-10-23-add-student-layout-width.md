# Add Student Layout Width

Timestamp: Friday, October 23, 2026 — 12:25:05 +08:00

## What Changed

- Removed the Add Student form's desktop maximum-width constraint so its workflow cards fill the same available main-content area as Record Payment.
- Kept the existing responsive two-column field groupings, allowing the student and guardian fields to use the additional horizontal space without changing their behavior.
- Added a focused regression test for the full-width form layout.

## Validation

- Passed: `frontend: npm test -- --run src/test/operations.test.tsx` (42 tests).
- Passed: `frontend: npm run build`.
- Passed: `git diff --check`.

## Follow-Up

- None.

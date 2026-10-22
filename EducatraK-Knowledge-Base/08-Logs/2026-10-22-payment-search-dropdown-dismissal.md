# Payment Search Dropdown Dismissal

Timestamp: Thursday, October 22, 2026 — 20:51:45 +08:00

## What Changed

- Added a "Close suggestions" control to the shared student search dropdown.
- Pressing Escape also dismisses matching suggestions; changing the query allows them to appear again.
- Selecting a student dismisses the dropdown.
- Added regression coverage for dismissing suggestions on the payment entry page.

## Validation

- `frontend: npm run test -- src/test/operations.test.tsx -t "opens the shared payment workflow route with student search"` passed.
- `frontend: npm run build` passed.
- `git diff --check` passed.

## Follow-Up

- None.

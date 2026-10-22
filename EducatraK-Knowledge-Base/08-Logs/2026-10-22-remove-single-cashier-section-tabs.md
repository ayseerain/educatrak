# Remove Single Cashier Section Tabs

Timestamp: Thursday, October 22, 2026 — 18:22:00 +08:00

## What Changed

- Hid the sole active "Due follow-ups" tab on the Cashier follow-up page and the sole active "Today's close-out" tab on the Cashier close-out page.
- Kept section tabs visible when they provide navigation choices; the Accounting History tab remains available.
- Updated role-navigation regression coverage.

## Validation

- Targeted operations navigation test passed.
- `frontend: npm run build` passed.
- `git diff --check` passed for the changed frontend files.

## Follow-Up

- None.

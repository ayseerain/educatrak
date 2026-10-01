# Temporary Role Preview

Timestamp: Thursday, October 01, 2026 — 17:09:48 +08:00

## What Changed

- Added a mock-session role switcher for temporary frontend previewing.
- Added a header role dropdown that switches among the documented sample roles and returns to the dashboard.
- Kept the existing role/capability matrix as the source of visible routes and actions.
- Added regression coverage for switching from Cashier to Accounting and seeing the Accounting overview.

## Why

The user needs to quickly inspect each role's dashboard overview and accessible navigation without signing out and back in as every sample account.

## Validation

- `npm test -- --run src/test/login.test.tsx` passed: 11 tests.
- `npm run build` passed.

## Follow-Up

- This is a temporary mock-frontend preview aid and should be removed or replaced before production hardening.

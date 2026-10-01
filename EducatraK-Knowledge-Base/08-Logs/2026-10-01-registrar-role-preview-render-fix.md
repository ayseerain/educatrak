# Registrar Role Preview Render Fix

Timestamp: Thursday, October 01, 2026 — 17:20:19 +08:00

## What Changed

- Fixed the dashboard render path when switching into the Registrar role from another mock role.
- Kept `DashboardPage` hook order stable so React can render the Registrar overview after runtime role changes.
- Expanded the mock role-switch regression test to switch from Cashier to Accounting and then Registrar.

## Why

The temporary role preview could fail to render Registrar because the dashboard skipped a hook only for that role.

## Validation

- `npm test -- --run src/test/login.test.tsx` passed: 11 tests.
- `npm test -- --run src/test/dashboard.test.tsx` passed: 21 tests.
- `npm run build` passed.

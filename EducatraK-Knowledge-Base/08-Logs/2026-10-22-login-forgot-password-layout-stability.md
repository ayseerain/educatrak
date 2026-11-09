# Login Forgot-Password Layout Stability

Timestamp: Thursday, October 22, 2026 — 16:16:47 +08:00

## What Changed

- Reserved vertical space for the login page's forgot-password instruction so opening it does not shift the centered login content.
- Added a regression assertion for the reserved layout space.
- Updated `CASHIER_UI_REFACTOR_CHANGELOG.md`.

## Why

The instruction was conditionally inserted into a vertically centered content block, changing its height and moving the login form and surrounding page content.

## Validation

- `npx vitest run src/test/login.test.tsx --pool=threads --maxWorkers=1 --minWorkers=1` passed: 12 tests.
- `npm run build` passed.
- The default-worker invocation exhausted Node.js memory in this environment; rerunning with one worker passed.

## Follow-Up

- None.

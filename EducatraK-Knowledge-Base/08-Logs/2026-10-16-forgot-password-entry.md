# Forgot Password Entry

Timestamp: Friday, October 16, 2026 — 10:06:29 +08:00

## What Changed

- Added an accessible **Forgot password?** control to the `/login` page.
- The control reveals the staff recovery instruction: contact an administrator to reset the password.
- Added localized copy, a regression test for the interaction, and authentication feature documentation.

## Why

The requested sign-in recovery entry point is available without introducing the out-of-scope self-service recovery flow, email delivery, or reset tokens.

## Validation

- `npm.cmd test -- --run src/test/login.test.tsx` passed: 12 tests.
- `npm.cmd run build` passed.

## Follow-Up

- A backend recovery flow remains intentionally unimplemented. Administrators continue to reset staff passwords through user administration.

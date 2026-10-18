# Login Header Copy Update

Timestamp: Sunday, October 18, 2026 — 15:51:26 +08:00

## What Changed

- Removed the login-page subtitle beneath the Sign in heading.
- Reduced the mobile brand-to-heading gap and the heading-to-form gap to maintain balanced spacing after the subtitle removal.

## Why

The task request removed the “Use your EducaTrak account to continue.” text from the login page.

## Validation

- Ran `npm test -- --run src/test/login.test.tsx` successfully (12 tests).
- Ran the full `npm test` suite successfully (60 tests).
- Ran `npm run build` successfully.

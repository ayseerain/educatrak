# Login Academy Seal

Timestamp: Sunday, October 18, 2026 — 16:19:26 +08:00

## What Changed

- Added the Mendez Christian Academy seal image from the repository's `logo/` directory to `frontend/public/`.
- Replaced the `EK` placeholders in both desktop and mobile login headers with the academy seal.
- Added a login test confirming both logo images render with the expected source and accessible name.

## Why

The login brand mark should use the provided Mendez Christian Academy seal instead of the `EK` placeholder.

## Validation

- Ran `npm test -- src/test/login.test.tsx` successfully (12 tests).
- Ran `npm run build` successfully.
- Confirmed the production build includes the seal image.

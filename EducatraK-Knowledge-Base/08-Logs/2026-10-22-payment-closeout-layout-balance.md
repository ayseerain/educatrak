# Payment and Close-out Layout Balance

**Timestamp:** Thursday, October 22, 2026 — 11:40:52 +08:00

- Removed the desktop maximum-width constraint from the Record payment and Daily close-out workflow cards so each fills the available main-content area without an unused right-side gap.
- Preserved the existing form fields, summary grids, confirmation dialogs, and workflow behavior.

## Validation

- Passed: frontend `npm test` (62 tests).
- Passed: frontend `npm run build`.
- Passed: `git diff --check`.

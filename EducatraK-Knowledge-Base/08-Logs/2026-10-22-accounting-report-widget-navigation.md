# Accounting Report Widget Navigation

**Timestamp:** Thursday, October 22, 2026 — 17:44:31 +08:00

- Replaced the separate “Open” hyperlink in each permitted Accounting report widget with a full-card route link on the Reports hub.
- This keeps the existing report permissions and destinations unchanged while allowing users to open a report by clicking or keyboard-activating its widget.

## Validation

- Passed: `npx vitest run src/test/operations.test.tsx` (33 tests), including widget-click navigation coverage.
- Passed: `npm test` (68 tests) and `npm run build` in `frontend/`.

# Status and State Icon Coverage

**Timestamp:** Thursday, October 22, 2026 — 18:06:17 +08:00

- Updated the shared operational-table renderer so textual values in Status and State columns consistently use the existing status badge and icon treatment.
- Expanded the shared status presentation mapping for additional active, completed, pending, denied, and read-only labels. Identifiers, numeric counts, and em dashes remain plain text rather than being presented as a status.
- Preserved legacy tables that render cells directly; their recognized status badges continue to render as before.

## Validation

- Passed: `npx vitest run src/test/operations.test.tsx` (36 tests), including shared status/state icon coverage.
- Passed: `npm test` (71 tests) and `npm run build` in `frontend/`.

# Registrar Clearance Render Fix

**Timestamp:** Sunday, October 18, 2026 — 15:37:38 +08:00

## Changed

- Fixed the shared operations table renderer to accept React content as well as text cells, and to run status-badge detection only for text.
- This prevents the Registrar's permitted **Print exam permit** link from being passed to string-only status handling when `/clearance` renders.
- Added regression coverage for the Registrar clearance-verification view and its permit link.

## Validation

- `frontend: npm test -- --run src/test/operations.test.tsx` passed: 26 tests.
- `frontend: npm test -- --run` passed: 59 tests.
- `frontend: npm run build` passed.

## Remaining Work

- React Router printed its existing v7 future-flag warnings during the focused and full test runs.

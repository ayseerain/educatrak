# Role Header Student Search Removal

**Timestamp:** Thursday, October 22, 2026 — 19:45:13 +08:00

## Changed

- Removed the shared header student-search control for Accounting, Auditor, and Registrar accounts.
- Kept the role-specific Registrar clearance-search workflow intact.
- Preserved the shared header search for the Cashier, which uses it for daily student/payment work.

## Validation

- `frontend: npm test -- --run src/test/operations.test.tsx` passed: 39 tests.
- `frontend: npm run build` passed.

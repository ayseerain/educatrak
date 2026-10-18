# Registrar Student Profile Access

**Timestamp:** Sunday, October 18, 2026 — 15:42:10 +08:00

## Changed

- Restored the Registrar's limited `student.view` frontend capability so a clearance-verification search can open the guarded student profile route.
- Kept the Registrar profile restricted to student identity, grade/section, and clearance status; financial, guardian, account, and payment information remains unavailable.
- Added regression coverage for the guarded limited-profile route.

## Validation

- `frontend: npm test -- --run src/test/operations.test.tsx` passed: 27 tests.
- `frontend: npm run build` passed.

## Remaining Work

- The frontend still uses mock student data; backend student and clearance domain APIs remain outside this focused permission fix.

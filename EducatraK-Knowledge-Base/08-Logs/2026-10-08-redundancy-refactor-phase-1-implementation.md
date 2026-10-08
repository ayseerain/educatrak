# Redundancy Refactor — Phase 1 Permission and Sensitive Data

Thursday, October 08, 2026 — 23:25:54 +08:00

## Approval and scope

The owner approved Phase 1 in the current task conversation. This implementation is limited to R01, R02, and R07. It does not add a backend, persistence, capabilities, routes, roles, payment methods, or Students & Billing consolidation.

## Changes

- Student Profile passes the authenticated user into billing and payment panels. Its shared inline `PaymentWorkflow` now renders only for `payment.record`; payment-view roles retain their payment history.
- Account creation now requires `account.create`, and statement printing in the Student Profile requires `statement.print`.
- Added `canViewReport` for the existing documented report scope. Cashiers can discover and navigate to daily collection and student statements only; the existing top-level report guard remains and direct monthly/outstanding routes render access denied for Cashier.
- Replaced inferred sidebar nesting with explicit `parentTo` relationships, applied after role filtering.
- Added five-role regression coverage for payment entry/history, Registrar privacy, account creation, statement printing, report policy/discovery, and role-filtered sidebar nesting.

## Validation

- `npx vitest run src/test/operations.test.tsx` — passed: 1 file, 20 tests.
- `npm test` — passed: 3 files, 52 tests.
- `npm run build` — passed: TypeScript build and Vite production build.
- `git diff --check` — passed before this documentation update.

## Remaining limits

Frontend checks remain UX controls; server-side authorization and report record-scoping are backend responsibilities. The mock implementation still has the Phase 2 route-ID and shared-fixture issues. Phase 1 is `WAITING_FOR_ACCEPTANCE`; do not begin Phase 2 without explicit owner acceptance.

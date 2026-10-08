# Redundancy Refactor — Phase 0 Acceptance and Phase 1 Plan

Thursday, October 08, 2026 — 23:14:46 +08:00

## Phase 0 acceptance

The owner accepted Phase 0 in the current task conversation. Its documentation-only baseline, finding revalidation, role traceability, and route/account decisions are now accepted. No application code was changed in Phase 0.

## Phase 1 proposed scope

Phase 1 addresses R01, R02, and R07 only: permission and sensitive-data controls.

1. **Inline payment entry:** Pass the authenticated user through the Student Profile payment panel. Render payment history to users with `payment.view`, but render the shared `PaymentWorkflow` only to users with `payment.record`. The same workflow remains available at `/payments/new` for Cashier.
2. **Child-action guards:** Hide account creation unless the user has `account.create`; hide Student Profile statement printing unless the user has `statement.print`; preserve permitted read-only data for other authorized roles.
3. **Report scope:** Keep the existing report routes and capabilities, but prevent the Cashier from discovering or directly using monthly/outstanding reports, because the canonical requirement limits Cashier reports to their own daily report and student statements. Do not introduce a new capability or change backend authority.
4. **Navigation structure:** Replace the sidebar's inferred nested styling with explicit parent-child metadata only as necessary to keep role-filtered parent/child navigation accurate. Do not perform Students & Billing account consolidation; that is Phase 3 and remains dependent on accepted Phase 2 work.

## Expected files

- `frontend/src/features/operations/OperationalPages.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/lib/permissions.ts` only if an existing-policy helper avoids duplicating route-scope rules
- `frontend/src/test/operations.test.tsx`
- `frontend/src/test/dashboard.test.tsx` only if a dashboard action is affected
- Phase 1 ledger/log documentation after implementation and validation

## Planned verification

- Component/route tests covering all five roles, including direct navigation attempts.
- Cashier retains the inline and standalone shared payment form; Administrator, Accounting Officer, and Auditor retain payment history without payment-entry controls; Registrar sees no payment/billing/guardian or amount exposure.
- Account creation and statement-print controls appear only to their allowed roles.
- Cashier cannot discover or use monthly/outstanding reports; the remaining roles retain the documented access.
- Sidebar parent/child rendering remains correct after capability filtering.
- Run focused tests, then `npm test` and `npm run build`; record actual results.

## Exclusions and dependencies

No backend, persistence, atomic-payment, receipt-number, payment-method, account-data-model, or Student & Billing consolidation changes are authorized. Phase 1 implementation requires explicit owner approval; Phase 2 remains blocked until Phase 1 is accepted.

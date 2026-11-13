# R04 - Close-out System Totals by Payment Method

- **Timestamp:** Friday, November 13, 2026 — 00:19:30 +08:00
- **State:** Awaiting owner acceptance; validated against isolated SQLite and the frontend test/build environment.
- **Scope:** Meet M13's daily system-total-by-method requirement without changing payment methods, cash-drawer variance, roles, schema, migration, target database, provider, or deployment behavior.

## Change

- Added `CalculateCloseOutSystemTotalsAction`, which groups the signed-in Cashier's valid payments for the current business date by their stored `method` value.
- `GET /api/close-outs/today` now retains `system_cash_cents` and adds `system_totals`, a method-to-centavos map.
- Submitted close-outs now persist `cash_cents` plus the same by-method totals in `close_outs.system_totals`; close-out read responses expose the snapshot map, including safe fallback for earlier cash-only records.
- The live Cashier close-out screen renders the dynamic breakdown before submission and in the locked summary. The drawer count and variance remain tied only to cash.

## Regression proof

`CashierOperationsTest::test_cashier_close_out_returns_system_totals_by_payment_method_while_variance_uses_cash_only` creates synthetic cash and check payments, verifies both totals in the today and submitted responses, verifies a zero variance against the cash total, and checks the stored snapshot.

`liveCloseouts.test.tsx` verifies the live UI maps and renders the API-provided method breakdown. Focused validation passed: **25 Laravel tests / 290 assertions** and **3 Vitest tests**. Laravel Pint completed. The full isolated Laravel suite passed: **156 tests / 1,112 assertions**. The frontend production build passed.

## Boundary

The full frontend suite retains one existing, unrelated Registrar/LRN assertion failure and the existing LiveBillingAccounts table-whitespace warning; neither was changed by R04. SQLite evidence does not prove matching-MySQL transaction, locking, or concurrency behavior. R04 does not resolve remaining A06/B13 blockers or approve release.

Owner acceptance would accept this remediation record only. It would not authorize target/shared/production database activity, provider action, infrastructure configuration, recovery work, or deployment.

## Owner disposition - Friday, November 13, 2026 — 10:45:06 +08:00

- **Decision:** The owner accepted R04.
- **Resolved:** The M13 daily system-total-by-payment-method implementation gap is resolved in isolated SQLite/frontend evidence.
- **Boundary:** Matching-MySQL transaction/concurrency verification and all remaining A06/B13 blockers stay open. Acceptance does not authorize database, provider, infrastructure, recovery, or deployment work.

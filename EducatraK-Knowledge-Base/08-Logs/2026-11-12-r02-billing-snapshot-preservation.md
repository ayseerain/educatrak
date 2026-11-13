# R02 - Preserve Existing Billing-Account Fee Snapshots

- **Timestamp:** Thursday, November 12, 2026 — 23:32:53 +08:00
- **State:** Accepted by owner; validated only against isolated SQLite.
- **Scope:** Correct the M9.1 new-accounts-only fee-item rule. No schema, migration, real account, target database, provider, or deployment operation ran.

## Change

- Removed `ApplyFeeItemToBillingAccountsAction`, which added a new fee snapshot and installment to every matching existing billing account and increased its total due and balance.
- Fee-item creation and revision now update fee schedules and versions for future account creation only.
- Retained the existing fee-create response shape; `updatedAccountCount` is now always `0`, accurately reflecting that existing accounts are not changed.
- Updated the API contract and ERD note to document immutable existing account snapshots.

## Regression proof

`FinanceSettingsMutationTest::test_accounting_preserves_existing_account_fee_snapshots_when_creating_and_revising_fees` creates a synthetic existing account, then creates and revises a fee item. It proves the existing account retains:

- its original fee-item snapshot;
- no newly created installment;
- unchanged `total_due_cents` and `balance_cents`; and
- its existing read-response total.

Focused finance validation passed: **3 tests / 55 assertions**. Laravel Pint completed successfully. The complete isolated PHPUnit suite passed: **151 tests / 1,075 assertions**.

## Boundary

The regression suite uses SQLite in memory. It does not establish matching-MySQL locking or migration behavior. R02 does not resolve B02/B03-B05, any frontend finding, or B13 deployment/recovery prerequisite, and it does not authorize a release.

Owner acceptance would accept this remediation record only. It would not authorize migration, target/shared/production database activity, provider action, infrastructure configuration, or deployment.

## Owner disposition - Thursday, November 12, 2026 — 23:37:37 +08:00

- **Decision:** The owner accepted R02.
- **Resolved:** The M9.1 existing-account fee-snapshot defect is resolved in isolated SQLite evidence.
- **Boundary:** Matching-MySQL behavior and all remaining A06/B13 blockers stay open. Acceptance does not authorize any database, provider, infrastructure, recovery, or deployment operation.

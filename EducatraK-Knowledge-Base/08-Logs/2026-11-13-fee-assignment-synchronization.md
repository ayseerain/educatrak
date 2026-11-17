# Approved fee-assignment synchronization implementation

**Recorded:** Friday, November 13, 2026 — 20:43:22 +08:00

## Authorization and scope

The owner explicitly authorized implementation of the previously proposed DB-04 fee-assignment synchronization workstream. The change is limited to the finance fee-item mutation path, its existing feature test suite, the API/database architecture records, the backend loop ledger, and the required repository records. No migration, reference SQL execution, or development/shared/production database operation was authorized or performed.

## Implemented behavior

- `ApplyFeeItemToBillingAccountsAction` locks each existing billing account using an affected fee schedule, skips an already assigned fee ID/name, writes an account-item snapshot, creates one unpaid installment, and increments `total_due_cents` and `balance_cents` by the integer-centavo fee amount.
- `POST /api/settings/finance/fees/{feeSchedule}/items` returns the actual `updatedAccountCount`, including all selected schedules when `apply_to_all` is true.
- A revision keeps the existing account-item snapshot and its amount intact. With `apply_to_all`, only schedules missing the original fee receive a new fee and the corresponding account synchronization.
- The current API/database documentation and audit finding DB-04 were updated to distinguish this implemented behavior from the remaining matching-MySQL verification gate.

## Validation

- PHP syntax checks passed for the new action, `FinanceSettingsController`, and `FinanceSettingsMutationTest`.
- Laravel Pint passed for dirty PHP files.
- Focused `FinanceSettingsMutationTest` passed: 5 tests, 79 assertions.
- Complete isolated Laravel PHPUnit suite passed: 164 tests, 1,177 assertions.
- Tests use the configured in-memory SQLite environment. They did not contact the development database.

## Remaining limits

- Matching-MySQL transaction, lock, and rollback behavior remains unverified; execute only in an explicitly approved disposable target-compatible environment.
- Current-school-year management, guardian lifecycle, retention, import application, backup/restore, worker/scheduler/provider operation, and deployment readiness are not part of this workstream.

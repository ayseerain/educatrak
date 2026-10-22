# Individual Follow-up Reminder Selection

Timestamp: Thursday, October 22, 2026 — 18:12:37 +08:00

## What Changed

- Added an individual reminder checkbox to each follow-up account row for roles allowed to send reminders.
- Kept the select-all checkbox synchronized with individual row selection.
- Updated reminder review to show selected recipient, email, overdue amount, and days overdue, and to identify selected accounts skipped for missing email.
- Prevented sending when no selected account has an email and disabled selection after sending.
- Added tests for individual selection, select-all behavior, review details, and skipped accounts.

## Validation

- Focused reminder-selection tests passed: 2 tests.
- `frontend: npm run build` passed.
- `git diff --check` passed for the changed frontend files.
- The full operations test file was attempted: 37 tests passed and one unrelated System configuration test failed because its expected payment-method helper text did not match the current implementation.

## Follow-Up

- Reconcile the unrelated System configuration helper-text test separately.

# Fee assignment synchronization and all-grade scope

- **Date:** November 5, 2026
- **Status:** Approved by the current task instruction

## Decision

When Accounting adds a fee item to a grade-level schedule, the system also adds that fee to every existing billing account using the same schedule. The account's total due and balance increase by the fee amount, and one unpaid installment is created so the amount remains payable without changing prior payments or allocations.

The fee form supports the selected grade or **All grades** in the same school year for both additions and revisions. A fee name is unique within each schedule, case-insensitively. An All-grades operation is rejected without partial changes if any target schedule already has that fee name.

Revisions retain the established versioning behavior for account items already assigned to an account. If an All-grades revision introduces the fee to a schedule where it did not exist, that newly added fee follows the synchronization rule above.

## Rationale

The current task instruction supersedes the prior new-accounts-only behavior for newly added fee items while preserving historical payment evidence.

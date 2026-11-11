# Existing Database Design Review

## Snapshot and limits

Reviewed the owner-selected `feature/backend-foundation` snapshot at
`ae6fcee9d9edc6f592ce4e18611f995c0f00e458`. It has six migration files:
three Laravel support migrations and three EducatraK domain migrations. The
domain migrations create 28 application tables. The repository has 28 model
files and 28 factories. No database was queried or migrated.

This review describes the migrations; it is not an approved future schema.
No migration, model, seeder, or database file was changed. This branch is 57
commits behind `main`, so it does not contain the later decision files
expected by the preparation prompt. The task's current instructions govern;
branch documentation conflicts are listed below.

## Entity and relationship map

| Area | Tables and persisted relationships |
|---|---|
| School structure | `school_years` → `terms` → `exam_periods`; `grade_levels` → `sections`. |
| People | `students` reference optional `grade_levels` and `sections`; `guardians` and `students` join through `guardian_student` with `is_primary`. Student identifier is unique 12-digit `lrn`. |
| Fees and plans | `school_years` and `grade_levels` own `fee_schedules`; schedules own `fee_items`. `payment_plans` own ordered `payment_plan_installments`. `system_settings` stores JSON values and nullable updater user. |
| Accounts | A `billing_accounts` row references a student and school year, with optional fee schedule and payment plan. Unique `(student_id, school_year_id)`. Accounts own snapshot `billing_account_items`, `adjustments`, and ordered `installments`. |
| Payments | `payments` reference account, student, and recording user. A payment has one `receipts` row, zero or more `payment_allocations`, and at most one `void_requests` row. Amounts and receipt sequence are unique/integer fields as described below. |
| Operations | `notification_logs` reference student and optional payment. `close_outs` reference cashier and optional sign-off user. `clearance_rules`/ `clearance_records` reference exam-period, student, and school-year records. `import_batches` reference creator and hold JSON summary/rows. |
| Evidence and support | `audit_entries` reference a nullable user and store JSON before/after snapshots, entity identity, IP, user-agent, and occurrence time. `backup_records` store result, size, error, and completion time. Laravel support tables are `users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, and `failed_jobs`. |

Foreign keys generally use `restrictOnDelete()` for financial/history
relationships and `nullOnDelete()` where the schema preserves the record
without the referenced optional row. Explicit composite/unique indexes include
school-year term sequence, section name per grade, schedule name per year/grade,
plan installment sequence, one account per student/year, account installment
sequence, one receipt per payment, unique receipt sequence/number, one
allocation per payment/installment, one void request per payment, and one
close-out per cashier/business date.

The MySQL config uses strict mode and `utf8mb4` /
`utf8mb4_unicode_ci`; PHP tests use SQLite `:memory:`. Production DB version
and collation behavior have not been tested on a live MySQL instance.

## Money and historical evidence

Fee items, account totals, installments, payments, allocations, and counted
cash use unsigned integer centavos. Adjustments use signed integer centavos.
No floating-point money column was found. Receipt number and sequence are
unique; receipts retain issue time, and payments retain status, recording
time/user, and reprint count. Account items snapshot name/category/amount, so
later fee edits need not rewrite historical items.

Delete restrictions are present on core financial foreign keys. They do not
make all tables append-only: the schema has no trigger or database privilege
rule preventing edits/deletes to `audit_entries`, payments, receipts, or
other evidence. Application routes on this branch do not expose most domain
operations. Audit JSON permits arbitrary snapshots, so an approved field
allowlist and retention/anonymization policy are still needed before broad
audit writes are added.

## Findings

| ID | Severity | Finding and evidence | Next action |
|---|---|---|---|
| DB-01 | Resolved | `students.lrn` is the unique 12-digit student identifier. Test records use fictional values. | Preserve `students.id` and all linked financial relationships when migrating existing environments. |
| DB-02 | Medium, incomplete model layer | 28 model files exist, but explicit relationship methods appear only on `BillingAccount` (installments, payments) and `Payment` (allocations). The development ledger says domain relationships remain incomplete. | Add relationships only with their approved domain implementation; preserve foreign keys and snapshots. |
| DB-03 | Decision needed | `school_years.is_current` is indexed but not unique, so the database permits more than one current school year. The business rule for ownership/transitions is not settled in this branch. | Confirm whether exactly one current year must be enforced, then choose transaction and database constraints. |
| DB-04 | Decision needed | `guardian_student` stores a many-to-many link and `is_primary`, but there is no ownership or maintenance lifecycle for guardian data. | Confirm guardian-data owner and whether one primary guardian per student is required. |
| DB-05 | Decision needed | `audit_entries.before/after` are nullable JSON and not schema-allowlisted or immutable at the database layer. | Approve snapshot fields, privacy treatment, append-only enforcement, retention, and archive anonymization before expanding audit writes. |

**Confirmed open database-design items: 5.** DB-01 is a deferred identifier
decision, DB-02 is an incomplete model layer, and DB-03–DB-05 require owner
policy. No other DDL violation is claimed without an approved target schema.

## Approval checklist

- [x] LRN is a unique 12-digit text identifier and is used for matching.
- [ ] Guardian ownership, primary-contact semantics, and linked-record lifecycle.
- [ ] School-year ownership and current-year transition/uniqueness.
- [ ] Integer-centavo types and payment/allocation/receipt invariants.
- [ ] Receipt sequence scope and correction/reprint evidence.
- [ ] Audit append-only guarantees, snapshot allowlist, privacy and retention.
- [ ] No-hard-delete and approved purge semantics; staff archive/anonymization.
- [ ] Fee synchronization and historical account-item snapshots.
- [ ] Session lifetime/settings and cookie security.
- [ ] Exact MySQL deployment version, collation and least-privilege account.
- [ ] Backup/restore verification, retention, and recovery owner.
- [ ] Foreign-key/index review against approved load and privacy requirements.

No retention period or purge policy is proposed here.

## Branch/document conflicts

The branch's `Project-Specification.md` predates the current task's November
2026 decisions. Its active-clearance descriptions conflict with the current
instruction that clearance and permit workflows are retired; retained
clearance tables remain historical and are not to be destructively migrated.
The branch also lacks the later decision documents for student-record role
reassignment, fee synchronization, and the masterlist/LRN import. This review
follows the current task for scope and records the source drift; it does not
rewrite canonical requirements.

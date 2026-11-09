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
| People | `students` reference optional `grade_levels` and `sections`; `guardians` and `students` join through `guardian_student` with `is_primary`. Student identifier is unique `student_no`. |
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
| DB-01 | Medium, deferred | `students.student_no` is the only student identifier; there is no LRN column or index. The current masterlist decision requires matching by LRN but explicitly defers replacing Student Number until a separate task. | Decide LRN semantics, uniqueness, and migration/backfill plan in that separate approved task. Do not alter schema in this preparation phase. |
| DB-02 | Medium, incomplete model layer | 28 model files exist, but explicit relationship methods appear only on `BillingAccount` (installments, payments) and `Payment` (allocations). The development ledger says domain relationships remain incomplete. | Add relationships only with their approved domain implementation; preserve foreign keys and snapshots. |
| DB-03 | Decision needed | `school_years.is_current` is indexed but not unique, so the database permits more than one current school year. The business rule for ownership/transitions is not settled in this branch. | Confirm whether exactly one current year must be enforced, then choose transaction and database constraints. |
| DB-04 | Decision needed | `guardian_student` stores a many-to-many link and `is_primary`, but there is no ownership or maintenance lifecycle for guardian data. | Confirm guardian-data owner and whether one primary guardian per student is required. |
| DB-05 | Decision needed | `audit_entries.before/after` are nullable JSON and not schema-allowlisted or immutable at the database layer. | Approve snapshot fields, privacy treatment, append-only enforcement, retention, and archive anonymization before expanding audit writes. |

**Confirmed open database-design items: 5.** DB-01 is a deferred identifier
decision, DB-02 is an incomplete model layer, and DB-03–DB-05 require owner
policy. No other DDL violation is claimed without an approved target schema.

## Approval checklist

- [ ] Student Number versus LRN semantics, matching and uniqueness.
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

## 2026-11-09 current-branch reconciliation

**Snapshot:** `feature/backend-foundation` at `b4ee0e3f535e07810d87a3106268e3965029f7a4`; this section supersedes the old branch counts above. Read-only inspection found 14 migration files and 29 model files. The migration chain—not this review—is executable schema. No ERD, data dictionary, reference SQL, diagram, or checks directory exists here. Therefore B4 draft repair and B7 approval are blocked; no schema load or constraint matrix ran.

### Checklist against migrations/models

| Topic | Status | Evidence and owner decision |
|---|---|---|
| Surrogate IDs / student identifiers | Implemented / future decision | `2026_10_09_062757_create_educatrak_reference_and_people_tables.php:68-79` defines `students.student_no` and surrogate ID; no LRN column found. Owner approved a separate future Student Number-to-LRN change; field semantics, uniqueness, backfill and migration remain open. |
| Lengths and types | Not settled for a proposed design | Preserve deployed migration types; student `student_no` and names are strings; amount storage uses integer centavos. No approved reference schema exists to compare. |
| Grade / section lookup | Implemented | Same migration defines grade levels, sections and student foreign keys (`:45-79`); do not replace with free text. |
| Duplicate facts / billing history | Existing snapshots and references observed | `2026_10_09_062757...php:86-101` defines school-year/grade-based fee schedules and items; `2026_10_09_062759...php:14-79` defines account, item snapshots, adjustments, installments and payments. Account item snapshots preserve name/category/amount. Detailed authority for all copied values needs a future dictionary. |
| Payment allocation / receipts | Implemented | `2026_10_09_062759...php:82-99` defines receipt/payment allocation relations; receipt sequence additions are in `2026_10_24_220000_create_receipt_sequences_table.php`. Preserve receipt and allocation uniqueness as implemented. |
| Settings storage | Implemented | `backend/app/Models/SystemSetting.php` exposes `key`, `value`, `updated_by`; no second generic settings table proposed. |
| Money / signed amounts | Implemented | Fee/account balances use unsigned cents; adjustment and close-out variance use signed integer cents (`2026_10_09_062759...php:43-48`; `2026_10_09_062801...php:53-59`). No schema changes approved. |
| Current school year uniqueness | Not settled — confirm | `2026_10_09_062757...php:17` indexes `is_current` but does not make it unique. Current-year dashboard behavior is one of five explicitly open policies. |
| Guardian ownership / primary link | Not settled — confirm | `2026_10_09_062757...php:80-84` defines `guardian_student.is_primary`; owner says guardian-data ownership/lifecycle remains open. |
| Audit evidence / privacy | Implemented storage; policy incomplete | `2026_10_09_062801...php:65-78` stores nullable before/after JSON, user/IP/agent and entity type/string ID. Owner: retain required evidence and minimize sensitive snapshots; exact field allowlist/retention remain open. |
| Retention / purge | Not settled — confirm | The separate 30-day user archive/anonymization lifecycle is implemented by `2026_10_25_122930_add_archive_lifecycle_to_users.php`. Owner confirmed retention for audit/security/backup/notification/financial records is undecided. No purge procedure approved. |
| Financial/audit deletion | Existing restrictive FKs; global sign-off open | Financial FK restrictions appear in billing migrations; they do not make rows database-immutable. Preserve financial/audit evidence. Global client sign-off remains open. |
| Index/performance | Implemented indexes; recommendations provisional | Migrations define indexes for status, lookups, event dates and key combinations. No safe representative load test or MySQL deployment check ran. |
| Unused columns / relationships | Not fully assessed | 29 model files exist. No column is proposed for removal; unused status requires query-level evidence and a separately authorized review. |
| Engine/version/collation | Deployment unverified | Application config targets MySQL and test config SQLite; owner says deployment versions/topology remain unverified. |

The owner’s 30-minute idle session answer is a policy decision, not an existing database/schema answer. No financial/audit/notification/backup retention period was inferred. The five open policies remain proposals only as detailed in the dated decision record.

### B4/B7 gate

B4 fixes completed: **0**. Must-fix items resolved: **0**. Must-fix count cannot be reconciled because Part 1 created no ERD, dictionary, reference SQL or enumerated gap register beyond this review. Diagram status: absent/not generated. Schema load: not run. Constraint tests: 0 run. SQLite/PHPUnit suite: not run in this documentation pass. MySQL CLI was not available in the earlier Part 1 environment; current matching scratch DB availability was not established. B7: **skipped**; no design approval, artifacts, compatible scratch database evidence or passing gates.

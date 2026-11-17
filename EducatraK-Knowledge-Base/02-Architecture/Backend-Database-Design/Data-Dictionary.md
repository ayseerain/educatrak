# EducaTrak executable-schema data dictionary

**Status:** derived from the 12 EducaTrak domain migrations and Laravel support migrations at `feature/backend-foundation` / `124a78637e36ee91fd0b3a126813b5a394305ab6`. Ordered migrations are authoritative. No development, shared, or production database was inspected or migrated. This is not an approved target-schema specification.

## Conventions and boundaries

- `id()` and `foreignId()` map to unsigned bigint keys on MySQL; `timestamps()` adds nullable `created_at`/`updated_at`.
- `string()` is `varchar(255)` unless a length is shown. `boolean()` is `tinyint(1)`. JSON uses MySQL `JSON`.
- `*_cents` is an integer-centavo amount. All monetary columns are integer types: unsigned for charges/payments and signed only for `adjustments.amount_cents` and `close_outs.variance_cents`.
- Delete actions below are the declared FK actions, not an append-only or retention guarantee.
- `?` means nullable. Models/controllers can impose validations beyond the DDL.

## Framework and identity

| Table | Columns | Keys and current purpose |
|---|---|---|
| `users` | `id`; username, full_name, role, password; email?; active, is_protected, must_change_password; last_login_at?, archived_at?, archived_by?, anonymize_at?; remember token; timestamps | Unique username/email; role/active/archive/anonymize indexes; `archived_by -> users` set null. Six role strings are enforced in PHP enum/capabilities, not by DB enum/check. |
| `password_reset_tokens` | username; token; created_at? | Username PK. Framework support. |
| `sessions` | id; user_id?; IP; user agent?; payload; last_activity | Session ID PK; user/activity indexes. No FK was declared for `user_id`. |
| `cache`, `cache_locks` | key/value/expiration; key/owner/expiration | Framework cache/lock stores. |
| `jobs`, `job_batches`, `failed_jobs` | Standard Laravel queue fields | Queue execution records; no business-domain relationship. |

## Academic, people, and configuration

| Table | Columns | Keys, relationships, and purpose |
|---|---|---|
| `school_years` | id; label; is_current; starts_on; ends_on; timestamps | Unique label; non-unique index on `is_current`. The dashboard currently rejects zero or multiple current rows, but DDL permits both. |
| `terms` | id; school_year_id; name; sequence; starts_on?; ends_on?; timestamps | School year restrict; unique `(school_year_id, sequence)`. |
| `exam_periods` | id; term_id; name; starts_on; ends_on?; timestamps | Term restrict. Retained only for historical clearance entities. |
| `grade_levels` | id; name; sort_order; active; timestamps | Name and sort order unique. |
| `sections` | id; grade_level_id; name; active; timestamps | Grade restrict; unique `(grade_level_id, name)`. |
| `students` | id; `lrn varchar(12)`; full_name; grade_level_id?; section_id?; status; timestamps | Unique LRN; status index; grade/section set null. Live validation requires exactly twelve digits, preserves LRN on PATCH, and checks section belongs to grade. |
| `guardians` | id; full_name; legacy relationship; email?; email_status; mobile?; timestamps | Email/email-status indexes. Guardian-wide relationship remains retained legacy data. Student creation writes its validated link relationship here only as a required-column compatibility mirror; later link updates preserve it. Ownership/lifecycle is not resolved. |
| `guardian_student` | guardian_id; student_id; is_primary; relationship? varchar(100); timestamps | Composite PK; both FKs restrict. Pivot relationship is the approved link-specific field and was additively backfilled; DDL does not enforce one primary guardian per student. |
| `fee_schedules` | id; school_year_id; grade_level_id; name; active; timestamps | Year/grade restrict; unique `(school_year_id, grade_level_id, name)`. |
| `fee_items` | id; fee_schedule_id; name; category; amount_cents; required; sort_order; active; version; previous_version_id?; timestamps | Schedule/self FK restrict. Version chain supports revision; case-insensitive name uniqueness is application validation, not a DB key. |
| `payment_plans` | id; name; down_payment_type; down_payment_value; active; timestamps | Unique name. |
| `payment_plan_installments` | id; payment_plan_id; label; sequence; due_day_offset; percent_of_remaining_basis_points; timestamps | Plan restrict; unique `(payment_plan_id, sequence)`. |
| `system_settings` | id; key; JSON value; updated_by?; timestamps | Unique key; updater set null. `billing.due_soon_days` is a known current key; no settings-management data contract exists for many required M9 items. |

## Billing, payment, and receipt evidence

| Table | Columns | Keys, relationships, and purpose |
|---|---|---|
| `billing_accounts` | id; student_id; school_year_id; fee_schedule_id?; payment_plan_id?; status; total_due_cents; total_paid_cents; balance_cents; created_by; timestamps | Unique `(student_id, school_year_id)`; student/year/creator restrict, source schedule/plan set null. Account provisioning route is absent. |
| `billing_account_items` | id; billing_account_id; fee_item_id?; name; category; amount_cents; timestamps | Account restrict, fee item set null. Stores charge snapshots independent of later source-item changes. |
| `installments` | id; billing_account_id; label; sequence; due_date; amount_cents; paid_cents; status; timestamps | Account restrict; unique `(billing_account_id, sequence)`; status index. |
| `adjustments` | id; billing_account_id; type; signed amount_cents; reason; created_by; effective_at; timestamps | Account/creator restrict; account/effective index. Action prevents zero and invalid discount/scholarship signs, but no DB check enforces business semantics. |
| `payments` | id; billing_account_id; student_id; amount_cents; balance_after_cents?; method; paid_on; backdate_reason?; duplicate_override_reason?; notes?; status; recorded_by; recorded_at; reprint_count; timestamps | Account/student/recorder restrict; student/amount/recorded and account/status indexes. Payment's student ID is retained alongside its account relation. |
| `receipts` | id; payment_id; sequence; receipt_no; receipt_year; issued_at; first_printed_at?; timestamps | One receipt per payment; sequence and number globally unique. |
| `receipt_sequences` | id unsigned tinyint; last_sequence; timestamps | PK-only singleton convention; migration seeds id `1` from prior max receipt sequence. No DB check restricts alternate IDs. |
| `payment_allocations` | id; payment_id; installment_id; amount_cents; timestamps | Both restrict; unique `(payment_id, installment_id)`. |
| `void_requests` | id; payment_id; reason; requested_by; requested_at; status; decided_by?; decided_at?; decision_note?; timestamps | One per payment; requester restrict; decider set null. Application enforces status/role/separation rules. |
| `payment_idempotency_keys` | id; user_id; key varchar(100); request_hash char(64); response_body? JSON; response_status?; completed_at?; timestamps | User cascade; unique `(user_id, key)`. Supports replay of a completed payment response. |

## Operations, audit, notifications, and historical entities

| Table | Columns | Keys, relationships, and purpose |
|---|---|---|
| `notification_logs` | id; student_id; payment_id?; installment_id?; guardian email/mobile snapshots?; channel; load_fee_cents?; kind; status; failure_reason?; attempts; delivery_key?; provider_message_sid?; sent_at?; timestamps | Student restrict; payment/installment set null; indexes status, student/date, channel, provider SID; nullable unique delivery key. Records, not proof of, provider delivery. |
| `close_outs` | id; business_date; cashier_id; JSON system_totals; counted_cash_cents; signed variance_cents; variance_reason?; submitted_at; signed_off_by?; signed_off_at?; timestamps | Cashier restrict; signer set null; unique `(business_date, cashier_id)`. System-total JSON is an immutable-at-creation snapshot by application behavior, not DB trigger. |
| `audit_entries` | id; user_id?; action; entity_type; string entity_id; before?/after? JSON; IP?; user agent?; occurred_at; timestamps | User set null; occurred and entity identity indexes. Entity reference is polymorphic and has no FK; DDL does not prevent mutation/deletion. |
| `backup_records` | id; result; size_bytes?; error?; completed_at; timestamps | Result index. Metadata only; no actual backup payload, execution, or restore proof. |
| `import_batches` | id; created_by; filename; status; JSON summary; JSON rows; committed_at?; timestamps | Creator restrict. Generic persisted shape only; no live import route writes it. |
| `clearance_rules` | id; kind; exam_period_id?; JSON rule; active; timestamps | Exam period set null. Historical-only. |
| `clearance_records` | id; student_id; school_year_id; exam_period_id?; kind; cleared; reason; calculated_at; timestamps | Student/year restrict, exam period set null; unique student/year/kind/exam-period. Historical-only; nullable unique behavior is engine-dependent and unverified on target MySQL. |

## Frontend-to-database contract trace

| Domain | Submitted and validated | Persisted / serialized | Reconciliation |
|---|---|---|---|
| Student | Live frontend sends LRN, name, grade, section, status, and one guardian payload. Laravel requires 12-digit LRN, grade/section IDs and compatible section; guardian fields are optional but name/relationship are paired. | `students`; when guardian name+relationship are present, one transaction creates/reuses the first link, clears other primary flags, writes the pivot relationship, writes the required legacy compatibility mirror for a newly created guardian only, and records the audit event. Lists/profile expose LRN and academic data; balance/guardian data require capabilities. | SYNC-GDN-01 is implemented and verified in isolated SQLite. General multi-guardian creation/edit, guardian ownership, and primary-contact policy are still unresolved and are not exposed by this form/action. |
| Account/fee | Account list/detail and adjustments are live. Accounting fee form sends item fields plus `apply_to_all`. | On fee addition, the controller snapshots the new item onto each existing account using the schedule, creates one unpaid installment, increments total due/balance, and immediately recalculates installment/account status; `updatedAccountCount` reports the affected account count. Existing account-item snapshots remain unchanged on revision. An all-grade revision synchronizes a schedule only when that fee was absent there. | Account creation is absent. Isolated SQLite feature tests cover fee synchronization, including the same-day due-soon status transition; target-MySQL transaction/lock behavior remains unverified. |
| Payment/void | Payment has header idempotency key, account, positive centavos, date/reasons/notes/channels. Void has reason then decision/note. | Transactional payment, allocation, receipt, idempotency, audit and notification records; void corrects status/balances rather than deleting history. | Isolated SQLite tests exist; matching-MySQL contention evidence does not. |
| Notification | Follow-up selects eligible installments/channels; failed attempts may be retried. | Notification rows retain recipient snapshots, delivery key/SID, status, attempts and optional SMS fee. | Queue/provider operation and delivery confirmation remain environment/policy limited. |
| Staff | User creation/update, archive/restore/reset are separate API actions. | User lifecycle fields plus account/security audit records. | Privileged assignment/recovery policy is still partial. |
| Import | Live UI has no parser/apply and backend exposes no route. | `import_batches` is unused by live controller flow. | Approved future target difference; not a schema defect by itself. |

## Current schema versus approved target

| Classification | Finding |
|---|---|
| Current executable schema | This dictionary describes migration declarations through `2026_11_12_023223_add_relationship_to_guardian_student_table.php`. |
| Approved target difference | Clearance/exam-permit entities are retained historical-only. Student import, account provisioning, and broad M9 management APIs are intentionally not implemented. |
| Implemented approved behavior | The November 5 fee-add decision is implemented by `ApplyFeeItemToBillingAccountsAction`: it records a new account-item snapshot, unpaid installment, total/balance increment, and immediate status recalculation for each eligible existing account. Revisions retain prior snapshots; all-grade revisions synchronize only previously missing schedule fees. |
| Unresolved policy | Guardian ownership/lifecycle; retention/purge; exact school-year management; adjustment threshold; privileged-account recovery/assignment; deployment MySQL/version/topology. |
| Verification limit | This audit did not run migrations, reference SQL, target MySQL, production data, backups/restores, schedulers/workers, or external delivery. |

Do not use this dictionary as authorization to change a database.

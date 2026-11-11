# Existing-schema data dictionary — descriptive draft

**Status:** Derived from 14 Laravel migration files on `feature/backend-foundation` at `b4ee0e3f535e07810d87a3106268e3965029f7a4`. Descriptive only; migrations are authoritative. No production data was inspected. SQL types below use Laravel/MySQL mappings; check exact target-engine behavior before deployment.

## Conventions

- `id()` and `foreignId()` use unsigned big integer keys on MySQL. `timestamps()` adds nullable `created_at` and `updated_at`.
- Laravel `string()` defaults to `varchar(255)` unless a length is given; `boolean()` maps to `tinyint(1)`; JSON columns use MySQL `JSON`.
- `_cents` amounts are integer centavos. Unsigned types cannot represent negative values; adjustments and close-out variance use signed `bigint`.
- “Restrict”, “null”, and “cascade” describe the declared foreign-key delete action. They do not mean all rows are immutable.

## Framework and identity tables

| Table | Columns (type; `?` means nullable) | Keys and purpose |
|---|---|---|
| `users` | `id` bigint unsigned; `username` varchar(255); `full_name` varchar(255); `email` varchar(255)?; `role` varchar(255); `active` boolean; `must_change_password` boolean; `last_login_at` timestamp?; `password` varchar(255); `remember_token` varchar(100)?; `is_protected` boolean; `archived_at` timestamp?; `archived_by` bigint unsigned?; `anonymize_at` timestamp?; timestamps | PK id; unique username and nullable email; role/active/archive/anonymize indexes; self-FK archived_by -> users.id (`SET NULL`). Auth identity, role, protected bootstrap, and separate 30-day archive/anonymization lifecycle. |
| `password_reset_tokens` | `username` varchar(255); `token` varchar(255); `created_at` timestamp? | PK username. Laravel password-reset storage. |
| `sessions` | `id` varchar(255); `user_id` bigint unsigned?; `ip_address` varchar(45)?; `user_agent` text?; `payload` longtext; `last_activity` integer | PK id; indexes user_id and last_activity. Laravel database-session storage. |
| `cache` | `key` varchar(255); `value` mediumtext; `expiration` bigint | PK key; expiration index. |
| `cache_locks` | `key` varchar(255); `owner` varchar(255); `expiration` bigint | PK key; expiration index. |
| `jobs` | `id` bigint unsigned; `queue` varchar(255); `payload` longtext; `attempts` unsigned smallint; `reserved_at` unsigned integer?; `available_at` unsigned integer; `created_at` unsigned integer | PK id; queue index. |
| `job_batches` | `id` varchar(255); `name` varchar(255); `total_jobs`, `pending_jobs`, `failed_jobs` integer; `failed_job_ids` longtext; `options` mediumtext?; `cancelled_at` integer?; `created_at` integer; `finished_at` integer? | PK id. |
| `failed_jobs` | `id` bigint unsigned; `uuid`, `connection`, `queue` varchar(255); `payload`, `exception` longtext; `failed_at` timestamp | PK id; unique uuid; composite connection/queue/failed_at index. |

## Academic, people, configuration

| Table | Columns (type; `?` means nullable) | Keys, relationships, and purpose |
|---|---|---|
| `school_years` | `id`; `label` varchar(255); `is_current` boolean; `starts_on`, `ends_on` date; timestamps | Unique label; index is_current (not unique). Current-year cardinality policy remains open. |
| `terms` | `id`; `school_year_id` bigint unsigned; `name` varchar(255); `sequence` unsigned smallint; `starts_on`, `ends_on` date?; timestamps | FK school_years restrict; unique school_year_id + sequence. |
| `exam_periods` | `id`; `term_id` bigint unsigned; `name` varchar(255); `starts_on` date; `ends_on` date?; timestamps | FK terms restrict. Historical reference for retired clearance flows. |
| `grade_levels` | `id`; `name` varchar(255); `sort_order` unsigned smallint; `active` boolean; timestamps | Unique name and sort_order. |
| `sections` | `id`; `grade_level_id` bigint unsigned; `name` varchar(255); `active` boolean; timestamps | FK grade_levels restrict; unique grade_level_id + name. |
| `guardians` | `id`; `full_name`, `relationship`, `email`, `email_status` varchar(255); `mobile` varchar(32)?; timestamps | Index email and email_status. Guardian-data owner and lifecycle remain undecided. |
| `students` | `id`; `student_no`, `full_name`, `status` varchar(255); `grade_level_id`, `section_id` bigint unsigned?; timestamps | Unique student_no; index status; optional grade/section FKs set null. No LRN column. |
| `guardian_student` | `guardian_id`, `student_id` bigint unsigned; `is_primary` boolean; timestamps | Composite PK; both FKs restrict. No uniqueness constraint limits primary guardian count. |
| `fee_schedules` | `id`; `school_year_id`, `grade_level_id` bigint unsigned; `name` varchar(255); `active` boolean; timestamps | Both FKs restrict; unique school_year_id + grade_level_id + name. |
| `fee_items` | `id`; `fee_schedule_id` bigint unsigned; `name`, `category` varchar(255); `amount_cents` unsigned bigint; `required`, `active` boolean; `sort_order`, `version` unsigned smallint/integer; `previous_version_id` bigint unsigned?; timestamps | Schedule FK restrict; self-FK previous_version_id restrict. No unique fee name constraint in SQL; application validation enforces within-schedule behavior. |
| `payment_plans` | `id`; `name`, `down_payment_type` varchar(255); `down_payment_value` unsigned integer; `active` boolean; timestamps | Unique name. |
| `payment_plan_installments` | `id`; `payment_plan_id` bigint unsigned; `label` varchar(255); `sequence`, `due_day_offset`, `percent_of_remaining_basis_points` unsigned smallint; timestamps | Plan FK restrict; unique plan + sequence. |
| `system_settings` | `id`; `key` varchar(255); `value` JSON; `updated_by` bigint unsigned?; timestamps | Unique key; optional users FK set null. JSON value supports non-numeric settings; `billing.due_soon_days` is an existing setting key. |

## Billing and financial evidence

| Table | Columns (type; `?` means nullable) | Keys, relationships, and purpose |
|---|---|---|
| `billing_accounts` | `id`; `student_id`, `school_year_id` bigint unsigned; `fee_schedule_id`, `payment_plan_id` bigint unsigned?; `status` varchar(255); `total_due_cents`, `total_paid_cents`, `balance_cents` unsigned bigint; `created_by` bigint unsigned; timestamps | Unique student + school_year; required student/year/creator FKs restrict; optional schedule/plan FKs set null. |
| `billing_account_items` | `id`; `billing_account_id` bigint unsigned; `fee_item_id` bigint unsigned?; `name`, `category` varchar(255); `amount_cents` unsigned bigint; timestamps | Account FK restrict; source fee item FK set null. Captures item snapshot fields for account history. |
| `adjustments` | `id`; `billing_account_id` bigint unsigned; `type`, `reason` varchar(255); `amount_cents` signed bigint; `created_by` bigint unsigned; `effective_at` timestamp; timestamps | Account/creator FKs restrict; index account + effective_at. Approval threshold remains undecided. |
| `installments` | `id`; `billing_account_id` bigint unsigned; `label`, `status` varchar(255); `sequence` unsigned smallint; `due_date` date; `amount_cents`, `paid_cents` unsigned bigint; timestamps | Account FK restrict; unique account + sequence; index status. |
| `payments` | `id`; `billing_account_id`, `student_id`, `recorded_by` bigint unsigned; `amount_cents`, `balance_after_cents` unsigned bigint?; `method`, `status` varchar(255); `paid_on` date; `backdate_reason`, `duplicate_override_reason`, `notes` varchar(255)?; `recorded_at` timestamp; `reprint_count` unsigned integer; timestamps | Account/student/recorder FKs restrict; indexes student+amount+recorded_at and account+status. Status and recorded evidence support correction workflow. |
| `receipts` | `id`; `payment_id` bigint unsigned; `sequence` unsigned integer; `receipt_no` varchar(255); `receipt_year` unsigned smallint; `issued_at`, `first_printed_at` timestamp?; timestamps | Unique payment_id, sequence, receipt_no. One receipt per payment. |
| `receipt_sequences` | `id` unsigned tinyint; `last_sequence` unsigned bigint; timestamps | PK id; migration seeds id=1 from existing receipt maximum. No singleton DB constraint. |
| `payment_allocations` | `id`; `payment_id`, `installment_id` bigint unsigned; `amount_cents` unsigned bigint; timestamps | Both FKs restrict; unique payment + installment. |
| `void_requests` | `id`; `payment_id`, `requested_by` bigint unsigned; `reason`, `status` varchar(255); `requested_at` timestamp; `decided_by` bigint unsigned?; `decided_at` timestamp?; `decision_note` varchar(255)?; timestamps | Unique payment_id; request FK restrict, decider FK set null. |
| `payment_idempotency_keys` | `id`; `user_id` bigint unsigned; `key` varchar(100); `request_hash` char(64); `response_body` JSON?; `response_status` unsigned smallint?; `completed_at` timestamp?; timestamps | User FK cascade; unique user + key. |

## Operations, audit, and import evidence

| Table | Columns (type; `?` means nullable) | Keys, relationships, and purpose |
|---|---|---|
| `clearance_rules` | `id`; `kind` varchar(255); `exam_period_id` bigint unsigned?; `rule` JSON; `active` boolean; timestamps | Optional exam_period FK set null. Historical; active workflow retired. |
| `clearance_records` | `id`; `student_id`, `school_year_id` bigint unsigned; `exam_period_id` bigint unsigned?; `kind`, `reason` varchar(255); `cleared` boolean; `calculated_at` timestamp; timestamps | Student/year restrict; optional exam FK set null; composite unique includes nullable exam_period_id. Historical; not an active workflow. |
| `notification_logs` | `id`; `student_id` bigint unsigned; `payment_id`, `installment_id` bigint unsigned?; `guardian_email` varchar(255)?; `guardian_mobile` varchar(32)?; `kind`, `status`, `failure_reason`, `provider_message_sid` varchar(255)?; `attempts` unsigned integer; `delivery_key` varchar(64)?; `channel` varchar(255); `load_fee_cents` unsigned integer?; `sent_at` timestamp?; timestamps | Student restrict; payment/installment set null; indexes status, student+created_at, channel, provider SID; unique nullable delivery_key. |
| `close_outs` | `id`; `business_date` date; `cashier_id` bigint unsigned; `system_totals` JSON; `counted_cash_cents` unsigned bigint; `variance_cents` signed bigint; `variance_reason` varchar(255)?; `submitted_at` timestamp; `signed_off_by` bigint unsigned?; `signed_off_at` timestamp?; timestamps | Cashier FK restrict; signer set null; unique business_date + cashier. |
| `audit_entries` | `id`; `user_id` bigint unsigned?; `action`, `entity_type` varchar(255); `entity_id` varchar(255); `before`, `after` JSON?; `ip_address` varchar(45)?; `user_agent` varchar(1024)?; `occurred_at` timestamp; timestamps | User FK set null; index occurred_at and entity_type+entity_id. Polymorphic target has no FK; no DB append-only constraint. Snapshot minimization and retention unresolved. |
| `backup_records` | `id`; `result` varchar(255); `size_bytes` unsigned bigint?; `error` varchar(255)?; `completed_at` timestamp; timestamps | Index result. Records backup outcome metadata, not backup payload. |
| `import_batches` | `id`; `created_by` bigint unsigned; `filename`, `status` varchar(255); `summary`, `rows` JSON; `committed_at` timestamp?; timestamps | Creator FK restrict. Existence does not mean the LRN masterlist import pipeline is implemented. |

## Traceability and unresolved design questions

The frontend MockDB has 17 array collections: `staffUsers`, `schoolYears`, `feeSchedules`, `paymentPlans`, `students`, `guardians`, `studentGuardianLinks`, `billingAccounts`, `installments`, `payments`, `paymentAllocations`, `voidRequests`, `notificationAttempts`, `followUpActions`, `closeouts`, `backupRuns`, `auditLog`. These are not one-to-one with SQL tables. The separate `config` and `frontendOnly` objects are not persisted domain collections.

| MockDB collection | Current persisted mapping/evidence | Boundary or gap |
|---|---|---|
| `staffUsers` | `users` | Mock role IDs differ from DB numeric IDs; password fields are not MockDB records. |
| `schoolYears` | `school_years` | No unique-current constraint; dashboard no-current-year behavior open. |
| `feeSchedules` | `fee_schedules`, `fee_items` | Nested mock items are normalized; fee-add synchronization is application behavior and approved. |
| `paymentPlans` | `payment_plans`, `payment_plan_installments` | Mock counts/due-interval shape differs from persisted installment terms. |
| `students` | `students`, `grade_levels`, `sections` | Current unique field is Student Number; LRN change is future separately authorized. |
| `guardians` | `guardians` | Ownership/lifecycle policy open. |
| `studentGuardianLinks` | `guardian_student` | Composite guardian/student key; `is_primary` is persisted separately. Mock relationship is per link, while schema stores `relationship` on the guardian row; confirm per-link semantics before reconciling. |
| `billingAccounts` | `billing_accounts`, `billing_account_items`, `adjustments` | Account items keep value snapshots; account row stores derived totals. |
| `installments` | `installments` | Amount/paid/status rows; unique account sequence. |
| `payments` | `payments`, `receipts`, `receipt_sequences` | Payment references current account/student, immutable retention policy not fully signed off. |
| `paymentAllocations` | `payment_allocations` | Unique per payment/installment; FK restricts deletion. |
| `voidRequests` | `void_requests` | Separate request/decision actor fields preserve separation. |
| `notificationAttempts` | `notification_logs` | Provider/channel/delivery metadata; retention open. |
| `followUpActions` | No exact table; some communication attempts map to `notification_logs` | Task/reminder state semantics differ; no new table proposed. |
| `closeouts` | `close_outs` | System totals snapshot; unique cashier/business date. |
| `backupRuns` | `backup_records` | Metadata only; actual files/backups belong to deployment storage. |
| `auditLog` | `audit_entries` | Entity key stored as type+string ID; retention and snapshot allowlist unresolved. |

### Important non-1:1 tables

`terms`, `exam_periods`, `grade_levels`, `sections`, `payment_plan_installments`, `system_settings`, `clearance_rules`, `clearance_records`, and `import_batches` have no direct collection equivalent or are partly represented in nested/config structures. The final two import/clearance tables do not establish active front-end flows. Framework queue, cache, session, and password-reset tables have no MockDB collection.

### Approval checklist

- [ ] Student Number/LRN semantics and migration/backfill plan; future LRN change is separately approved but not designed.
- [ ] Guardian ownership, primary-contact rule, and linked-record lifecycle.
- [ ] Exactly-one-current-year requirement and dashboard behavior when none exists.
- [ ] Fee synchronization, item snapshots, adjustment approval threshold.
- [ ] Payment allocation, receipt numbering, idempotency, void separation and correction evidence.
- [ ] Audit snapshot allowlist, append-only enforcement, privacy, retention and disposal.
- [ ] Financial, notification, security, backup and other record retention; reconcile current Privacy Policy text.
- [ ] Global no-hard-delete client sign-off, separate from 30-day staff archive lifecycle.
- [ ] Target MySQL version/collation, backup/restore owner and deployment topology.
- [ ] Index/performance review with safe synthetic volume; current indexes remain as implemented.

This is a descriptive, unapproved reference. Do not treat it as authorization for migrations or production changes.

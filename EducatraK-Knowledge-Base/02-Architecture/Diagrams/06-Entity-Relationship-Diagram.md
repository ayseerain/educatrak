# Figure 6 — Physical Entity-Relationship Diagram Index

## 1. Purpose and Project Plan Placement

Place in **5.3 System Overview**. These are physical MySQL-oriented schema references derived first from Laravel migrations, not inferred Eloquent relationships. Generate three readable Crow’s Foot views rather than one unreadable page.

## 2. Scope and Sources

**Verified Implementation:** all facts in the domain views come from `backend/database/migrations/0001_01_01_000000_create_users_table.php`, `2026_10_09_062757_create_educatrak_reference_and_people_tables.php`, `...062759_create_educatrak_billing_tables.php`, `...062801_create_educatrak_operations_tables.php`, and subsequent migrations through `2026_10_25_130000_add_reminder_delivery_tracking.php`. Models/actions are secondary behavioral evidence.

## 3. Coordinated Views

| View | Entities | Diagram rule |
|---|---|---|
| [6A Student and Billing](ERD/01-Student-and-Billing-Domain.md) | academic references, people, schedules, plans, accounts, items/installments | Keep `users` as a compact external reference where needed. |
| [6B Payments and Financial](ERD/02-Payment-and-Financial-Domain.md) | payments, allocations, receipts, voids, adjustments, notifications | Show unique foreign keys as one-to-zero/one, never one-to-many. |
| [6C Operations and Configuration](ERD/03-Operations-and-Configuration-Domain.md) | users, settings, audit, imports, backup, close-outs, idempotency, sequences | Include Laravel infrastructure tables as appendix entries, not project-plan entities. |

## 4. Global Physical Rules

- Most domain tables use unsigned `id` primary keys. `students.id` is the primary key; `students.lrn` is a unique `string(12)` identity value that preserves leading zeros.
- `guardian_student` has composite primary key `(guardian_id, student_id)` and implements many-to-many Student–Guardian. It has no surrogate `id`.
- `billing_accounts` has unique `(student_id, school_year_id)`.
- `receipts.payment_id` and `void_requests.payment_id` are unique foreign keys: each constrains its relationship to a maximum of one related row.
- Money uses integer centavos: unsigned values except signed `adjustments.amount_cents` and `close_outs.variance_cents`. No decimal/float monetary column appears in the inspected migrations.
- `payment_plans` has no direct `school_year_id` foreign key in the inspected migrations.
- `backup_records` has no user foreign key.
- Laravel foreign IDs are unsigned big integers; timestamps are nullable only where explicitly stated. “Optional” below means the foreign-key column is nullable, not that application workflow necessarily allows omission.

## 5. Retired / Historical Tables

`clearance_rules`, `clearance_records`, and their references to `exam_periods` are physically retained but **Retired / Historical** under `06-Decisions/2026-11-05-student-record-role-reassignment.md`. They are excluded from active plan diagrams. `exam_periods` and `terms` remain in the physical schema and are documented only to accurately explain those retained foreign keys.

## 6. Diagram Construction Instructions

Use Crow’s Foot with `|` for exactly one, `o|` for zero-or-one, and `o<` for zero-or-many. Label every connector with child FK and deletion action. In diagram tools, show keys and high-value attributes only; use the domain data dictionaries for complete required information. Do not infer database-level check constraints, immutability, or uniqueness where the migrations do not declare them.

## 7. Verification and Accuracy Checklist

- [x] All active domain entities are assigned to a coordinated view.
- [x] Newer idempotency, fee-version, receipt-sequence, archive, and notification migrations included.
- [x] Unique FKs represented as one-to-zero/one.
- [x] Historical clearance/permit structures excluded from active views.

## 8. Outstanding Decisions and Limitations

See `02-Architecture/Backend-Database-Design/Database-Review.md` for the unresolved guardian lifecycle, current-school-year uniqueness, audit immutability/privacy, retention, backup/restore, and deployment database policy. No live MySQL introspection was performed; migration declarations are the verified schema source.

## 9. Change History

- November 15, 2026 — Created physical-schema index and domain split.

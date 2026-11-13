# Existing-schema ERD — descriptive draft

**Status:** Descriptive reconstruction of the Laravel migration baseline. **Not approved as a future design.** Source of executable schema remains the ordered migrations in `backend/database/migrations/`. This diagram covers the 30 EducaTrak domain tables; Laravel support tables are listed separately below.

```mermaid
erDiagram
    USERS o|--o{ SYSTEM_SETTINGS : updates
    USERS ||--o{ BILLING_ACCOUNTS : creates
    USERS ||--o{ ADJUSTMENTS : creates
    USERS ||--o{ PAYMENTS : records
    SCHOOL_YEARS ||--o{ TERMS : contains
    TERMS ||--o{ EXAM_PERIODS : contains
    GRADE_LEVELS ||--o{ SECTIONS : contains
    GRADE_LEVELS ||--o{ STUDENTS : classifies
    SECTIONS ||--o{ STUDENTS : assigns
    STUDENTS ||--o{ GUARDIAN_STUDENT : links
    GUARDIANS ||--o{ GUARDIAN_STUDENT : links
    SCHOOL_YEARS ||--o{ FEE_SCHEDULES : scopes
    GRADE_LEVELS ||--o{ FEE_SCHEDULES : scopes
    FEE_SCHEDULES ||--o{ FEE_ITEMS : defines
    FEE_ITEMS o|--o{ FEE_ITEMS : previous_version
    PAYMENT_PLANS ||--o{ PAYMENT_PLAN_INSTALLMENTS : defines
    STUDENTS ||--o{ BILLING_ACCOUNTS : has
    SCHOOL_YEARS ||--o{ BILLING_ACCOUNTS : scopes
    FEE_SCHEDULES o|--o{ BILLING_ACCOUNTS : uses
    PAYMENT_PLANS o|--o{ BILLING_ACCOUNTS : uses
    BILLING_ACCOUNTS ||--o{ BILLING_ACCOUNT_ITEMS : snapshots
    FEE_ITEMS o|--o{ BILLING_ACCOUNT_ITEMS : source
    BILLING_ACCOUNTS ||--o{ INSTALLMENTS : schedules
    BILLING_ACCOUNTS ||--o{ ADJUSTMENTS : adjusts
    BILLING_ACCOUNTS ||--o{ PAYMENTS : receives
    STUDENTS ||--o{ PAYMENTS : identifies
    PAYMENTS ||--o| RECEIPTS : issues
    PAYMENTS ||--o{ PAYMENT_ALLOCATIONS : allocates
    INSTALLMENTS ||--o{ PAYMENT_ALLOCATIONS : receives
    PAYMENTS ||--o| VOID_REQUESTS : may_have
    USERS {
        bigint id PK
    }
    STUDENTS ||--o{ CLEARANCE_RECORDS : historical_only
    SCHOOL_YEARS ||--o{ CLEARANCE_RECORDS : historical_only
    EXAM_PERIODS o|--o{ CLEARANCE_RECORDS : historical_only
    EXAM_PERIODS o|--o{ CLEARANCE_RULES : historical_only
    STUDENTS ||--o{ NOTIFICATION_LOGS : recipient_context
    PAYMENTS o|--o{ NOTIFICATION_LOGS : context
    INSTALLMENTS o|--o{ NOTIFICATION_LOGS : context
    USERS ||--o{ CLOSE_OUTS : cashier
    USERS o|--o{ CLOSE_OUTS : signer
    USERS o|--o{ AUDIT_ENTRIES : actor
    USERS ||--o{ IMPORT_BATCHES : creator
    USERS ||--o{ PAYMENT_IDEMPOTENCY_KEYS : owns
```

### Notes and omitted framework tables

- `students.student_no` is the current unique business identifier. No LRN column exists. Owner approved Student Number-to-LRN only for separately authorized future work; no semantics or schema change is approved here.
- `billing_account_items` preserve name/category/amount snapshots; linked `fee_item_id` is nullable. Fee revisions create versions; existing account snapshots remain unchanged and revised schedules apply to new accounts only.
- `audit_entries.entity_type` plus string `entity_id` is a polymorphic reference, not a numeric foreign key. `before` and `after` JSON are nullable; database immutability is not enforced by these migrations.
- `clearance_rules` and `clearance_records` remain historical schema. Active clearance and exam permit flows are retired by the November 5 decision.
- `receipt_sequences` is a singleton-style sequence row seeded by migration; its key has no check constraint enforcing only `id = 1`.
- Laravel support tables are `users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, and `failed_jobs`. `users` appears only as a key-only entity to show its domain foreign keys; other support tables are omitted from the domain relationship drawing.
- Diagram source: migration declarations, not a live database export. It has not been regenerated or validated against deployed MySQL.

### Approval boundary

This diagram describes current migration relationships only. It does not approve a new schema, settle guardian ownership, global deletion policy, retention, current-school-year uniqueness, or LRN migration. B7 remains skipped pending owner approval and safe matching-engine checks.

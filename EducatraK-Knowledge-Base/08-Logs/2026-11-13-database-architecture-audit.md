# Database architecture audit and documentation reconciliation

**Recorded:** Friday, November 13, 2026 — 14:28:28 +08:00

## Scope

Read-only audit of `feature/backend-foundation` at `124a78637e36ee91fd0b3a126813b5a394305ab6`. Inspected migrations, models, actions, route/controller/request contracts, factories/test inventory, frontend live forms/adapters and MockDB data shape, decisions, ledgers and current issue records. Application code, frontend code, migrations and all databases were left unchanged.

## Documentation updated

- `02-Architecture/Backend-Database-Design/ERD.md`: canonical migration relationship diagram plus people/academic, billing/receipt, operations/evidence and historical-clearance diagrams.
- `02-Architecture/Backend-Database-Design/Data-Dictionary.md`: current table, field, FK/index and live contract trace, including the current 12-digit LRN and pivot relationship field.
- `02-Architecture/Backend-Database-Design/Database-Review.md`: executable-versus-target boundary, classified findings, integrity evidence, limits and unapproved correction gates.
- `02-Architecture/Backend-Database-Design/Reference-Schema.sql`: replaced stale `student_no` with `lrn VARCHAR(12)` and added `guardian_student.relationship`; retained descriptive-only warning.

## Material findings

- LRN is already the live unique string identifier and backend validation requires twelve digits; numeric `students.id` remains the stable linked-record key.
- Guardian relationship is now persisted per association in `guardian_student.relationship`; `guardians.relationship` remains legacy retained data. Guardian ownership/multi-link lifecycle is still undecided.
- All persisted money columns are integer centavos. Receipt/idempotency/void/account snapshot structures exist, but target-MySQL concurrency and constraint evidence is absent.
- Clearance/exam tables are historical-only; there is no active API route. `import_batches` exists without a live import route/parser/apply contract.
- The current fee controller preserves existing account snapshots while the November 5 decision requires a new fee to synchronize to existing accounts. This is a policy/implementation conflict requiring explicit finance-owner resolution before remediation.
- Current school-year behavior requires exactly one row at dashboard use, but DDL does not enforce uniqueness or supply management routes. Retention, backup/restore and deployment runtime evidence remain open.

## Validation

- Verified branch, HEAD and clean pre-change worktree; inspected `git diff` after documentation changes.
- `git diff --check` passed before log-record creation.
- No test command was run by this documentation-only audit. Prior recorded isolated PHPUnit evidence is historical and not re-certified here.
- No database or reference SQL execution occurred.

## Next gate

No backend correction is authorized by this audit. The first proposed correction is a separately approved fee-synchronization workstream only after the finance owner resolves the conflicting policy and approves preservation, rollback and matching-MySQL validation criteria.

## Validation addendum

**Recorded:** Friday, November 13, 2026 — 14:31:25 +08:00

The installed PHP runtime enumerated 51 API routes with `artisan route:list --path=api --except-vendor`, including no active clearance or exam-permit route and no live import route. This was a read-only route inventory; it did not run migrations or connect to a database. No test suite was run.

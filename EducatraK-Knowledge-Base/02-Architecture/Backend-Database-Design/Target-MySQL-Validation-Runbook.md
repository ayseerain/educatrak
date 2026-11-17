# SYNC-MYSQL-01 — Target-Compatible MySQL Validation Runbook

**Status:** Approved workstream; environment-blocked at Friday, November 13, 2026 — 23:44:55 +08:00  
**Branch / verified HEAD:** `feature/backend-foundation` / `124a78637e36ee91fd0b3a126813b5a394305ab6`  
**Purpose:** Establish reproducible evidence for the current Laravel migration set and concurrency-sensitive financial paths on a clean, owner-approved, disposable database that matches the intended deployment engine. This is a verification runbook, not a deployment, schema-change, or production-readiness authorization.

## Fail-closed preconditions

The deployment/database owner must provide and explicitly authorize all of the following before any command in the execution section is run:

1. Database engine family and exact version/patch (MySQL or MariaDB; they are not interchangeable evidence).
2. Server charset, collation, SQL mode, transaction isolation, timezone, and relevant InnoDB settings, plus confirmation that they match the intended deployment target.
3. A newly provisioned disposable database and least-privilege test account, identified by the owner as non-development, non-shared, and non-production. Credentials remain outside this repository.
4. An explicit destructive-test boundary: the database may be created, migrated, seeded only with fictional data, backed up, restored, and discarded. Do not infer this boundary from a hostname or database name.
5. The approved backup destination, restore destination, and operator for the rehearsal.
6. The target PHP/PDO MySQL driver and Laravel runtime version used for the exercise.

Do not create a local substitute image, select a MySQL version/collation, connect to a configured default database, or run `php artisan migrate` until the owner supplies this matrix. No project `.env`, Compose file, target version, MySQL client, or MySQL server command was present in the repository/workstation preflight.

## Evidence captured in the preflight

- Laravel's committed configuration has strict MySQL and MariaDB connections with default `utf8mb4` / `utf8mb4_unicode_ci`; defaults are not target-environment evidence.
- `backend/phpunit.xml` uses isolated SQLite `:memory:`, so its successful tests cannot prove MySQL DDL or locking behavior.
- PHP 8.4.27 can load the PDO MySQL extension locally. It does not establish a target server or authorize a connection.
- The current migration directory contains 14 migrations, ending at `2026_11_12_023223_add_relationship_to_guardian_student_table.php`. No migration is created, altered, or executed by this workstream preflight.

## Execution sequence after authorization

Record every actual command, database identity (without credentials), engine/version/configuration result, test data source, and outcome in the associated session log. Stop immediately if any identity check differs from the owner-supplied matrix.

1. **Identity and isolation.** Have the database operator confirm the disposable boundary. Query and record engine/version, charset/collation, SQL mode, transaction isolation, timezone, and privilege grants. Confirm the database is empty or contains only the approved synthetic fixture.
2. **Migration/schema proof.** Run the existing migration set against that database only. Record migration batches/status and compare the resulting tables, foreign keys, indexes, unique keys, nullability, and integer-centavo columns against the migrations and descriptive `Reference-Schema.sql`. The reference SQL is not executed.
3. **Representative upgrade proof.** If the operator supplies a compatible synthetic pre-upgrade snapshot, migrate it forward and verify the preserved student, guardian-link, academic, billing, payment, receipt, and audit relationships. Do not manufacture a legacy schema or use installed records as a fixture.
4. **Constraint proof.** Verify duplicate LRN, duplicate payment-idempotency, duplicate receipt-sequence, and financial foreign-key rejection; verify the historical-only nullable-unique clearance shape at engine level without adding or reactivating an API route.
5. **Concurrency proof.** Using only concurrent synthetic requests/transactions, exercise payment idempotency/receipt allocation, fee synchronization, void decision, and close-out submission/sign-off. Record the expected winner/rejection, row counts, account balances, receipt numbers, audit rows, and transaction rollback result. Do not claim serialized behavior from sequential SQLite tests.
6. **Migration lock and failure proof.** Demonstrate migration lock behavior using two disposable sessions. Inject a controlled failure in an existing financial transaction test path and confirm no partial balance, receipt, allocation, audit, or snapshot record remains.
7. **Backup/restore rehearsal.** Back up the disposable fixture, restore it only to the separate owner-approved disposable restore destination, and verify row/relationship/invariant checks. Do not restore over development, shared, or production data.
8. **Cleanup and results.** The operator disposes of the test databases and credentials. Record command outcomes, server configuration, schema comparison, test counts, backup/restore result, residual risks, and a separate release decision. A pass does not authorize production deployment.

## Acceptance criteria

SYNC-MYSQL-01 can move from environment-blocked to validation-complete only when the supplied matrix is recorded, every required activity above has reproducible success/failure evidence from the approved disposable target, no project data was used, and the owner accepts the results. It does not authorize SYNC-GDN-02, SYNC-LRN-02, school-year, import, retention, deployment, or any schema redesign.

# Phase 5C-M2 — MariaDB migration safety readiness

**Recorded:** Thursday, November 26, 2026 — 20:31:46 +08:00. **Existing `educatrak` deployment verdict: BLOCKED.** This phase changed code and used only a newly initialized disposable MariaDB 10.11.19 process on `127.0.0.1:34091`, with separate fictional databases. No migration, backup, restore, seeder, write, or server process was run against the existing `127.0.0.1:3306` / `educatrak` database. The existing target identity and four-pending-migration status below are from the Phase 5C-M read-only preflight; they must be rechecked before any target operation.

## 1. Backup compatibility and correction

The installed `mariadb-dump.exe` and `mysqldump.exe` identify as MariaDB 10.11.19. MariaDB's dump tool rejects MySQL's `--set-gtid-purged=OFF`. Before M2, `DatabaseBackupService` included that option whenever Laravel's connection driver was `mysql`, even though MariaDB also uses that driver. The service now runs the configured dump executable with `--version`, omits the MySQL-only option for MariaDB, retains it for MySQL, and fails with a sanitized message for an unrecognized or nonworking tool. It still uses a short-lived credential option file, an absolute configured executable, a destination outside the application, the shared lock, completeness check, SHA-256, audit/history records, and disabled rotation. `BackupReadTest.php` proves MariaDB option selection while the configured Laravel driver is `mysql`.

## 2. Disposable backup and restore evidence

A new MariaDB 10.11.19 process was initialized under a unique `%TEMP%` directory and bound only to `127.0.0.1:34091`; its data directory and port were independently checked. No tool installation or connection to the existing port 3306 was needed. The fictional source was built from the first 16 baseline migrations, `DemoDataSeeder`, and an explicit fictional prior year, term, exam period, account, three payments and three receipts. The backup source then applied all four later migrations so the application backup service's attempt-record columns existed there.

`educatrak:backup-database` produced one 61,712-byte MariaDB dump with a `backup.succeeded` history row. Its file SHA-256 matched the recorded value: `1de2273a1e41414b58aeb17cfeac6da2305a636f0bbd6a24003cb6e4d33bc132`. The dump was imported into a separately named empty disposable restore database. Source and restore each had 40 tables and 20 recorded migrations. For `school_years`, `sections`, `terms`, `exam_periods`, `students`, `billing_accounts`, `payments`, `receipts`, `installments`, `grade_levels`, `users`, and `fee_schedules`, the respective source and restore counts matched: `2, 3, 1, 1, 3, 4, 3, 3, 12, 13, 5, 3`. Ordered row fingerprints for years, sections, terms, exam periods, accounts, payments, and receipts matched across the baseline, clean migration, partial-retry migration, backup source, and restore databases.

Both source and restore had fictional account totals of 3,780,000 cents due, 2,370,000 cents paid, and 1,410,000 cents balance. The three payment rows contained 10,000 valid, 5,000 pending-void and 3,000 voided cents; the historical collection amount remains 15,000 cents under the existing report rule. The restored receipts were `OR-FICTIONAL-101` through `OR-FICTIONAL-103`. Checked term-to-year, exam-to-term, account-to-year, payment-to-account and receipt-to-payment orphan counts were all zero. The source acquired one backup-history/audit entry **after** the dump was written, so those two operational tables are not expected to have identical post-run counts in the restored copy.

This proves a small fictional restore on the installed MariaDB version. It is not a backup or restore proof for the existing `educatrak` database, its privileges, storage destination, size, or operating window.

## 3–4. Archive migration hardening and retry evidence

`2026_11_26_175138_add_archive_state_to_school_years_and_sections.php` now handles each nullable `archived_at` column and its named nonunique index separately. It inspects a pre-existing column for nullable timestamp/datetime compatibility and a pre-existing named index for the exact `archived_at` column and nonunique type; a conflicting shape throws instead of silently marking the migration complete. Its `down()` remains deliberately non-destructive. It does not touch financial tables or existing values.

The first 16 baseline migrations and fictional rows were copied into two disposable databases. On the clean copy, the path-limited archive migration added both nullable columns and both named indexes. On the partial copy, `school_years.archived_at` was added first **without** its index to simulate an interrupted first DDL step; the same migration completed the missing year index and the section column/index. In both copies, the resulting columns were nullable MariaDB `timestamp`, each named index targeted only `archived_at`, all pre-existing archive values were null, the eight core table counts were unchanged (`2, 3, 1, 1, 3, 4, 3, 3`), and ordered fictional row fingerprints matched the pre-archive baseline. The archive file appeared exactly once in each migration ledger. Repeating the path-limited Artisan command in each copy reported “Nothing to migrate.” In-memory SQLite tests additionally call `up()` twice and check a conflicting named index is rejected. MariaDB metadata-lock duration and interruption during a live concurrent write were not measured.

## 5. Pending migration isolation

The Phase 5C-M preflight found these four files pending on the existing target, in this order:

| File | Scope and dependency | M2 disposition |
| --- | --- | --- |
| `2026_11_23_214732_add_opening_balance_ledger_import` | Alters `import_batches`; creates `opening_balance_conversions`. Requires the baseline import and student/year/user tables. | Separate Ledger Import schema/policy review; not needed by archive DDL. |
| `2026_11_23_214959_add_attempt_details_to_backup_records_table` | Adds attempt metadata and a user foreign key to `backup_records`. The application backup service's history write requires it. | Separate deployment decision; native pre-migration dump is required while pending. |
| `2026_11_24_000000_backfill_canonical_grade_levels` | Calls `CanonicalGradeLevels::ensure()` and may insert missing canonical rows. | Separate data review; not needed by archive DDL. |
| `2026_11_26_175138_add_archive_state_to_school_years_and_sections` | Adds only year/section archive columns and indexes; requires the existing baseline tables. | Structurally independent and technically rehearsed through an explicit path. |

On each isolated archive rehearsal, the migration ledger recorded the archive file once while the other three remained unrecorded. **Do not mark those three applied without running and validating them.** A path-limited archive run is technically isolated, but it leaves a mixed application/schema version. The deployment owner must decide the other three files' rollout order and how the application is held from archive routes until the archive columns exist. Plain `artisan migrate` would execute all four and is outside this approval request.

## 6–9. Proposed target deployment, backup, verification and recovery

**Pre-deployment gate.** The owner names the source `127.0.0.1:3306` / `educatrak`, a protected absolute backup destination outside the repository/server data directory, the operator, a restore-only disposable database and maintenance window. Recheck effective Laravel connection, MariaDB version, migration ledger, year/section schemas and indexes, row counts and selected integrity fingerprints immediately before the change. The Phase 5C-M preflight found no configured backup destination or verified target restore. Do not use the application backup service for this pre-migration copy while its attempt-metadata migration is pending. With owner-approved accounts and protected option files, the proposed native commands are:

```powershell
& 'C:\xampp\mysql\bin\mariadb-dump.exe' --defaults-extra-file=<protected-source-client.cnf> --single-transaction --routines --triggers --hex-blob --no-tablespaces --result-file=<approved-absolute-backup.sql> educatrak
& 'C:\xampp\mysql\bin\mariadb.exe' --defaults-extra-file=<protected-restore-client.cnf> --database=<empty-disposable-restore-db> -e 'source <approved-absolute-backup.sql>'
```

The option file must be the first tool option, contain credentials outside process arguments, be accessible only to the operator, and be removed after use. Check a nonempty dump, its completion marker and SHA-256; restore it and verify table/schema counts, the school-year/section IDs and relationships, representative financial values and the migration ledger. Do not put a real backup in the repository or attach it to an issue/log. A successful dump without a successful restore does not clear this gate.

**Exact proposed archive-only command, NOT executed on the existing target:**

```powershell
& 'C:\Users\ibasc\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe' artisan migrate --database=mysql --path=database/migrations/2026_11_26_175138_add_archive_state_to_school_years_and_sections.php --force --no-interaction
```

Run it from `backend/` only after a separate named-target approval. Then verify: this migration logged once and the other pending files remain pending unless separately authorized; both nullable columns and both named single-column nonunique indexes exist; existing archive values remain null; fresh before/after counts and row fingerprints match; term/exam/student/account/payment/receipt relationships remain intact; authenticated Administrator archive/current-year/section-conflict checks and Accounting read-only checks pass; the same historical report dates and filters return identical payment rows and collection totals before/during/after a controlled fictional or approved target archive exercise. Watch logs for schema errors. Do not create test records in the existing target without separate approval.

**Recovery:** Stop archive writes and new application traffic if any verification fails. Have the named operator restore the verified backup through the approved recovery procedure and deploy a compatible prior application version. MariaDB DDL may have committed partially; do not assume transaction rollback, run `migrate:rollback` on the archive migration, or use `migrate:fresh`, `migrate:refresh`, or `db:wipe`. Revalidate counts, relationships, report totals and roles after recovery.

## 10–12. Tests, remaining risks and verdict

- Focused PHPUnit: 20 passed, 192 assertions across `ArchiveMigrationSafetyTest.php`, `BackupReadTest.php`, and `SchoolStructureArchiveTest.php` on in-memory SQLite. The archive regression suite covers same-ID year/section transitions, current-year rejection, assigned-student 409, inactive-state preservation, retained children and financial rows, unchanged 15,000-cent collection total, permissions, audit evidence and rollback.
- Full Laravel suite: 238 total, 236 passed, 2 skipped, 2,195 assertions. Pint passed. A final `git diff --check` is recorded with the changelog.
- MariaDB 10.11.19: clean path-limited migration, partial-column retry, repeated command, and application backup/restore passed on fictional disposable databases as detailed above. No authenticated MariaDB API/browser test was run.
- The existing target still lacks an owner-approved, verified backup and restore; native dump account privileges, protected destination, target-sized restore time and metadata-lock behavior remain unverified. The three other pending migrations need an explicit rollout decision. The frontend's authenticated browser acceptance also remains pending.

**Verdict:** The code and disposable MariaDB procedure are technically rehearsed. Deployment to the existing `educatrak` database remains **BLOCKED** until the owner authorizes and verifies its native backup/restore copy, confirms the other pending migrations' disposition and maintenance/application ordering, and separately approves the named archive-only migration. This report does not authorize those operations.
## Cleanup follow-up — Thursday, November 26, 2026 — 20:33:51 +08:00

Automatic approval review rejected the attempted recursive removal of the two unique Phase 5C-M2 temporary directories, stating only “blocked by policy.” It also rejected removal of the temporary `client.cnf` credential file. The disposable MariaDB process (PID 9900) was independently identified and gracefully stopped. The directories remain at `%LOCALAPPDATA%\Temp\educatrak-phase5c-m2-92a1cde0e12b4d11b39fc9df04cb61f5` and `%LOCALAPPDATA%\Temp\educatrak-phase5c-m2-recovery-ad35496ea22f43af84ce70acfcf4dd4b`; they contain only fictional test databases, a fictional dump and a temporary local credential. The workspace operator should remove them after independently verifying these exact paths. No existing `educatrak` records or backup files were targeted by cleanup.
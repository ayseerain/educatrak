# Phase 5C-M3 — Existing database backup and deployment approval preparation

**Verdict: BLOCKED.** This is a read-only procedure and approval package. No backup, restore, migration, schema change, target write, server start, or real-data copy was performed. Phase 5C-M2 proved the archive migration and backup tool on a separate fictional MariaDB instance; it did not establish a recovery copy of the existing database.

## 1. Target verification and current limit

PHP 8.4.28 bootstrapped the current Laravel application and inspected only an allowlisted set of effective connection fields. The environment is `local`; the default and selected connection is Laravel `mysql`; host `127.0.0.1`; port `3306`; database `educatrak`; no effective `DB_URL` override. No username or password was printed. A read-only `SELECT @@version, @@port, DATABASE()` could not connect: TCP port 3306 refused the connection. `Test-NetConnection 127.0.0.1 -Port 3306` also returned false. The actual running server identity, current schema, migration ledger and counts therefore **could not be reverified in M3**. Do not start or substitute another server under this approval package.

The earlier Phase 5C-M preflight connected to that configured target and observed MariaDB 10.11.19, 16 recorded migrations and the four files below pending. Treat those as historical evidence, not current target facts. Before any approved backup operation, the operator must independently confirm the live connection's `@@version`, `@@port`, `DATABASE()`, effective Laravel configuration, schema, engine, migration ledger and source identity. Stop if any differs from the approved target or if the port remains unavailable.

## 2. Proposed native source backup — approval A, not executed

| Item | Exact proposal |
| --- | --- |
| Source | MariaDB 10.11.19 at `127.0.0.1:3306`, database `educatrak`, using a separately approved backup account and the verified Laravel target identity. |
| Destination folder | `D:\EducatraKBackups\database\phase-5c-m3` — outside the repository, Laravel storage, web root and MariaDB data directory. This proposed folder was not present at inspection and was not created. |
| Backup file | `D:\EducatraKBackups\database\phase-5c-m3\educatrak-pre-archive-5c-m3.sql`. Refuse to overwrite an existing file; a replacement name requires renewed approval. |
| Utility | Verified local `C:\xampp\mysql\bin\mariadb-dump.exe`, version 10.11.19. Never pass MySQL-only `--set-gtid-purged`. |
| Credentials | A short-lived option file at `D:\EducatraKBackups\database\phase-5c-m3\source-client.cnf`, accessible only to the named operator, with account/password supplied outside the repository and logs. Pass it as the **first** utility option; never put a password in arguments or this report. Remove it after the operation under the approved operator procedure. |

Only after approval A and target re-verification, the proposed command from a protected operator shell is:

```powershell
& 'C:\xampp\mysql\bin\mariadb-dump.exe' --defaults-extra-file=D:\EducatraKBackups\database\phase-5c-m3\source-client.cnf --host=127.0.0.1 --port=3306 --protocol=tcp --single-transaction --quick --routines --triggers --events --hex-blob --no-tablespaces --skip-add-drop-table --result-file=D:\EducatraKBackups\database\phase-5c-m3\educatrak-pre-archive-5c-m3.sql educatrak
```

Before running, verify that all application tables to be protected are InnoDB, the account has required dump privileges, the destination has sufficient free space, and a maintenance window has paused application writes and schema changes. `--single-transaction` gives a consistent transactional snapshot; the paused writes and DDL avoid a mixed operational point and routine/trigger/event changes during the dump. The dump deliberately omits `--databases`, so it does not select or create the original database on import. `--skip-add-drop-table` avoids emitted table-drop statements. The native procedure is required because the pending backup-attempt metadata migration means the current application backup service cannot reliably record a pre-migration attempt on this target.

The operator must restrict inheritance and grant access only to the named backup/restore operators and approved administrators; store the folder on an approved encrypted volume; verify its ACL before writing; and keep the SQL file out of the repository, tickets, chat, screenshots, logs, web serving paths and routine attachments. The owner must specify custody, retention and final secure disposal. Do not enable automatic rotation or delete an existing recovery copy. A failed privilege, disk, tool, or consistency check stops the attempt without considering it a backup.

**Backup success criteria:** correct source identity; exit code zero; no dump errors; nonempty file; MariaDB `-- Dump completed` footer; file size plausible for the source; SHA-256 from `Get-FileHash -Algorithm SHA256` recorded in a protected operator record and independently recomputed before restore. Do not print or commit the dump or sensitive baseline values. The backup is still *unverified for recovery* until the isolated restore below passes.

## 3. Isolated restore — approval B, not executed

The proposed restore target is a **new, separate MariaDB 10.11.19 process**, bound only to `127.0.0.1:34092`, with data directory `D:\EducatraKRestore\phase-5c-m3-instance` and **new database** `educatrak_5c_m3_restore`. These exact destinations require owner approval before creation. The process must not share the original server's data directory, port, service name, credentials or application listener. The source application's `.env` must never point at this restore process. No API/browser server should serve the real-data copy. Protect and encrypt this data directory to the same standard as the dump; limit network and OS access to the named operator. Arrange controlled retention and secure removal after verification, without touching `educatrak` or its backups.

The operator first verifies the new process's `@@port = 34092`, `@@datadir` equals the approved restore path, its version, and the absence of the restore database; then creates only `educatrak_5c_m3_restore` there using an approved transient restore credential. Verify in the protected operator environment that the dump contains no source-database `CREATE DATABASE` or `USE educatrak` directive. Refuse to import if identity, port, data directory, empty-database check, or dump scope fails. The proposed import, after the checksum matches, is:

```powershell
& 'C:\xampp\mysql\bin\mariadb.exe' --defaults-extra-file=D:\EducatraKRestore\phase-5c-m3-client.cnf --host=127.0.0.1 --port=34092 --protocol=tcp --database=educatrak_5c_m3_restore --execute="source D:/EducatraKBackups/database/phase-5c-m3/educatrak-pre-archive-5c-m3.sql"
```

The restore option file is also short-lived, restricted to the operator, and removed by the approved cleanup procedure. Never restore into `educatrak`, port 3306, or a database that already contains tables. Exit code zero and no SQL import errors are necessary but insufficient. Compare the restored copy against a protected, same-time source baseline for:

- Complete table list, core tables, relevant columns, indexes, foreign keys and migration ledger; the four pending statuses must match the source snapshot.
- Student, billing-account, payment and receipt counts; also year, section, term and exam-period counts and selected stable row fingerprints. Keep actual values in the protected operator record, not this repository.
- The same historical daily-collection date/filter/role totals and payment row membership, with `valid` and `void_pending` included under the existing report rule and `voided` excluded. Confirm account due/paid/balance sums and receipt linkage without recalculating or changing them.
- Zero broken links for term→year, exam→term, student→section, billing account→year/student, payment→account/student, and receipt→payment, subject to the schema's nullable relationships; inspect all declared foreign keys as well.

Any mismatch, missing object, import error or inaccessible copy fails the recovery gate. A successful restore is evidence only for the snapshot taken, not approval to migrate or deploy.

## 4. Four pending migrations and recommended order

The file inventory is from repository source. Pending status on the existing target was last observed in Phase 5C-M; it must be rechecked because the server is unavailable in M3. Each file depends on the **already-applied baseline**, and none has a structural dependency on another of these four. The recommended controlled order is the filename/chronological order below, with the application held from affected routes, a verified recovery copy first, an explicit approval for each intended scope, and schema/ledger verification after each step. Do not use plain `artisan migrate`, silently skip a file, or mark a file complete without running and checking it.

| Recommended order / exact file | Prerequisites, data effect and independence | Approval or gate |
| --- | --- | --- |
| 1. `2026_11_23_214732_add_opening_balance_ledger_import.php` | Requires baseline `import_batches`, `users`, `students`, `school_years`. Adds nullable SHA and **required** review fields to `import_batches`; creates `opening_balance_conversions` with FKs and a student/year unique key. Does not post payments or backfill balances. Independent of the other three, but if `import_batches` is no longer empty, adding required fields may fail or require a separate data plan. | Ledger Import owner approves the schema and current row-state check; this is not implicit archive approval. |
| 2. `2026_11_23_214959_add_attempt_details_to_backup_records_table.php` | Requires baseline `backup_records` and `users`. Adds nullable `trigger`, `requested_by`, `started_at`, `file_name`, `checksum_sha256` and a requester FK. Existing history rows retain null values. Independent structurally; required by current backup listing and attempt writes. | Backup/deployment owner approves this schema after native recovery proof. |
| 3. `2026_11_24_000000_backfill_canonical_grade_levels.php` | Requires baseline `grade_levels` and the canonical catalogue. `CanonicalGradeLevels::ensure()` checks order conflicts and **inserts missing** Kinder–Grade 12 records; it does not update existing rows. Independent structurally. The prior preflight saw all 13 names, but current target state is unknown. | Academic-data owner reviews current names/orders and approves any insertion; conflict stops the migration. |
| 4. `2026_11_26_175138_add_archive_state_to_school_years_and_sections.php` | Requires baseline `school_years` and `sections`. Adds nullable `archived_at` and exact named nonunique indexes; no existing row, FK or financial table is rewritten. Hardened retry checks compatible columns and indexes independently. Independent structurally but current archive routes require this schema. | Separate named-target archive migration approval after backup/restore proof and application ordering. |

The `GET /api/backups` controller currently selects `trigger`, `started_at` and `checksum_sha256`; the preflight target lacked the attempt-metadata migration. That migration adds these columns and therefore directly addresses the captured `Unknown column 'trigger'` schema mismatch **if it applies successfully**. The Backups page has not been retested on this target. The dump-tool compatibility correction alone cannot resolve that SELECT error, and a working page also requires successful configuration, privileges and runtime checks. If only the archive file is later approved, the other three remain pending, and the deployment owner must explicitly accept and contain the mixed application/schema state.

## 5. Proposed archive-only deployment — later approval C, not executed

**Prechecks:** After approvals A and B pass, recheck PHP 8.4.28, effective Laravel source, live MariaDB identity/version, migration ledger, all four files' current status, `school_years`/`sections` nullable-column and named-index state, table engines, current-year cardinality, selected row counts/fingerprints, term/exam/student/account/payment/receipt relationships, and protected historical collection baselines. Confirm the exact application version and maintenance window. Hold archive routes and writes until the schema is verified. If partial archive DDL already exists, inspect the column/index shape and reconcile before proceeding; do not assume the migration has never started.

**Exact proposed command from `backend/`, only after separate approval C:**

```powershell
& 'C:\Users\ibasc\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe' artisan migrate --database=mysql --path=database/migrations/2026_11_26_175138_add_archive_state_to_school_years_and_sections.php --force --no-interaction
```

**Postchecks:** Confirm only the approved file was added once to the migration ledger; both nullable timestamp columns and exact single-column nonunique indexes exist; old rows have null archive markers; counts, selected fingerprints and relationships are unchanged; and historical collection rows/totals for the same dates, filters and permissions match the protected pre-migration baseline. Check errors and metadata-lock behavior. On an approved isolated copy, exercise authenticated Administrator archive/restore, current-year 409, assigned-section 409, inactive-section preservation, Accounting read-only access and unchanged historical totals. On the existing target, do not create fictional or real test rows, reassign students, or archive a real record merely for a smoke test without separate authorization; use read-only page/API checks there.

**Failure response:** Stop affected application writes and archive routes, retain logs and the protected baseline, inspect schema and migration ledger for partial DDL, and escalate to the named recovery operator. MariaDB DDL may commit in steps. Do not blindly retry, run `migrate:rollback` (this migration's `down()` deliberately refuses), `migrate:fresh`, `migrate:refresh`, or `db:wipe`. Restore the verified backup through the approved recovery procedure on the intended target only under a separate incident authorization, restore the compatible prior application version, and reverify records, relationships and historical totals before reopening service.

## 6. Remaining blockers and M2 artifact cleanup

The target port is currently unavailable, so its live identity, migration status and baseline are unknown. The named backup folder, backup account and ACL are unapproved and untested. No real-data dump, checksum, isolated restore, restore time, or recovery operator has been verified. The other three migration approvals and controlled application ordering are outstanding. Authenticated archive browser acceptance remains pending. **Deployment remains BLOCKED.**

M2's stopped disposable MariaDB left these **fictional-data** directories. Automatic approval review rejected their deletion with “blocked by policy”; do not bypass that review or confuse them with the proposed real-data locations:

- `C:\Users\ibasc\AppData\Local\Temp\educatrak-phase5c-m2-92a1cde0e12b4d11b39fc9df04cb61f5` — includes MariaDB data files, `baseline.sql`, `fictional-fixture.sql`, logs, and the temporary credential file `client.cnf` at this directory's root.
- `C:\Users\ibasc\AppData\Local\Temp\educatrak-phase5c-m2-recovery-ad35496ea22f43af84ce70acfcf4dd4b` — contains the fictional application dump `educatrak-20261126-202635-xrwnysrs.sql`.

The workspace operator should independently verify these exact paths, confirm no process uses them, and manually remove only those two M2 directories and their contents under local policy. No credential content was opened or printed in M3.

## 7. Explicit owner decisions requested

1. **Approval A — native backup:** Approve or replace the exact source `127.0.0.1:3306/educatrak`, destination folder and filename in section 2, named operator/account, maintenance window, encryption/ACL and custody rules. Approval is conditional on the target being online and reverified as MariaDB 10.11.19. This approval would authorize only the specified backup and checksum work.
2. **Approval B — real-data restore verification:** Separately approve or replace the exact isolated process `127.0.0.1:34092`, data directory `D:\EducatraKRestore\phase-5c-m3-instance`, database `educatrak_5c_m3_restore`, operator, access controls, retention and cleanup. This approval would authorize only creation, import and verification of that isolated copy after approval A succeeds.
3. **Later migration decision:** After the restore evidence, decide the Ledger Import, backup-attempt and canonical-grade files individually and approve a controlled order. A separate **approval C** must name the archive migration, target, application version and window before the command in section 5 may run. Neither A nor B authorizes any migration or real-record archive/restore.

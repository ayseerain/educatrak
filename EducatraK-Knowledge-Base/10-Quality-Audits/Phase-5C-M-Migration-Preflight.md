# Phase 5C-M — Archive-state migration preflight

**Observed:** Thursday, November 26, 2026 — 19:37:07 +08:00. **Decision: BLOCKED.** This was a read-only review of the existing development database. No migration, seeder, backup, repair, data write, or credential change was run. The archive migration remains pending.

## Target and connectivity

Laravel's effective environment is `local`, with an uncached `mysql` connection from `backend/.env`, no effective `DB_URL` override, host `127.0.0.1`, port `3306`, and database **`educatrak`**. The server reports **MariaDB 10.11.19**, not MySQL Community Server. PHP was the verified 8.4.28 executable. `artisan migrate:status` and `db:table` connected successfully. `db:show` reported the same target, then failed while formatting table statistics because this PHP installation lacks `intl`; this did not affect the other metadata queries. No username, password, student row, or financial row was logged here.

## Existing schema and data baseline

`school_years` is InnoDB/`utf8mb4_unicode_ci`, with 7 columns (`id`, `label`, `is_current`, `starts_on`, `ends_on`, timestamps), a unique label index and a nonunique current index. `sections` is InnoDB/`utf8mb4_unicode_ci`, with 6 columns (`id`, `grade_level_id`, `name`, `active`, timestamps), a unique `(grade_level_id,name)` index, and a restrict-on-delete grade FK. Neither table has `archived_at` or its proposed index. The archive migration does not alter existing foreign keys.

Read-only count baseline, measured before and after the SQL dry run:

| Table | Rows |
| --- | ---: |
| `school_years` | 2 |
| `sections` | 5 |
| `terms` | 2 |
| `exam_periods` | 1 |
| `students` | 3 |
| `billing_accounts` | 3 |
| `payments` | 2 |
| `receipts` | 2 |

There is exactly one current school year. These counts establish current presence and that this preflight did not change row counts; they are **not** a backup or proof that a future DDL operation cannot fail. No individual record content was inspected. `import_batches` and `backup_records` each have zero rows; the 13 canonical grade names already appear in Kinder–Grade 12 order.

## Migration ledger and dependencies

The first 16 migration files through `2026_11_20_010000_add_versioning_to_payment_plans` are recorded as batch 1. **Four migrations are pending:**

1. `2026_11_23_214732_add_opening_balance_ledger_import` alters `import_batches` (including required columns) and creates `opening_balance_conversions`. Its table currently has zero rows. This migration is separate from archive state and must be reviewed under the approved Ledger Import rules.
2. `2026_11_23_214959_add_attempt_details_to_backup_records_table` adds backup attempt fields and a user FK. `backup_records` currently has zero rows. It does not provide a working backup destination.
3. `2026_11_24_000000_backfill_canonical_grade_levels` calls `CanonicalGradeLevels::ensure()`. The visible 13 names/order suggest no missing canonical grade, but that migration has not run on this target.
4. `2026_11_26_175138_add_archive_state_to_school_years_and_sections` is the requested archive migration. It depends structurally only on the already-existing `school_years` and `sections` tables, not on the other three pending migrations.

A plain `artisan migrate` would run **all four**, including Ledger Import schema and grade backfill, and is outside the requested archive-only scope. A path-limited run could isolate the archive migration but would leave the other three pending and the application/schema version mixed. That ordering must be explicitly accepted in a later deployment plan; this preflight grants no such approval.

## Exact proposed archive schema changes

The migration's `up()` checks for each column, then adds a nullable indexed timestamp. Laravel's `--pretend` run against the actual MariaDB connection produced these DDL statements, after read-only `information_schema.columns` checks:

```sql
alter table `school_years` add `archived_at` timestamp null;
alter table `school_years` add index `school_years_archived_at_index`(`archived_at`);
alter table `sections` add `archived_at` timestamp null;
alter table `sections` add index `sections_archived_at_index`(`archived_at`);
```

There is no non-null default, row backfill, `UPDATE`, table drop, FK change, ID replacement, or financial-column alteration. Existing rows should read `archived_at = NULL` after successful DDL. The dry run executed no DDL: a subsequent `migrate:status` still listed all four pending, and the eight table counts were identical.

## Integrity and operational risks

- MariaDB DDL may commit individual `ALTER TABLE` statements. If the column add succeeds but its index add fails, the migration may be left unlogged with a partial schema. The current `Schema::hasColumn` guard would then skip that table's whole block on retry, potentially marking the migration complete while the index remains missing. **Do not retry blindly; inspect both columns and indexes and reconcile the migration before approval.** This is a concrete idempotence gap in the prepared migration, not evidence of historical-row loss.
- The migration was tested in PHPUnit's in-memory SQLite only. Older disposable MySQL 8.4/9.7 exercises predate this archive migration. No matching disposable MariaDB 10.11.19 run, populated fixture, table-lock timing, or failure/retry rehearsal exists.
- The current backend archive code queries `archived_at`. It will fail on this pre-migration schema if those settings/student paths are exercised before deployment. Use a controlled application/migration change window and verify the target before enabling those routes.
- An `ALTER TABLE` can hold metadata locks or rebuild a table depending on engine/version/settings. No lock-duration evidence exists for this target. The two affected tables are small now, but that does not establish an online/no-downtime guarantee.
- `down()` deliberately throws `LogicException` rather than dropping archive metadata. Normal `migrate:rollback` is **not** a recovery plan.

## Backup and recovery gate

The repository documents a native dump/checksum/isolated-restore procedure in `04-Development/Backend-Readiness.md`, but this target is **not currently backup-ready**: effective `BACKUP_DESTINATION` is null; `BACKUP_MYSQLDUMP_PATH` is the unqualified `mysqldump` name rather than the required full path; `DatabaseBackupService::unavailableReason()` reports the destination unavailable; and `backup_records` has zero successful entries. The installed local `mysqldump.exe` reports MariaDB 10.11.19 and rejects `--set-gtid-purged=OFF`. The backup service would pass that MySQL-only flag because this MariaDB server is reached through Laravel's `mysql` driver. No current restorable copy of `educatrak` was verified. Prior disposable MySQL backup/restore tests do not cover this database.

Before any write, the deployment owner must provide or approve a MariaDB-compatible backup method, destination outside the repository, operator, protected copy and checksum; then **prove restoration into a separately named disposable database** with count/relationship checks. Keep credentials out of command lines and logs. Recovery after a partial DDL requires owner-controlled restoration of that verified backup and application rollback; never run `migrate:fresh`, `migrate:refresh`, or the migration's `down()` against this database.

## Required isolated MariaDB rehearsal

Authorize a separately named, disposable **MariaDB 10.11.19** database with fictional school years, sections, attached terms/exams/students, billing accounts, payments and receipts. Match the target charset/collation and relevant SQL mode. Apply only the reviewed archive migration there, verify null defaults, both indexes, FK and row-count preservation, archive/restore/API behavior, and backup/restore. Rehearse a failed index step and safe retry or revise the migration's column/index guards before considering the existing target. No disposable database was created or migrated in this read-only preflight.

## Proposed execution and verification after separate approval

Only after the owner names and approves `127.0.0.1:3306` / `educatrak` on MariaDB 10.11.19, the backup/restore gate passes, the partial-retry risk is resolved, the other three pending migrations have an explicit disposition, and the disposable MariaDB rehearsal passes, recheck effective config and `migrate:status`. The **proposed, not executed** archive-only command from `backend/` is:

```powershell
& 'C:\Users\ibasc\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe' artisan migrate --database=mysql --path=database/migrations/2026_11_26_175138_add_archive_state_to_school_years_and_sections.php --force --no-interaction
```

After an authorized run: verify the migration ledger records this file once; inspect both nullable columns and named indexes; compare counts for all eight baseline tables and representative FK/financial invariants with a *fresh* immediately-pre-run snapshot; confirm existing rows have null archive state; run focused authenticated Administrator/Accounting role checks and historical collection comparisons; inspect application logs for schema errors. Do not infer row integrity from counts alone. If any step fails, stop archive writes and use the approved recovery operator and verified backup; do not attempt an undocumented repair.

**Release verdict:** **BLOCKED**, then **REQUIRES APPROVAL** after the backup, migration-idempotence, pending-migration disposition and disposable MariaDB gates are resolved. No migration execution is authorized by this report.

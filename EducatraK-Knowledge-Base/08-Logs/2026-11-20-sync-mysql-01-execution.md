# SYNC-MYSQL-01 execution — MySQL 8.4 validation

**Logged:** Friday, November 20, 2026 — 13:50:30 +08:00
**Agent:** Claude Code
**Branch:** `feature/mysql-validation` from `main` at `d4dddf1`. Commits `4c3dcd0` (test key) and `fcba0b5` (MySQL fixes and lock test).

## Owner decisions (planning session, 2026-11-20)

- Target engine: **MySQL 8.4 LTS**.
- Disposable target: **throwaway local Docker containers** with fictional data only. They are destroyed after the run, and `backend/.env` is never used. This replaces the runbook's "no local substitute image" precondition for this run only.
- Test key: a fixed, test-only `APP_KEY` in `backend/phpunit.xml`.

## Environment identity

- Image `mysql:8.4`. Containers `et-mysql-val` (127.0.0.1:33061, db `et_val`) and `et-mysql-restore` (127.0.0.1:33062, db `et_restore`).
- `VERSION()` 8.4.13; charset `utf8mb4`; collation `utf8mb4_unicode_ci`; isolation `REPEATABLE-READ`; `time_zone` SYSTEM; `innodb_lock_wait_timeout` 50.
- `sql_mode`: `ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`. Laravel also connects with `strict => true`.
- Client: PHP 8.5.6 with `pdo_mysql`. Docker Engine 29.9.2.
- Credentials were random, held only in process environment and in a scratch file outside the repository, and were deleted afterwards. The validation user was granted global privileges inside the disposable container, which is broader than least privilege. It was acceptable only because the container was throwaway.

## Results

1. **Migrations.** The first `php artisan migrate` failed on `2026_10_09_062801_create_educatrak_operations_tables.php` with error 1059. The generated index name `clearance_records_student_id_school_year_id_kind_exam_period_id_unique` is 72 characters, over MySQL's 64 limit. Fixed with the explicit name `clearance_records_student_year_kind_exam_unique` (same columns). Then `migrate:fresh` ran all 16 migrations. That index was the only one over the limit (all migrations grepped).
2. **W1b populated upgrade/rollback.** Rolled back one step, inserted a fictional plan, user, student, school year and billing account, then ran up, down and up again. Plan id 1 became version 1, with `updated_at` unchanged. `billing_accounts.payment_plan_id` stayed 1 throughout. The FK `billing_accounts_payment_plan_id_foreign` was `SET NULL` after down and `RESTRICT` after up. Deleting the used plan failed with error 1451. With a version 2 plan present, rollback refused with "Cannot roll back payment-plan versioning…".
3. **Full suite on MySQL.** The first run had 1 failure: `CashierOperationsTest` used `assertSame` on the close-out `system_totals` JSON, and MySQL normalizes JSON key order. Values were identical, so this was not a data defect. The assertion now compares per key. Final run: 200 tests, 199 passed, 1 skipped, 1,650 assertions. The skip is the SQLite-only migration test, because MySQL DDL implicitly commits its `LazilyRefreshDatabase` transaction; step 2 covers it.
4. **Row locks.** New `tests/Feature/MySqlRowLockTest.php` (2 tests, 8 assertions, MySQL only) uses two real connections. While the first holds `lockForUpdate` on `receipt_sequences` id 1 and a billing account, the second gets error 1205 (lock wait timeout) on both. After release, the balance is unchanged. A duplicate `(user_id, key)` payment idempotency row is rejected with SQLSTATE 23000.
5. **Migration lock.** After `db:wipe`, two concurrent `php artisan migrate --isolated --force` runs used `CACHE_STORE=file`. One applied all migrations. The other printed "The [migrate] command is already running." The `migrations` table had 16 rows, all distinct.
6. **Backup/restore.** Seeded fictional rows (1 user, 2 students, 2 accounts, 3 installments, 1 payment, 1 allocation, 1 receipt, sequence 1). `mysqldump --single-transaction` produced 54,308 bytes, restored into `et_restore`. Every check was identical between source and restore: counts per table, 16 migrations, sequence 1, balance sum 350,000 centavos, 0 orphan allocations/receipts and 46 foreign keys. Deleting a paid payment in the restored copy failed with error 1451.
7. **Cleanup.** `docker rm -f -v` removed both containers and their volumes. The scratch password, dump and output files were deleted.

## SQLite regression

Plain `php artisan test --compact` with no process key: 200 tests, 198 passed, 2 skipped (the MySQL lock tests), 1,652 assertions. `vendor/bin/pint` passed on the four changed PHP files.

## Not done / limits

- `Reference-Schema.sql` was not compared line by line against the live schema. Constraint behavior is covered by the suite and by steps 2, 4 and 6.
- Concurrency is proven at engine level (row locks, unique keys). Parallel HTTP requests for payment, void and close-out were not run.
- This is local Docker evidence of MySQL 8.4 compatibility. It is **not** deployment readiness. The school's real server configuration, backup destination/operator, scheduler, workers, TLS/cookies, secrets and monitoring (B13) remain open.

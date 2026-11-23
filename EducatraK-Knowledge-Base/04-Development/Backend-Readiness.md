# Backend Environment and Readiness — feature/backend-foundation

> Current readiness is in the 2026-11-09 reconciliation section. D1–D17 and nine-route results below describe the historical Part 1 snapshot at `ae6fcee9d9edc6f592ce4e18611f995c0f00e458`; they are not the current backend inventory.

## Verified task baseline

- Branch: `feature/backend-foundation`, matching
  `origin/feature/backend-foundation`.
- Task starting commit: `ae6fcee9d9edc6f592ce4e18611f995c0f00e458`.
- Working tree was clean before work. This commit is the merge base with
  `main`; `main` is 57 commits ahead and this branch is 0 commits ahead.
- Owner selected this branch to audit as-is. No merge, rebase, fetch, commit,
  push, or backend/frontend source change was performed.
- Branch inventory: Laravel 13.35.0 lockfile, six migrations, 28 models,
  28 factories, three API controllers, and nine registered API routes. This differs from
  the newer `main` snapshot and from counts in the supplied preparation
  prompt. See the API contract and database review for evidence.
- The branch has one dated decision file (September 29, 2026), plus
  `Open-Decisions.md` and `Reconciled-Decisions.md`; it does not contain
  the eight dated decision files expected by the prompt. Later decisions
  referenced by the current task are absent from this branch.

## D1–D17 status

| ID | Verified status on selected branch | Owner decision or follow-up |
|---|---|---|
| D1 | `composer.json` requires PHP `^8.3`; lockfile has Laravel `v13.35.0` and Sanctum `v4.3.3`. Host PHP is 8.5.10. Composer is not on PATH; MySQL client is not on PATH. | Confirm Composer and server DB versions on the deployment host. Do not change locked versions. |
| D2 | `.env.example` uses MySQL; PHPUnit uses SQLite `:memory:`. MySQL config is strict and uses `utf8mb4`. | Confirm exact deployment MySQL version; no local MySQL version could be read. |
| D3 | Nine unversioned `/api` routes are registered. Stateful Sanctum is enabled. CSRF endpoint is package-provided at `/sanctum/csrf-cookie`. | No new prefix or endpoint approved. Preserve current route behavior. |
| D4 | Session driver defaults to database; lifetime is 120 minutes; `expire_on_close=false`, `http_only=true`, `same_site=lax`; secure cookie is environment-driven. Frontend mock session expires after 30 minutes idle. | Resolve session lifetime, idle versus fixed renewal, cookie security, and remember-me behavior. |
| D5 | Existing JSON uses Laravel `{message}` and validation `{message,errors}`. Observed login failures are 422/403; middleware gives 401/403. | A common `code/message/errors/request_id` envelope is only a proposal. Confirm before changing the contract. |
| D6 | App timezone defaults to `Asia/Manila`; Laravel emits ISO timestamps in auth profiles. | Keep server time authoritative; verify domain serialization as APIs are added. |
| D7 | Login limiter is 5/minute per lowercased username and IP. No general API limiter was found. | Confirm whether other endpoints need throttles and their limits. |
| D8 | No per-role idle middleware exists on this branch. | Confirm idle timeout, warning period, and whether active use extends sessions. |
| D9 | No common security-header middleware or sensitive-response no-store policy was found. | Confirm the proposed headers after deployment HTTPS/origin decisions. HSTS requires HTTPS. |
| D10 | Default log stack uses the single-file channel. A daily channel is not configured as default. Audit rows store before/after JSON, IP and user-agent. | Audit/log retention and snapshot privacy are not settled. Do not infer periods. |
| D11 | Existing structure is Laravel `Actions`, `Http/Controllers/Api`, `Models`, `Services`, and `Support`; only auth, user administration, and security-event controllers exist. | Keep the current structure. No module-package or `app/Modules` change is approved. |
| D12 | No `.github/workflows/` directory found. Composer exposes `test`; PHPUnit and Pint are dependencies. | CI additions remain optional and require owner scope. |
| D13 | No dedicated backend API contract existed before this task. This task authorizes the contract document; no OpenAPI file exists. | OpenAPI generation remains a later approval. |
| D14 | Laravel conventions and PHPUnit are present. No `Model::shouldBeStrict`, global `strict_types`, Larastan, or composer analyse/lint script was found. | Decide any strictness/static-analysis expansion separately. |
| D15 | Nine routes exist; no `/api/health` route. Laravel registers `/up` as health. | Adding `GET /api/health` is a new endpoint and needs approval. |
| D16 | `.env.example` uses DB user `educatrak`; config fallback uses `root`. Actual deployment accounts and DB topology were not available. | Use a least-privilege application account; confirm whether DB is local or remote. No server commands were run. |
| D17 | `bootstrap/app.php` enables stateful API; `config/cors.php` is absent. Secure cookie depends on environment. | Confirm allowed origins, HTTPS/TLS termination, proxy trust, and secure-cookie settings. No wildcard credentialed CORS. |

Unsettled owner decisions are D2, D4, D5, D7–D10, D12–D17 (13 IDs).
The contract records all nine existing routes; no proposed routes are treated
as implemented. Five database design items remain open in
`Database-Review.md`.

## Environment and commands

| Check | Result |
|---|---|
| PHP | `php -v`: PHP 8.5.10 CLI, Windows x64. |
| Composer | `composer --version`: unavailable; command not recognized. |
| MySQL client | `mysql --version`: unavailable; command not recognized. |
| Laravel route inventory | `php artisan route:list --path=api --except-vendor`: passed; 9 routes. |
| Frontend build | `npm.cmd run build`: passed (TypeScript and Vite production build). |
| Frontend tests | `npm.cmd test`: passed, 3 files and 60 tests. React Router emitted two future-flag warnings. |
| Backend test suite | Not run in this preparation phase. |
| Migration or live database check | Not run. No database connection, reset, or schema write attempted. |
| Frontend lint | No lint script exists in `frontend/package.json`. |

The backend uses MySQL in its example environment and SQLite in tests. The
school LAN topology, server PHP extensions, MySQL patch version, HTTPS/TLS
termination, scheduler, backup destination, and restore process remain
unverified. Laravel schedules are not present in this branch's
`routes/console.php`; do not assume scheduled billing or archive jobs exist.

Before deployment, the owner/operator must verify the server PHP/extensions,
use a non-root least-privilege DB account, set secrets outside version control,
confirm HTTPS and cookie settings, configure the approved scheduler, and test a
backup restore. No topology, retention period, or purge semantics are assumed.

## Branch gaps and phase boundary

The selected branch is a historical foundation snapshot. Its backend API has
only authentication and user/security administration. The expected
`frontend/src/api/mock/` MockDB directory is absent; this branch uses a
small `mockAdapter.ts` instead. Domain CRUD/payment/report routes, LRN
import, and the November 2026 decisions are not present here.

The branch did not contain the central
`08-Logs/Agent Sessions/changelogs.md` or
`08-Logs/Agent Sessions/Issues-and-TODOs.md` before this task. A central
changelog entry and a session-log entry were added. No issue tracker is
present to update; the branch mismatch is recorded here for owner follow-up.

At the time of this historical Part 1 snapshot, authorization covered only
preparation documents and required logs; it did not cover Part 1b, Part 2, or
Part 3. The later owner approvals and Part 2 result are recorded below.

## 2026-11-09 current-branch readiness reconciliation

This section supersedes the historical nine-route / old-host snapshot above. Selected branch: `feature/backend-foundation`; current baseline `b4ee0e3f535e07810d87a3106268e3965029f7a4`. Part 1's original evidence remains historical at `ae6fcee9d9edc6f592ce4e18611f995c0f00e458`.

| Check | Current evidence/status | Owner decision or next action |
|---|---|---|
| Laravel/runtime | Existing Laravel backend; current framework version should be taken from lockfile/composer metadata. Host/deployment PHP and Composer versions are unverified in this pass. | Verify deployment machine before setup. |
| Database | 14 migration files, 29 models. MySQL target; SQLite is test configuration. Deployment server/version/topology unverified. | Verify target version and topology; no DB connection/load attempted. |
| API | `php artisan route:list --path=api --except-vendor` passed; 51 routes. | Existing route inventory is documented in API contract. |
| Session | Backend `config/session.php` defaults to 120 minutes; owner policy is 30 minutes idle, activity renews, warn at one minute. Frontend warning/idle behavior is a separate implementation. | No code alignment in Part 1b. Track separately. |
| Errors | Current Laravel `{message}` and validation `{message,errors}` retained by owner decision. | Any envelope change needs separate approval. |
| Deployment/TLS/jobs | Owner says PHP/Composer/MySQL versions, topology, TLS owner and scheduler owner remain unverified. | Follow-up only. Do not treat 00:05/00:15 schedules as configured or verified. |
| Development DB hardening | Documentation checklist only: secure DBA/root, use local loopback bind only when DB truly local, create limited app account, avoid root app credentials, protect credentials/backups. No commands executed. | Apply only in separately authorized environment setup. |
| LAN readiness | Least-privilege service account and HTTPS before real student data crosses a network are deployment requirements; current topology/proxy not verified. | Confirm before real-data use. |
| Documentation drift | Older consolidated specification text still contains retired clearance and exam-permit descriptions; active modules and role/workflow requirements are being reconciled to the November 5 retirement decision. Clearance tables/models remain historical only. | Keep historical schema; do not expose clearance routes or permissions. Reconcile remaining canonical documentation references in a documentation task. |
| Design/test readiness | API contract updated; DB review current. ERD, dictionary, and descriptive reference SQL drafts now exist; no target-MySQL load, constraint check, or schema approval. | B4 documentation drafts are complete; B7 remains blocked. |
| Part 1b detail audit | API contract now lists 51 routes individually and inventories all 65 MockDB function exports. Route summaries are linked to current action/middleware evidence; exact per-route validation/serialization fields and direct test assertions remain incomplete where controllers lack dedicated requests/resources. | Finish exact handler-level contract/test mapping before treating this as client integration specification. |
| Model/database mapping | Earlier DB-02 statement was stale; current models contain 39 public methods excluding casts across 16 model files. | Reconcile model methods with migration FKs and route/query use; do not infer completeness from counts. |
| Guardian relationship scope | Owner confirmed per student–guardian link on Nov 10; SQL currently stores it on `guardians`. | Keep schema/API correction separately authorized; ownership/lifecycle and primary-contact policy remain open. |

Route inventory and export names/lines were read from current source. No backend/frontend tests, builds, live database commands, deployment setup, scheduler, TLS, backup restore, or schema constraints were run. No live data or credentials were accessed.

## 2026-11-10 Part 2: approved Laravel foundation alignment

Part 2 was authorized on `feature/backend-foundation` at `ca37699ded2df8f9ea26aa12724c8b42e6b75b90`. Existing working-tree edits were preserved. Scope stayed backend-only; no schema, routes, dependencies, or frontend files changed.

| B0 area | Current evidence and outcome |
|---|---|
| B0.1 Scaffold/runtime | Existing Laravel foundation retained. Local PHP is 8.5.10; Composer is unavailable. No framework/package change. |
| B0.2 Structure | Existing `Actions`, `Http`, `Models`, `Services`, `Support`, and `Console` structure retained. No restructuring. |
| B0.3 Configuration | Owner approved a 30-minute idle session with activity renewal and a one-minute warning. Laravel `SESSION_LIFETIME`, fallback, example, PHPUnit environment, and local backend `.env` now use 30. Existing cookie flags, driver, and remember-me behavior are unchanged; frontend warning was not edited. |
| B0.4 Sanctum/CSRF/CORS | Stateful Sanctum remains enabled; API routes use web middleware; Twilio callback is the explicit CSRF exception and validates provider signature. No CORS config or security-header middleware was found. Origins, TLS/proxy, cookie security, and header baseline remain unverified/unapproved; no change. |
| B0.5 Middleware/throttles | Active-user, capability, and forced-password-change middleware remain. Login stays limited to five attempts per minute per normalized username/IP. Owner declined a general API limiter. Six-role behavior remains covered by existing feature tests. |
| B0.6 Errors | Current Laravel `{message}` and validation `{message,errors}` shape retained. No envelope or status-code change. |
| B0.7 Audit | Existing `AuditLogger` records actor/action/entity, before/after snapshots, IP, user-agent, and time. Snapshot minimization is owner policy; retention and purge remain unresolved. No audit data or retention change. |
| B0.8 Shared financial/date rules | Existing integer-centavo, idempotency, payment-allocation, receipt, void, and Manila-date paths retained. No schema or shared-helper changes. Full backend suite passes. |
| B0.9 Routes/health | Current route list has 51 routes; framework `/up` remains the health endpoint. Owner declined adding `/api/health`. No route changed. |
| B0.10 Documentation/CI | Part 2 results and test baseline recorded in this readiness note and existing central logs. No GitHub workflow directory was found; no CI or dependency added. |

### Validation

- `php artisan test --compact tests/Feature/AuthenticationTest.php`: passed, 10 tests / 36 assertions.
- `php artisan test --compact`: passed, 146 tests / 1,029 assertions.
- `vendor/bin/pint --dirty --format agent`: passed.
- `php artisan config:show session.lifetime`: returned 30; `php artisan route:list --path=api --except-vendor`: 51 routes.
- Frontend baseline (unchanged): `npm.cmd run build` passed; `npm.cmd test` had 248 passed and one failure in `src/test/liveStudents.test.tsx`, where the Registrar profile unexpectedly contains “Student number.” No frontend file was edited.
- Composer and MySQL CLIs are unavailable; `composer audit` and live MySQL checks could not run. No migration/database command ran.

### Remaining gates

Audit/log retention and the published Privacy Policy conflict remain open. Deployment PHP/Composer/MySQL topology, HTTPS/TLS, CORS origins, scheduler, backup destination/restore, and least-privilege database account remain unverified. API-wide throttling and `/api/health` were declined. Security headers, audit field-allowlisting changes, strict-model enforcement, new middleware, CI, and all schema work were not approved and were not implemented. Part 3 has not started.


## 2026-11-23 Local backup operation (SRS v3.0)

Source: `06-Decisions/2026-11-22-srs-v3-policy-confirmations.md`, owner answer 4. Status: implemented and tested with a faked `mysqldump` process only. No real MySQL dump, Task Scheduler setup, or restore has been performed yet.

### Configuration (`backend/.env`)

| Key | Meaning |
|---|---|
| `BACKUP_DESTINATION` | Existing, writable folder outside the application folder, e.g. `D:\EducatraKBackups\database`. Restrict NTFS permissions to the Windows account that runs the scheduler and to IT administrators. |
| `BACKUP_DAILY_AT` | Daily time in Asia/Manila, default `21:00`. |
| `BACKUP_MYSQLDUMP_PATH` | Full path to the `mysqldump.exe` that matches the installed MySQL server version. |
| `BACKUP_TIMEOUT_SECONDS` | Process timeout, default `900`. |
| `BACKUP_ROTATION_ENABLED` | Default `false`. When `true`, keeps the 30 newest backups plus the newest backup of each of the 12 most recent months, and deletes other `educatrak-YYYYMMDD-HHMMSS-xxxxxxxx.sql` files in the destination. Turn on only after deletion of old recovery copies is approved. |

The database credentials come from the existing `DB_*` settings. They are passed to `mysqldump` through a temporary option file that is deleted after each run, never on the command line, in the API, or in the browser.

### Run the scheduler on the office computer

1. Open Task Scheduler and create a task that runs whether the user is signed in or not.
2. Trigger: daily, repeat every 1 minute for 1 day.
3. Action: program `C:\path\to\php.exe`, arguments `artisan schedule:run`, start in `C:\path\to\educatrak\backend`.
4. Confirm with `php artisan schedule:list` that `educatrak:backup-database` appears at the configured time.
5. Run `php artisan educatrak:backup-database` once by hand. Then check the new file and the Backups history.

### Isolated restore test (quarterly)

1. Copy one backup file to the test machine. Recompute `certutil -hashfile <file> SHA256` and compare it with the history checksum.
2. Create a disposable database, e.g. `educatrak_restore_test`. Never restore into the live database.
3. Load it: `mysql -u <user> -p educatrak_restore_test < <file>`.
4. Point a separate test copy of the app at that database (`DB_DATABASE=educatrak_restore_test`) and run `php artisan migrate --pretend`. It should report nothing to run.
5. Compare row counts with the live system at the backup time: `students`, `billing_accounts`, `payments`, `receipts`, `receipt_sequences`, `adjustments`, `opening_balance_conversions`, `audit_entries`.
6. Smoke test: log in as each fictional or test role, open a student, a billing account and a receipt reprint.
7. Record date, file, checksum, counts, result and the person who ran it. Then drop the disposable database.

There is no restore endpoint, and none should be added.

### Disk capacity while rotation is off

Automatic deletion of old backups is off and stays off until the conditions in the decision record are approved. Every backup is kept, so the destination grows by about one database dump per day.

- The Backups page shows free space at the destination. Check it weekly, and before school-year start or other large data loads.
- Estimate days left as free space ÷ size of the latest backup. If that is under 60 days, tell the deployment owner.
- When the drive is full, backups fail and the history shows "The backup file was empty or incomplete" or a tool error. The live database is not affected, but no new recovery copy exists.
- Do not delete backup files by hand without the backup operator's approval, and record any manual removal.
- Keep at least one recent copy on separate media, for example an external drive stored securely, as decided by the deployment owner. This is not automated.


### Disposable MySQL verification, 2026-11-23

Recorded Monday, November 23, 2026 — 23:50:47 +08:00. This was a disposable test, not production readiness.

**Environment.** Windows 11, PHP 8.4, MySQL Community Server 9.7.0. A separate `mysqld` instance was initialized in a scratch folder, listened only on `127.0.0.1:3399`, and was shut down and deleted afterwards. The workstation's existing MySQL server on port 3306 was not touched. Server collation was `utf8mb4_0900_ai_ci`; the databases were created with Laravel's `utf8mb4_unicode_ci`. Data came from the fictional `DemoDataSeeder` plus two fictional cash payments recorded through `RecordPaymentAction`.

**Accounts.**
- `edtk_app`: `ALL` on the source database plus global `FLUSH_TABLES`.
- `edtk_restore`: `ALL` on the restore database only.
- Random passwords were kept in a scratch file outside Git and deleted afterwards.

**Results.**
1. The first `php artisan educatrak:backup-database` run failed and recorded a sanitized error. The cause: MySQL 9.7's `mysqldump --single-transaction` needs the global `RELOAD` or `FLUSH_TABLES` privilege. The service now adds a fixed hint for "Access denied" failures and still stores no raw tool output.
2. After `GRANT FLUSH_TABLES ON *.* TO 'edtk_app'@'127.0.0.1'`, the backup succeeded: 64 KB file, history row with trigger, size and checksum, plus a `backup.succeeded` audit entry. The SHA-256 of the file matched the stored checksum, and the file ended with `-- Dump completed`.
3. The first restore failed for the restore-only account. The dump contained GTID and `SQL_LOG_BIN` statements that need admin privileges. The service now passes `--set-gtid-purged=OFF` (MySQL driver only), and the next dump restored cleanly with database-level privileges.
4. Source and restored databases matched exactly on:
   - row counts for 15 core tables;
   - account, installment, payment and allocation totals;
   - receipt numbers `OR-2026-000001` and `OR-2026-000002`, and receipt sequence 2;
   - student LRNs;
   - zero orphan allocations and receipts, and zero balance mismatches;
   - 52 foreign keys.
5. On the restored database:
   - all 40 tables are InnoDB with `utf8mb4_unicode_ci`;
   - `php artisan migrate --pretend` reported "Nothing to migrate";
   - all five sample staff logins validated;
   - the account → student → installments → payment → receipt relations resolved.
6. The database password did not appear in the backup file or `storage/logs/laravel.log`. No temporary credentials file remained. No backup file entered the repository.

**Required production privileges for the backup account:** `SELECT`, `SHOW VIEW`, `TRIGGER`, `LOCK TABLES` on the EducaTrak database, plus global `FLUSH_TABLES` (or `RELOAD`). Use `BACKUP_DB_CONNECTION` to point backups at a separate least-privilege connection if the application account should not hold `FLUSH_TABLES`.

**Restore command used:** `mysql -u <restore user> -p <empty disposable database> < <backup file>`.

**Limitations.**
- Single workstation and small fictional dataset.
- No Windows Task Scheduler run.
- No measurement of restore time at realistic size.
- No test on the office computer.
- MariaDB's `mysqldump` (for example from XAMPP) does not accept `--set-gtid-purged`; use the MySQL client tools that match the server.

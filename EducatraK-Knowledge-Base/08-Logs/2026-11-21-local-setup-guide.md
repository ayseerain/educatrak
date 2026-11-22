# Local Setup Guide Record

**Timestamp:** Saturday, November 21, 2026 — 17:42:39 +08:00

## Change

Added the root-level `setup-step.md` for teammates who need to test EducatraK on Windows. It documents both the MockDB-only UI path and the full local Laravel/MySQL path, including local environment values, fictional demo credentials, demo reset, validation commands, and troubleshooting.

## Evidence

The guide was matched to the current frontend scripts and Vite proxy, Laravel `composer.json`, `backend/.env.example`, `DemoDataSeeder`, `BootstrapSuperAdministrator` command, and PHPUnit SQLite test configuration. The linked CLINIQ guide was used only as a structure reference.

## Validation

- Documentation paths and commands were reviewed against the current repository configuration.
- No runtime setup, migrations, seed, or test command was run because this task changed documentation only.

## Follow-up

The root `README.md` still describes an obsolete pre-scaffold snapshot. It was not changed in this focused setup-guide task.

## Update — Saturday, November 21, 2026 — 18:41:27 +08:00

The owner clarified that the local MySQL database must be named `educatrak`, not `educatrak_demo`. Updated `setup-step.md` to create and configure `educatrak` and its matching `educatrak` local account, and changed the surrounding wording from a demo database to the local database. The seeded records and test accounts remain explicitly fictional.

## Update — Saturday, November 21, 2026 — 18:43:57 +08:00

Made the distinction between MySQL accounts and EducatraK web-app sign-in accounts explicit in `setup-step.md`. The guide now includes a labeled comparison table and directs a teammate to create a personal fictional Super Administrator with `php artisan educatrak:bootstrap-super-admin` after seeding.

## Update — Saturday, November 21, 2026 — 19:56:22 +08:00

Added a Composer recovery subsection after a teammate encountered the Windows `composer` command-not-found error. It verifies the required PHP 8.4.1+ runtime first, directs the user to the official Composer Windows installer, explains the PHP selection and `PATH` refresh, and requires `composer --version` to pass before dependency installation.

## Update — Saturday, November 21, 2026 — 20:20:13 +08:00

Clarified that `educatrak:bootstrap-super-admin` is intentionally one-time and cannot create ordinary staff accounts. The guide now gives the in-app User & access management flow, the temporary-password behavior, and the current role-creation limits; it identifies the seeded Accounting account as the available test path for that role.

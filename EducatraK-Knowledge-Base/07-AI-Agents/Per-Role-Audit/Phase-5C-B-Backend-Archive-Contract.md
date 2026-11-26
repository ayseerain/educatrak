# Phase 5C-B backend archive contract and deployment handoff

> **Phase 5C-M preflight update:** The configured `educatrak` target is MariaDB 10.11.19 with three older pending migrations. The archive migration is **blocked** from execution by absent verified backup/restore, absent disposable MariaDB rehearsal, and a partial-DDL retry/index gap. See `../../10-Quality-Audits/Phase-5C-M-Migration-Preflight.md`; the proposed command below is not yet approved.

**State:** Backend code and additive migration file prepared and verified in PHPUnit's in-memory SQLite. No migration was executed on the owner's development or production MySQL; no frontend code was changed. ADM-05/07/08 remain open until approved migration, frontend integration, and authenticated acceptance.

## Approved rules implemented

- The owner explicitly superseded the earlier proposal to exclude archived-year payments: historical collection reports retain identical totals, rows, dates, filters and permissions before archive, while archived, and after restore. Archive classifies School Settings management only. No payment, receipt, account, allocation, void, Ledger Import, or report formula was changed.
- An Administrator can archive a non-current school year and restore the same ID as non-current. Terms and exam periods stay attached. An archived year's label may be corrected with audit; date, term and exam writes require restoration. Billing-account date locks remain after restoration.
- A section has `archived_at` independent of `active`. Active and inactive sections may be archived; restoration keeps their previous `active` value. Any student currently assigned to a section must be reassigned before the section can be archived. Archive never reassigns or clears students. Existing legacy links to an archived section remain readable and can be retained on unrelated student edits. Section names stay reserved across states.
- School-year and section transitions use database transactions, row locks, and the existing `AuditLogger` for actor/time/before/after evidence. Administrator `settings.system.manage` remains the only write capability; Accounting `settings.system.view` remains read-only.

## Exact API contract

| Route | Request | Success | Rejection |
| --- | --- | --- | --- |
| `GET /api/settings/school-years` | `view=all|active|archived`, default `all` | Existing `{data: year[]}`; each year adds `archivedAt: ISO timestamp|null`; terms/exams remain nested. | Invalid view 422; unauthorized 403. |
| `POST /api/settings/school-years/{schoolYear}/archive` | Empty body | 200 `{data: year}`; same ID, `current=false`, non-null `archivedAt`. | Current/already archived 409; unknown ID 404; unauthorized 403. |
| `POST /api/settings/school-years/{schoolYear}/restore` | Empty body | 200 `{data: year}`; same ID, `current=false`, `archivedAt=null`. | Not archived 409; unknown 404; unauthorized 403. |
| `GET /api/settings/grade-levels` | `section_view=all|active|archived`, default `all` | Existing grade array in fixed Kinder–Grade 12 order; each grade's `sections` array follows view. Sections add `archivedAt: ISO timestamp|null` and retain the separate `active: boolean`. | Invalid view 422; unauthorized 403. |
| `POST /api/settings/sections/{section}/archive` | Empty body | 200 `{data: section}` with non-null `archivedAt`; same ID and `active`. | Assigned student/already archived 409; unknown 404; unauthorized 403. |
| `POST /api/settings/sections/{section}/restore` | Empty body | 200 `{data: section}` with `archivedAt=null`; same ID and prior `active`. | Not archived 409; unknown 404; unauthorized 403. |

`view=active` and `section_view=active` mean **unarchived**, including sections whose separate `active` flag is false. The default `all` preserves the older GET response population. New state fields are additive. `PATCH` year accepts label only while archived; its date keys, make-current and term/exam writes yield 409. `PATCH` section accepts a unique name correction while archived but rejects an `active` change with 409. Direct student POST/PATCH assignment to inactive or archived sections yields 422; record options omit them. There is no independent term archive endpoint or report-scope endpoint.

There is no student import route that writes `section_id`; the existing Ledger Import matches an existing LRN and does not create or reassign students. If a future import path assigns sections, it must enforce the same availability guard before release.

## Migration and data safety

The sole new migration is `backend/database/migrations/2026_11_26_175138_add_archive_state_to_school_years_and_sections.php`. Its `up()` checks column presence and adds nullable indexed `archived_at` to `school_years` and `sections`; existing rows default to null. It changes no money or foreign-key columns. Its `down()` deliberately refuses to drop the metadata: a verified backup and a separate data-preservation decision are required for reversal. MySQL DDL may auto-commit; do not assume transactional rollback.

**Before any owner MySQL deployment:** obtain explicit approval for the named environment and migration. Confirm the absolute target, effective connection and database name without printing secrets; take and verify a restorable backup; inspect `migrate:status` and the two table schemas read-only; confirm the archive columns/indexes are absent or compatible; confirm a current-year row and preserve IDs/row counts. Rehearse on a separately authorized disposable MySQL clone if MySQL-specific DDL behavior needs proof. Schedule a maintenance window and application/code ordering so archive routes are not used before the column exists. The exact application step is the single reviewed migration, using PHP 8.4.28 and Laravel's normal `artisan migrate --path=database/migrations/2026_11_26_175138_add_archive_state_to_school_years_and_sections.php --force` **only after** the deployment owner confirms the target and approves execution. Verify schema, index, row counts, null archive defaults, role access, and smoke tests; record the outcome. Recovery is to stop archive writes, restore the verified backup through the owner-controlled recovery process, and redeploy the prior application version; do not run this migration's destructive reversal. No real database status, backup, or row counts were inspected in this task.

## Frontend next step

After the approved migration is deployed to its intended environment, integrate only School Settings `/settings/school` with the documented `view` and `section_view` filters and transition routes. Keep one grade visible at a time; show Archive/Restore only to Administrator and read-only history to Accounting. Disable Archive for the current year and explain the 409 student-reassignment requirement. Use the existing confirmation, table-action, and pagination patterns. Do not add a historical-report exclusion or an Archived report toggle from the superseded Phase 5C plan. Authenticated UI and MySQL deployment acceptance remain separate gates.

## Phase 5C-M2 safety addendum — Thursday, November 26, 2026 — 20:33:51 +08:00

The earlier Phase 5C-M preflight blockers were technically narrowed: `DatabaseBackupService` now probes the dump executable and omits the MySQL-only GTID option for MariaDB; the archive migration checks column compatibility and named indexes independently, so a column-without-index retry is safe. Clean, partial and repeated archive-only migrations passed on a separate fictional MariaDB 10.11.19 instance, and a fictional application backup restored with matching core data. The exact evidence and native pre-migration backup procedure are in `10-Quality-Audits/Phase-5C-M2-Migration-Safety-Readiness.md`.

The existing `educatrak` database remains unmigrated and **BLOCKED**: its backup-attempt metadata migration is pending, so the application backup service cannot be the pre-migration backup method; an owner-approved native target dump and verified restore, decisions for the other pending migrations, and separate named-target execution approval are still required. The archive API contract above is unchanged.

## Current deployment and acceptance status — Friday, November 27, 2026 — 05:19:10 +08:00

The preceding M/M2 status paragraphs are historical. The owner-approved native backup and isolated restore passed, and the single archive-state migration was applied to `127.0.0.1:3306/educatrak` with preserved core IDs, counts, financial fingerprints and foreign-key integrity. The frontend has been integrated. The three unrelated migrations remain pending by owner decision. Current Phase 5C-V automated frontend and isolated backend checks pass, but no verified fictional-data authenticated browser environment is available. ADM-05/07/08 therefore remain runtime-unverified and open until the browser steps in `../../10-Quality-Audits/Phase-5C-V-Browser-Acceptance-Checklist.md` pass. No real year or section archive action has been performed for acceptance.

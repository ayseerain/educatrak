# Phase 5C-V — Authenticated Archive & Restore browser acceptance checklist

**Status: AUTOMATED CHECKS PASSED; AUTHENTICATED BROWSER ACCEPTANCE PENDING.** The Phase 5C-D archive-state migration passed on the named development database. ADM-05, ADM-07 and ADM-08 remain open until the browser checks below pass.

## Environment and evidence gate

- Use an authenticated application connected to an independently verified, isolated, disposable, migrated database containing **fictional** school-year, section, student and pre-existing financial fixtures. Do not point the browser at `127.0.0.1:3306/educatrak` or the protected real-data restore copy on port 34092 for these write-path tests. Verify the effective backend connection before using any running server.
- Prepare a non-current year with terms and exam periods, a current year, one empty active section, one empty inactive section, and one section with an assigned fictional student. Record each fixture's existing ID and `active` value before testing. Keep a same-date/same-role historical collection and account-report baseline that includes any pre-existing fictional `valid` and `void_pending` payments. Do not create, edit, void, delete or reassign financial records during acceptance.
- Record pass/fail, role, browser/device size, observed API status and any screenshot or console/network evidence for each step. Use fictional data only in evidence. Confirm keyboard focus, dialog names, loading/error messages and narrow-screen layout while performing the actions.

## Acceptance steps

| Check | Action in `/settings/school` | Expected evidence |
| --- | --- | --- |
| ADM-05 active/archived years | As Administrator, switch Active and Archived views; archive the non-current fictional year after reviewing the confirmation. | The year moves to Archived under the same ID; its terms/exams remain attached; success and loading states are clear. |
| ADM-05 current year | Inspect the current-year action and attempt the guarded archive path using the fictional current year. | UI prevents the action; a direct `POST /api/settings/school-years/{schoolYear}/archive` returns 409; the current year remains current and unarchived. |
| ADM-05 restore and locks | Restore the archived year using its confirmation; check its terms/exams, label correction and locked date behavior. | It returns to Active under the same non-current ID, with no duplicate child rows or unlocked dates. |
| ADM-07 section actions | Keep one grade selected; switch its Active and Archived section views; archive and restore the empty active section. | The grade selection persists, confirmation is accessible, and the same section ID returns without student changes. |
| ADM-07 assigned-student conflict | Try to archive the fictional section that still has an assigned student. | `POST /api/settings/sections/{section}/archive` returns 409 with the reassignment message; the section and student assignment stay unchanged. No automatic reassignment occurs. |
| ADM-08 inactive distinction | Archive and restore the empty inactive section. | Inactive and Archived remain distinct; the same section ID returns to Active view with `active=false`. No duplicate is created. |
| Role access | Repeat view checks as Accounting; inspect year and section actions and attempt the guarded action endpoints in the fictional environment. | Accounting can read the relevant active/archived history but has no write controls; direct archive/restore requests return 403. Administrator actions remain available. |
| Financial preservation | With the same report date, filters and role, compare historical collection and account-report results before, while the fictional year is archived, and after restore. | Payment membership and collection totals are identical at all three points; existing receipts and account amounts are unchanged. No financial-record write is part of this check. |

## Completion rule

Mark ADM-05, ADM-07 and ADM-08 verified only after all applicable browser checks pass and the results are recorded in the formal Per-Role Audit Report and issue tracker. If the isolated authenticated environment is unavailable, keep browser acceptance pending and do not use the original development or retained real-data restore database as a substitute. Cleanup of the retained real-data restore directory remains subject to separate owner authorization.

## Phase 5C-V acceptance evidence — Friday, November 27, 2026 — 05:17:27 +08:00

**Browser environment unavailable.** No isolated fictional database was listening on port 34091, and the earlier M2 fictional-data directories were absent. No frontend/backend development listener was running on ports 5173 or 8000. The protected real-data restore instance on port 34092 remained offline and is excluded from mutation tests. A local browser exists, but there is no authenticated application backed by a verified disposable fictional database; no browser test, responsive screenshot or keyboard run was performed. No dependency was installed, new test database initialized, application server started, or write made to `127.0.0.1:3306/educatrak` for acceptance.

| Issue | Automated evidence completed | Still required in an isolated authenticated browser |
| --- | --- | --- |
| ADM-05 | `liveSchoolStructure.test.tsx` exercised Active/Archived year tabs, confirmation actions, current-year UI restriction, same-ID API calls, child visibility, locked dates and Accounting read-only rendering with mock responses. `SchoolStructureArchiveTest.php` used an in-memory fictional database to prove current-year 409, durable same-ID archive/restore, retained terms/exams, audit events, permission denial and unchanged historical collection rows/totals. | Administrator archive and restore through the real frontend/API, persistence after a page refresh, current-year rejection, term/exam and date-lock inspection, Accounting read-only behavior, same-date financial report comparison, keyboard and responsive checks. |
| ADM-07 | Frontend mock tests exercised one-grade selection, section confirmation, backend 409 message display and archive/restore calls. Backend fictional-data tests proved assigned-student 409, no automatic reassignment, audit rollback and role denial. | Administrator section action and confirmation through the real frontend/API, assigned-student conflict display with unchanged assignment, and one-grade navigation/keyboard/responsive behavior. |
| ADM-08 | Frontend mock tests exercised separate Archived sections and inactive status before/after restore. Backend tests proved same-ID restoration with `active=false`, archived-section exclusion from new student options/direct assignment and retained historical links. | Reload-persistent archived view, same-ID inactive restoration, student-assignment option exclusion and Accounting read-only UI in the authenticated browser. |

**Tests run now:** Focused frontend Vitest passed 14/14 tests across `liveSchoolStructure.test.tsx` and `liveDailyReport.test.tsx`; full frontend Vitest passed 300/300 across 44 files; `npm run build` passed with a chunk-size warning. Focused backend PHPUnit passed 31/31 tests and 425 assertions across archive, school settings, migration safety, daily report, audit-log read and Ledger Import tests, using `phpunit.xml`'s in-memory SQLite connection. The full backend suite was run in Phase 5C-D after deployment (236 passed, 2 skipped, 2,195 assertions); it was not rerun in this acceptance pass. No test failed.

**Read-only development-database check:** Laravel still resolved to `127.0.0.1:3306/educatrak` on MariaDB 10.11.19. The archive migration was recorded once, both archive columns existed, the Ledger Import, backup-attempt metadata and canonical-grade migrations remained pending, and no real year or section was archived. Billing-account aggregate, date-grouped historical collection, ordered payment-row and receipt-link fingerprints matched the protected Phase 5C-D post-deployment baseline. This is current integrity evidence; it is not a browser archive/restore test.

**Remaining manual run:** In an independently verified disposable fictional-data environment, sign in as Administrator and Accounting and perform the eight checks in the table above. Record before/during/after IDs, audit events and same-filter collection totals without editing payments or receipts. Refresh after successful transitions; inspect narrow and desktop layouts, keyboard focus/dialog operation and network 409/403 responses. Do not use either real-data database for this acceptance run. Keep all three issue IDs runtime-unverified until those observations pass.

## Phase 5D critical handoff — prepared, not started

1. **First: SA-03 and ADM-09 backup failure.** The live `GET /api/backups` path previously reached a `SQLSTATE[42S22]` missing-column case involving `backup_records.trigger`; `2026_11_23_214959_add_attempt_details_to_backup_records_table.php` remains pending by explicit owner decision. Reconfirm the exact sanitized error/schema and backup configuration, then seek separate approval for any named migration or code change. Do not infer authorization from Phase 5C.
2. **CSH-07 notification delivery.** Existing policy/configuration gates intentionally prevent unapproved sending or retries. Obtain owner delivery authorization and non-production provider evidence before diagnosing end-to-end delivery.
3. **ACC-09 reporting.** Existing daily-report behavior has fictional-data regression evidence; broader KPI/monthly correctness lacks an approved expected-case contract. Obtain concrete fictional expected cases before changing financial reports.
4. **ADM-02, ADM-03 and ACC-10 browser checks.** Use a verified fictional-data browser environment for compact table actions/responsiveness, school-year date request persistence, and multi-page report print preview. Reproduce a failure before changing backend contracts.

No Phase 5D implementation, migration, provider action or financial-rule change is authorized by this handoff.

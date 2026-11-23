# SRS v3.0 Owner-Answer Implementation

**Timestamp:** Monday, November 23, 2026 — 21:57:14 +08:00

## Scope

Applied the project owner's November 23 answers to the six open SRS v3.0 decisions (ledger import, shared guardians, adjustment redistribution, backups, retention, performance/UAT, receipt title) on `main` at `da17a1a`. The earlier SRS v3 commits (`ed56000`, `2404908`, `ff55ae5`, `8dc9067`, `431e4e5`, `dc363b4`) were reused, not rebuilt.

## Policy status

| Policy | Before | After this session |
| --- | --- | --- |
| Guardians (SRS-01) | Shared contact edits and primary unlink rejected; student form forced the edited guardian to primary and reset email status on every save. | Shared contact edits return 409 with affected students until `confirm_shared_contact_update` is sent (guardian API and student form). Primary unlink needs `replacement_primary_guardian_id`. Student form no longer changes primary flags. Email status resets only when the email changes. Guardian changes made through the student form are now audited. Student form shows a confirmation dialog. |
| Ledger import (SRS-02) | No routes; posting blocked. | Opening-balance conversion: CSV upload, Cashier submit/cancel, different-Accounting confirm/reject, hash-bound confirmation, revalidation, `opening_balance_conversions` records only. |
| Adjustments (SRS-03) | Proportional redistribution existed, but positive rounding centavos could land on an already paid installment. | Rounding goes to the oldest unpaid installment only. Audit stores installment amounts before and after. Correction installment on fully paid accounts is now tested. |
| Retention (SRS-04) | Periods documented. | Start events, exceptions and holds recorded as proposed. No enforcement or purge added. |
| Accounting assignment (SRS-05) | Done earlier. | Unchanged. |
| Backups (SRS-06) | History read only. | `mysqldump` service, daily 21:00 Manila schedule, Administrator manual endpoint, Super Admin read access, shared lock, temp-file plus completion and checksum check, sanitized history and audit. Rotation code present but off by default. |
| Performance (SRS-07) | Pending. | Targets and method recorded; nothing measured. |
| Receipt title (SRS-08) | Done earlier. | Unchanged; owner answer recorded. |
| UAT (SRS-09) | Pending. | Participants, scenarios and record template recorded; sign-off pending. |

## Validation

- `php artisan test --compact` (SQLite): 217 tests, 215 passed, 2 skipped, 1,891 assertions.
- Focused: `GuardianManagementTest`, `CashierOperationsTest`, `StudentAccessTest` 47 passed before the final suite; `LedgerImportTest` 4 passed; `BackupReadTest` 7 passed.
- `vendor/bin/pint --dirty --format agent`: fixed formatting and line endings in touched files.
- `npx vitest run src/test/liveStudents.test.tsx`: 12 passed (includes the new shared-guardian dialog test).
- Full `vitest run`: 288 tests, 285 passed, 3 failed in `operations.test.tsx`. The same 3 fail at HEAD without this session's frontend changes. Logged in the issue tracker.
- `npm run build`: passed.
- Not run: real MySQL migration, real `mysqldump`, Task Scheduler, restore test, benchmark, UAT.

## Open items

See `Agent Sessions/Issues-and-TODOs.md`, section "2026-11-22 SRS v3 reconciliation": cutover date value, whether opening balances feed billing accounts and reports, partial-batch confirmation, rotation approval, frontend screens for ledger import and backup run, first real backup/restore, retention approval, benchmark and UAT sign-off.

## Second round — Monday, November 23, 2026 — 22:49:11 +08:00

Owner answers on cutover, billing-account integration, partial batches, rotation and the frontend workstream are recorded in the decision file, together with a PROPOSED posting mapping that awaits approval.

| Item | Implemented now | Still proposed or blocked |
| --- | --- | --- |
| Cutover | Pending state at batch level; confirm returns 409; screens show "Cutover date pending". | Actual date approval. |
| Billing-account integration | Existing-account rows are classified `conflict` and never recorded. Recording is storage-only. | Posting mapping, due-date treatment, past-year placement, conflict reconciliation rule. |
| Partial batches | Eligible-only confirmation bound to the reviewed lines and file hash; per-row outcome; error report; zero-eligible batches blocked. | None. |
| Backup rotation | Off; disk-capacity monitoring documented; free space shown in the UI. | Approval conditions listed in the decision file. |
| Frontend | Ledger import screens (live API only); backup status and run control; Super Admin read-only `backup.view`. | None in scope. Mock mode shows ledger import as unavailable. |
| Real MySQL backup | Executor and readiness check. | Disposable MySQL credentials; first dump and restore. |

### Validation

- Laravel: 220 tests, 218 passed, 2 skipped. Pint passed.
- Vitest: 292/295 passed; the same 3 `operations.test.tsx` failures exist at HEAD. Build passed. `verify:production-assets` fails at HEAD too.
- Browser (Playwright, disposable SQLite backend at port 8010, Vite live mode): Cashier mapping, upload, classification, error report and submit. Accounting: blocked while cutover pending (UI and API 409); with a disposable test cutover of 2026-06-30, 1 row recorded and 2 excluded; billing accounts unchanged. Administrator: backup status with API 503 when unconfigured. Super Admin: read-only page, API 403 on run.
- The disposable database, servers and Playwright artifacts were removed or stopped after the check; the disposable SQLite file lives only in the session scratchpad.

## Third round — Monday, November 23, 2026 — 23:51:40 +08:00

| Item | Implemented now | Requires approval or environment |
| --- | --- | --- |
| Historical opening balances | Decision recorded: past-year balances stay with their year. | The account exception design (schema, API, reporting, authorization), the cutover date, and whether past-year balances can be collected. |
| Conflict reconciliation | Cutover comparison (3 classifications), audited final Accounting resolution, report columns, Resolve dialog. | A correction procedure for discrepancies. |
| Privacy Policy | Retention text corrected to "under review". | Academy privacy authority review before publication. |
| Backup and restore | Full cycle verified on disposable MySQL 9.7.0; two defects fixed. | Office-computer run, production grants, Task Scheduler, restore operator. |

Validation: Laravel 220 passed and 2 skipped (222). Vitest 293 of 296, with the 3 known failures. Build passed. MySQL evidence is in `04-Development/Backend-Readiness.md`.

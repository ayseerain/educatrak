# PROMPT — EducaTrak PER ROLE AUDIT: Backend/Database-Only Remediation

## Owner clarification baseline (2026-11-25)
Read `Per-Role-Owner-Decisions-2026-11-25.md` before implementing. The owner has already answered D1–D4; do not re-ask them. See that file for narrow unresolved sub-decisions. The original `PER ROLE AUDIT.md` is retained unchanged as the issue inventory.

## Role, authority, and strict boundary
You are the **Laravel/backend/database implementation agent**. Work from the original attached `PER ROLE AUDIT.md` plus the **verified** `EducatraK-Knowledge-Base/10-Quality-Audits/Per-Role-Audit-Report.md`. Inspect actual API responses and schema before changing anything. The preliminary `PER-ROLE-AUDIT-INITIAL-TRIAGE.md` is only an investigation lead. You may inspect `frontend/` **read-only** to understand current consumers and contracts; **do not edit, generate, reformat, or delete any frontend file, frontend test, MockDB file, or client configuration**. Application code changes are strictly within `backend/`; update only the required backend architecture/API documentation, canonical audit report, issues, logs and changelog outside that directory.

### Non-negotiable safety
- Follow `AGENTS.md`, `CLAUDE.md`, `backend/AGENTS.md`, applicable `.ai/rules`, current `Backend-Loop-Engineering.md` and backend/knowledge-base documentation before edits. Follow installed framework/formatting/testing conventions and current source-of-truth hierarchy.
- Never run `migrate:fresh`, `migrate:reset`, destructive schema changes, seeders, bulk updates, imports, restoration, retention/rotation deletes or write queries against development/shared/production data without explicit scoped authorization. Do schema experiments only on an isolated disposable database with synthetic fixtures and logged proof. Read-only production diagnostics require separate connection/access authorization and sanitized evidence.
- Preserve student LRN, guardian links, existing account IDs, fee and plan snapshots, money in integer centavos, allocations, payment/receipt sequences, audited voids, status recalculation, queued notifications, school-year constraints and role separations. No hard deletes of financial/audit evidence, unauthorized grade/section/user lifecycle changes or changed receipts.
- Do not invent business policy, claim MySQL compatibility from SQLite tests alone, fabricate dashboard figures, or bypass disabled SMS/email/ledger gates. Do not install dependencies, change branches, commit, push, merge, rebase, reset or stash automatically.

## Preparation and verification
Read `01-Requirements/Modules-and-Features.md`, `Scope-and-Access-Control.md`, `Data-and-Business-Rules.md`, `02-Architecture/Backend-API-Contract.md`, `02-Architecture/Backend-Database-Design/{Database-Review.md,Data-Dictionary.md,ERD.md,Backend-Synchronization-Plan.md}`, `06-Decisions/2026-11-22-srs-v3-policy-confirmations.md`, `Open-Decisions.md`, `08-Logs/Agent Sessions/Issues-and-TODOs.md`, `backend/routes/api.php`, relevant models/controllers/services/tests, and the frontend audit's exact requested response fields (read-only). Verify current branch and HEAD, active application environment, schema engine/version, database safety class and test setup. Report missing tooling instead of making up results.

## BE work queue by issue (do not change frontend)

### 1. Shared backup incident — `SA-03`, `ADM-09` [highest diagnostic priority]
- User reports `SQLSTATE[42S22]` on `/admin/backup` for both Super Admin and Administrator. Diagnose **one shared root cause**, not role-specific hacks. Reproduce on an approved disposable MySQL database; examine the full sanitized error, current `backup_records` schema, connection target, `php artisan migrate:status`, `BackupController::index()`, `BackupRecord`, `DatabaseBackupService`, migrations including `2026_11_23_214959_add_attempt_details_to_backup_records_table.php`, and `backend/tests/Feature/BackupReadTest.php`.
- The controller currently reads `trigger`, `checksum_sha256`, `started_at`. A missing additive migration is a *hypothesis only*, not permission to run migrations on user data. If drift exists, design additive, backward-compatible remediation with safe read-only preflight, rollback/forward-fix plan and owner approval before touching any non-disposable DB. Preserve history, checksums, sanitized errors, storage separation and audit trail.
- Enforce Administrator-only `backup.manage`; Super Admin `backup.view` only, no restore operation. Keep automatic backup rotation disabled unless separately approved. Test schema state, empty/nonempty history, configuration unavailability/503, 409 concurrency and authorization.

### 2. Role dashboards — `SA-01`, `SA-02`, `ADM-01`, `ACC-01`, `AUD-01`
- Audit `backend/app/Http/Controllers/Api/DashboardController.php`, `AuditLogController.php`, `SecurityEventController.php`, relevant models and `backend/tests/Feature/DashboardTest.php` and security/audit tests. Use explicitly approved definitions for governance accounts, privileged staff counts, config overview, recent activity, security events, collection trends and Auditor audit activity.
- On **synthetic controlled records**, compare expected sums/counts (including inactive and archived accounts, payments/voids, timezones, current school year and range) with actual endpoint JSON. Check tenant/role restrictions, server-side permission controls and redaction. Repair only verifiably incorrect Laravel queries, serialization, filtering or authorization, retaining the response contract or documenting an approved versioned change. If the backend is correct, mark FE-only and supply response fixtures instead of rewriting API logic.
- Never make blank charts appear populated with fabricated demo data.

### 3. Cashier billing/payment detail — `CSH-04`, `CSH-06`
- Audit `backend/app/Http/Controllers/Api/BillingAccountController.php` (read/detail), `PaymentController.php` (detail, audit and receipt-notification projections), payment/adjustment/notification models, and related feature tests. Confirm which actual adjustment and payment rows the widgets should count/display; verify valid vs voided, pending void, account-wide payment scope, stored snapshots and latest transactions. Repair missing/incorrect backend data only with exact evidence and no changes to ledger, historical receipts or money logic unrelated to defect.
- Provide canonical notification states/fields across email and SMS; queued is **not delivered**. Support frontend five-metric Receipt Notification by existing or minimally approved response fields, retaining sensitive-data redaction and performance. Do not implement CSS/layout here; record contract handoff to FE agent.

### 4. Follow-up and notifications — `CSH-07`, `CSH-08`
- `FollowUpController.php`, `ReminderDeliveryController.php`, `NotificationLogController.php`, delivery job/provider adapters and feature tests. Verify whether user-reported failure is policy-blocked send, missing env/provider config, invalid contact, permission, queue worker/scheduler, or actual code fault. Do not bypass disabled delivery flag, consent policies, idempotency keys, callback verification, rate limits or failed/unknown outcome distinctions. The **rename** is frontend-only; do not rename API routes without explicit contract approval. Report configuration/deployment prerequisites truthfully.

### 5. Financial ledger import — `CSH-10` [OWNER CONFIRMED NO RULE CHANGES]
- **No backend implementation is authorized for this audit item.** The owner explicitly says keep the existing one-time opening-balance conversion rules as-is. Retain `LedgerImportController.php` and its approved Cashier preparation, separate Accounting review, storage-only records, cutover-pending confirmation gate, classifications, and tests. Do NOT change CSV schema, validation, API routes, cutover setting, confirmation/posting behavior, account/receipt creation or historical transactions. Record `CSH-10` as **NO CHANGE / POLICY PRESERVED**, not an open request to redesign import. If a separate concrete defect is reproducible, report it without changing ledger policy. `CSH-09` is a frontend-only display-title change to **Import**.

### 6. Accounting reports — `ACC-09`, `ACC-10`
- `DailyReportController.php`, `OutstandingReportController.php`, related dashboard/report query logic and `backend/tests/Feature/{DailyReportTest,OutstandingReportTest}.php`. Reconcile report KPI definitions and aggregation with synthetic ledger records, date scopes, current-year constraints, valid/voided payments, outstanding balances and school visibility. Check pagination/filter contract so the frontend can print **all** filtered rows. The print layout itself is FE-owned, and `LiveOutstandingReport.tsx` already contains a print path: do not build a duplicate PDF endpoint unless the formal audit proves one is required and approval is granted.

### 7. School years and sections — `ADM-05`, `ADM-07`, `ADM-08` [ARCHIVE INTENT CONFIRMED; SAFETY GATES REMAIN]
- Current approved policy `Open-Decisions.md` §31.10: **school years are never deleted**. The owner clarified **Remove non-current school year = Archive**, retaining records so mistakes can be corrected. Do not implement any hard-delete endpoint, cascade, identifier replacement, or loss of historical references. Inspect the persisted school-year model and existing billing/current-year/date-lock guards; propose the smallest durable, auditable archive/correction/restore contract and the exact UI handoff. Do not create a migration or activate write endpoints against existing databases without explicit approval and isolated proof. Current school years may not be archived. **Term remove/archive is still separately unresolved**; do not assume archiving a school year silently archives its terms or that term hard deletion is acceptable.
- Sections already have an `active` flag. To support FE Actions column and Archived tab, first obtain owner definition of archive = inactive vs separate lifecycle, restore permissions, uniqueness and student/fee dependencies. If `PATCH /api/settings/sections/{section}` already suffices for approved actions, **reuse it**; do not add a redundant endpoint. Keep Accounting read-only and Administrator manage; preserve all existing IDs and associations.

### No backend change for pure UI issues
`ADM-02/03/04/06` (unless date failure proved server-side), `CSH-01/02/03/05/08/09`, `ACC-02/03/04/05/06/07/08` and `ACC-10`'s print CSS/layout do not authorize Laravel edits. Include these as `FE ONLY / NO BACKEND ACTION` rows in the completion matrix, not as undocumented scope expansion. The backend data contract for void history is inspectable, but add no API mutations merely to create a frontend tab.

### Explicit no-backend ownership register (do not create server tasks without evidence)

- `ADM-03` — School-year calendar selection is **frontend first**; consider Laravel date validation only if a reproducible HTTP request/response proves server fault.
- `ADM-04` — School-year pagination and hover actions are frontend-only.
- `ADM-06` — One-grade-at-a-time navigation is frontend-only.
- `CSH-02` — LRN placement beneath name is frontend-only.
- `CSH-03` — Status-badge appearance is frontend-only.
- `CSH-05` — Audit event label capitalization is frontend-only; never rewrite stored audit events.
- `CSH-09` — Display name "Import" is frontend-only; no endpoint rename.
- `ACC-03` — Grade-fee pagination and card navigation are frontend-only.
- `ACC-04` — Grade-fee status-badge position is frontend-only.
- `ACC-05` — Red Deactivate action styling is frontend-only.
- `ACC-06` — Void decision-note modal is frontend-only.
- `ACC-07` — Void history tab/filter is frontend-only when existing list contract suffices.
- `ACC-08` — Accounting's read-only School Settings presentation is frontend-only; enforce existing backend permissions unchanged.

## Required implementation method
1. From the canonical audit report, create a prioritized BE-only plan with verified defects versus policy-gated items. Record exact controller/model/migration/tests and preservation invariants per ID.
2. Obtain data-policy clarifications only for **blocked** actions. Continue independent safe fixes (e.g. read-only backup schema investigation) without waiting for answers to unrelated items.
3. Before any migration, gather a sanitized, read-only installed-schema compatibility report. If approved, design additive migration and run it first on isolated matching-version MySQL with fictional records, including upgrade/rollback or forward-fix proof. **Do not apply to a real DB automatically.**
4. Implement minimally, write focused PHPUnit tests and integration tests for role authorization, correctness, empty/error/status cases, date scope and integer-centavo invariants. Run Pint, backend tests and available disposable-MySQL checks. Document missing tool/environment and actual results.
5. Update `EducatraK-Knowledge-Base/02-Architecture/Backend-API-Contract.md`, data dictionary/design only if the approved contract actually changes; include FE handoff with exact sample response JSON (synthetic), API status codes, permissions and compatibility notes. Update canonical audit report, central changelog and issue tracker per repo instructions.
6. Produce separate tables of `DONE / FAILED / BLOCKED / UNVERIFIED` and `FE HANDOFF`. Verify `git diff -- frontend/` remains empty; never claim a BE task fixed a browser-only problem.

## Formal approval and STOP gates
Do not act on school-year/term **deletion** (forbidden), unapproved archive **implementation contracts/DB migrations**, independently unresolved term and section archive/restore policies, ledger posting or cutover, notification sending policy override, personal-data retention, backup rotation, deployed schema, or production migration without the necessary explicit owner approval recorded in decisions. School-year archive *intent* and ledger *no-change* are already confirmed; do not re-ask those broad questions. Provide a clear question, current rule, options and recommended **safe** alternative; skip just that dependent task. Do not treat testing on SQLite or a fake process as proof of live MySQL, live delivery, backup recovery, or institutional sign-off. Do not commit/push automatically.

## Final response contract
For every BE-owned audit ID: observed root cause, changed files, API compatibility, migration status (none/disposable/approval-blocked), tests actually run, finance/privacy/security invariants, remaining FE dependencies and unresolved owner questions. Include a **zero frontend-file modification** confirmation. Stop at verified requested scope, not speculative cleanup.

# EducaTrak — PER ROLE AUDIT · Initial Cross-Layer Triage

> **Status:** Repository/static-code cross-check, **not** a completed runtime/database audit.  
> **Source:** User-provided `PER ROLE AUDIT.md` (five roles); original wording is preserved in the user's attachment.  
> **Repository snapshot inspected:** `ayseerain/educatrak`, `main` at `09edcddbc7f6689750bc1857130724b529be5fe2` (2026-11-25 11:41:55 UTC). `feature/backend-foundation` exists but is older (`0b600db...`, 2026-11-17).  
> **Secondary visual reference only:** `zekuuu/cliniq` on `main` (`bff7e2d...`); its design cannot override EducaTrak policies or permissions.  
> **Evidence standard:** "Reported" means in the user's audit; an inspected code path is not proof that the defect was reproduced. Do not claim SQL error root causes, production database state, or test passes without fresh runtime evidence.

## Owner decisions supplied after the original audit — November 25, 2026

These are direct owner clarifications to the four questions in the initial triage. They **update implementation intent** but are not evidence that a feature exists, that a deployed database has been migrated, or that every dependent lifecycle policy has been approved. The coding agent must record them in the repository's authorized decision log under the `AGENTS.md` source-of-truth hierarchy; it must not rewrite historical decision text.

| Decision | Affected IDs | Confirmed interpretation | Boundaries still requiring verification/approval |
|---|---|---|---|
| **D1 — non-current school years** | `ADM-05` | A user-facing **Remove** is non-destructive **Archive**, not deletion. Preserve the school year and its original records so mistaken labels or other errors can be corrected; never silently delete or cascade. | Confirm precise eligibility, how archived records are displayed/corrected/restored, treatment of associated terms, current-year invariants, existing billing accounts and migration/API design before enabling writes. Archiving a term separately is **not** resolved. |
| **D2 — grade navigation** | `ADM-06`, `ACC-03`, `ACC-08` | Show **one grade level at a time within the existing page**, switching the visible grade-specific table through an accessible selector/pager; **no separate route**. Finance fee grade views should reuse the same layout principle. | `ADM-07/08` section Archive/Archived-tab implementation is still requested, but the lifecycle choice (inactive vs distinct archive, restore, active-student impact) was **not answered**. |
| **D3 — ledger import** | `CSH-09/10` | **Keep all existing ledger-import rules unchanged**. Only change the requested user-facing page/menu label from “Opening-balance import” to **“Import”**; the explanatory opening-balance details must remain accurate. | Existing cutover-date and financial posting gates remain; no expansion, no policy rewrite and no new backend requirement under `CSH-10`. |
| **D4 — Notifications** | `CSH-08`, `CSH-07` | Rename the **overall Follow-up page/sidebar heading** to **Notifications** only. Keep existing route compatibility, Follow-up and Notification Log views, actions, permissions and delivery controls. | Delivery availability (`CSH-07`) is an independent issue; renaming does **not** authorize enabling delivery or changing policy/config. |

**Already confirmed:** school years must never be hard-deleted; archival is a compatible non-destructive interpretation, but its safe backend lifecycle still needs design/authorization. **Still unanswered:** dependent term archive/correction/restore behavior; section archive/restore semantics and handling of assigned students; `D5` expected financial/dashboard data for runtime reconciliation. Do not block other safe work because these sub-decisions remain open.

## Scope and routing

The audit covers **Super Admin, Administrator, Cashier, Accounting Officer, and Auditor**. Registrar is not named as an issue owner in the source, but shared `/students` or settings components and role protections must be regression-checked. The shared route may serve multiple roles; role-specific views must still honor capability guards.

**Streams:** `FE` = frontend-only (presentation, navigation, page state, adapter normalization and front-end tests); `BE` = Laravel/backend/database (queries, contracts, policies, migrations, isolated DB tests). `FE + BE` requires separate root-cause ownership and a documented contract handoff. `POLICY GATE` blocks behavioral change until the project owner explicitly decides.

### 33 traceable audit items

| ID | Role | Page / location | User-reported request or defect | Owner stream | Code-evidence status |
|---|---|---|---|---|---|
| `SA-01` | Super Admin | `/ dashboard` | Governance staff-account overview does not reflect intended records | **FE + BE** | Reported; API contract exists |
| `SA-02` | Super Admin | `/ dashboard` | Security events and recent governance activity do not reflect intended records | **FE + BE** | Reported; UI fields exist |
| `SA-03` | Super Admin | `/admin/backup` | Backup page SQLSTATE[42S22], data fails to load | **BE primary + FE diagnostic** | Runtime error user-reported; not reproduced |
| `ADM-01` | Administrator | `/ dashboard` | User overview, school config, recent activity and security not reflecting actual data | **FE + BE** | Reported; implementations exist |
| `ADM-02` | Administrator | `/admin/users (Archived users view)` | Actions expand and overflow table columns | **FE** | Reported layout issue; component exists |
| `ADM-03` | Administrator | `/settings/school — add school year` | Calendar start/end dates not applied on selection | **FE first; BE if proven** | Reported; date input already exists |
| `ADM-04` | Administrator | `/settings/school — school years` | Long school-year list needs pagination and compact hover actions | **FE** | Cards currently map full list |
| `ADM-05` | Administrator | `/settings/school — school years / terms` | Archive non-current school year (no deletion); term removal still requires separate rule | **FE + conditional BE / term policy gate** | Owner confirmed archive intent; lifecycle mechanics unapproved |
| `ADM-06` | Administrator | `/settings/school — grade levels and sections` | Show one grade level at a time in-page (change visible table; no new route) | **FE** | Owner confirmed same-page navigation; current table lists grades |
| `ADM-07` | Administrator | `/settings/school — section actions` | Dedicated Actions column with Edit and Archive for each section | **FE + conditional BE** | Edit exists; archive semantics not confirmed |
| `ADM-08` | Administrator | `/settings/school — section archived view` | Separate Archived tab analogous to User Management | **FE + conditional BE** | Requested; current section active flag exists |
| `ADM-09` | Administrator | `/admin/backup` | Same backup SQLSTATE[42S22] failure | **BE primary + FE diagnostic** | Same shared root cause as SA-03 |
| `CSH-01` | Cashier | `/students` | Use consistent status badges instead of plain text | **FE** | Live student table renders plain text status |
| `CSH-02` | Cashier | `/students` | Display LRN beneath student name like /accounts | **FE** | LRN shown in separate column currently |
| `CSH-03` | Cashier | `/accounts` | Use consistent account-status badges | **FE** | Reported; inspect specific table before changing |
| `CSH-04` | Cashier | `/accounts/:id` | Payments and Adjustments widgets disagree with actual records | **FE + BE** | Reported; live account detail API exists |
| `CSH-05` | Cashier | `/payments/:id` | Audit trail actions should start with capital letters | **FE** | Reported display formatting |
| `CSH-06` | Cashier | `/payments/:id` | Receipt Notification summary beside Student, Amount, Method, Status; rebalance audit area | **FE** | Notification data exposed in payment detail; layout request |
| `CSH-07` | Cashier | `/followup and /notifications` | Follow-up/notification delivery blocked by unresolved policy | **POLICY/CONFIG → FE + BE** | Frontend explicitly gates delivery via VITE_REMINDER_DELIVERY_ENABLED |
| `CSH-08` | Cashier | `Sidebar + /followup` | Rename overall Follow-up page/sidebar heading to Notifications only | **FE** | Owner confirmed label-only change; preserve subviews |
| `CSH-09` | Cashier | `/import` | Rename Opening-balance import to Import | **FE** | Current financial import is distinct from /students/import |
| `CSH-10` | Cashier + Accounting | `/import, /import/:id` | Keep current ledger import rules unchanged | **NO POLICY CHANGE / QA ONLY** | Owner clarified no rule revision; retain storage-only conversion and cutover block |
| `ACC-01` | Accounting | `/ dashboard` | Collection trend does not show actual collections | **FE + BE** | Reported; chart consumes collectionTrend |
| `ACC-02` | Accounting | `/payments` | Rename Payment review page to Payments | **FE** | Conditional title is Payment review |
| `ACC-03` | Accounting | `/settings/fees` | One-grade-at-a-time fee view with pagination; reduce redundant controls | **FE** | Current full list of per-grade cards; per-fee-items pager exists |
| `ACC-04` | Accounting | `/settings/fees` | Move grade-fee status badge beside grade label | **FE** | Status badge in header near Add fee item currently |
| `ACC-05` | Accounting | `/settings/fees` | Make fee Deactivate action red | **FE** | Deactivate variant currently secondary |
| `ACC-06` | Accounting | `/voids` | Move void decision note confirmation into dialog | **FE** | Currently inline form in table cell |
| `ACC-07` | Accounting | `/voids` | Separate pending requests and approved/rejected Void history | **FE** | API returns void requests; client currently mixed |
| `ACC-08` | Accounting | `/settings/school` | Match Administrator School Settings presentation; read-only | **FE** | Shared component already receives editable flag |
| `ACC-09` | Accounting | `/reports, /reports/daily, /reports/monthly` | Report KPI cards not reflecting backend records | **FE + BE** | Reported; mixed report paths/data sources |
| `ACC-10` | Accounting | `/reports/outstanding` | Outstanding balance print/report format said missing | **FE first, BE if proven** | PrintSurface/printReport already present; rendered behavior unverified |
| `AUD-01` | Auditor | `/ dashboard` | Recent audit activity does not reflect actual audited records | **FE + BE** | Reported; recentAuditActivity field exists |

## Specific evidence and guardrails

1. **Backups — SA-03 / ADM-09 are the same shared incident, not two independent fixes.** The current `BackupController::index()` selects `trigger`, `checksum_sha256`, and `started_at`. The additive migration `backend/database/migrations/2026_11_23_214959_add_attempt_details_to_backup_records_table.php` introduces these columns. A mismatch is **a hypothesis, not a verified diagnosis** for `SQLSTATE[42S22]`: inspect the actual redacted error column, the active database connection, `migrate:status`, and read-only schema metadata. Never apply `migrate:fresh`, `migrate:reset`, or unapproved migrations to existing records.
2. **School-year archive — ADM-05 owner intent clarified.** `Open-Decisions.md` §31.10 states **school years are never deleted**; the owner now confirms the requested Remove action means **archive non-current years** to preserve/correct erroneous entries. Do not hard-delete, cascade, reassign references or weaken current-year/locked-date rules. Backend schema, archive/restore/correction semantics, dependent terms and active billing constraints still require exact safe contract review before activating a write. Independent term removal remains policy-gated.
3. **Section archive — ADM-07/08.** Current sections have an `active` state and can be edited. The request for "Archive" and an Archived tab needs a decision whether archive maps to `active=false`, whether restore is allowed, and what happens to sections referenced by students. UI presentation may proceed with placeholders only if clearly disabled/not misleading; do not fabricate lifecycle endpoints.
4. **Ledger import — CSH-09/10 resolved scope.** `/import` is **financial one-time opening-balance conversion**, distinct from Registrar `/students/import`. The owner has explicitly directed **no ledger rules changes**. Rename only the overall visible title/menu to **Import**, retaining clear explanatory content about opening balances and the existing Cashier/Accounting, validation, cutover and storage-only restrictions. `CSH-10` is a no-op for both implementation streams, except verification against existing policy.
5. **Notifications — CSH-07/08.** The owner confirmed **label-only** renaming of the overall Follow-up page/sidebar heading to **Notifications**. `/followup` keeps existing routing and Follow-up/Notification log subviews, and `/notifications` keeps its redirect. Reminder sending remains gated by `VITE_REMINDER_DELIVERY_ENABLED` and backend provider/policy requirements; no enablement is implied.
6. **Outstanding report — ACC-10.** `frontend/src/features/reports/LiveOutstandingReport.tsx` already contains a multi-page retrieval and print pathway using `PrintSurface` and `PrintDocumentHeader`; the user reports missing behavior. Reproduce the rendered/print failure and compare with actual report requirements before building a duplicate. Verify the backend paginated `/reports/outstanding` API.
7. **Dashboards — SA-01/02, ADM-01, ACC-01, AUD-01.** Existing components consume `DashboardController` through `dashboardApi.ts`. Blank/incorrect data could arise from filters, event classes, selected school year, void semantics, endpoint projection, adapters, missing records, or environment. Determine the authoritative counting rules and compare expected values with synthetic controlled data; do not add invented figures.
8. **Cashier account detail — CSH-04.** Confirm whether `BillingAccountController::show()` and the frontend account detail consume the same source for payments, adjustments, totals, and voids. Avoid summing UI display rows without reconciling backend financial rules.
9. **Payment notifications — CSH-06.** `PaymentController::show()` obtains notification logs and audit events; frontend `LivePaymentsPage` currently has four summary metrics (Student, Amount, Method, Status). Clarify receipt-notification aggregation over email/SMS rather than hiding failed/not-sent outcomes.
10. **Shared design.** EducaTrak's canonical `03-Design/UX-and-Design-System.md` and `.agents/skills/educatrak-*` control UI. CLINIQ is only a secondary styling reference. `TableActionButton`, `StatusBadge`, `ViewTabs`, `PaginationControls`, print primitives, and existing modal patterns should be reused, not duplicated.
11. **Older tests are not proof of current health.** The 2026-11-23 implementation log reports a known three-test `operations.test.tsx` failure and prior MySQL/backup verification evidence. The coding agent must re-run relevant checks on the actual working tree and disclose what it cannot test.

## Root-cause ownership rule

For each `FE + BE` issue the audit agent must produce **separate** FE and BE child findings, with a shared issue ID and explicit API contract linkage. If backend returns correct data but the browser misrenders it, the code fix stays FE. If backend returns wrong/unauthorized or incomplete data, the fix stays BE. Never make the frontend synthesize missing financial records to conceal an API defect, or change the backend simply to obtain a CSS layout.

## Issue-level evidence targets

| IDs | Primary files to reopen and verify |
|---|---|
| `SA-01` | `frontend/src/features/dashboard/components/SuperAdminDashboard.tsx; StaffAccountOverview.tsx; backend/app/Http/Controllers/Api/DashboardController.php` |
| `SA-02` | `SuperAdminDashboard.tsx; AuditActivityPreview.tsx; DashboardController.php; AuditLogController.php` |
| `SA-03` | `backend/app/Http/Controllers/Api/BackupController.php; backend/database/migrations/2026_11_23_214959_add_attempt_details_to_backup_records_table.php; frontend/src/api/backupApi.ts` |
| `ADM-01` | `frontend/src/features/dashboard/components/AdminDashboard.tsx; DashboardController.php` |
| `ADM-02` | `frontend/src/features/operations/LiveUsersPage.tsx; frontend/src/components/ui/TableActionButton.tsx` |
| `ADM-03` | `frontend/src/features/operations/LiveSchoolStructurePage.tsx; frontend/src/api/schoolStructureApi.ts` |
| `ADM-04` | `frontend/src/features/operations/LiveSchoolStructurePage.tsx; PaginationControls.tsx; TableActionButton.tsx` |
| `ADM-05` | `2026-11-19 school-year lifecycle in 06-Decisions/Open-Decisions.md; SchoolStructureSettingsController.php` |
| `ADM-06` | `LiveSchoolStructurePage.tsx; frontend/src/features/operations/OperationalPages.tsx` |
| `ADM-07` | `LiveSchoolStructurePage.tsx; SchoolStructureSettingsController.php; frontend/src/components/ui/TableActionButton.tsx` |
| `ADM-08` | `LiveUsersPage.tsx; LiveSchoolStructurePage.tsx; Section model` |
| `ADM-09` | `See SA-03 and BackupController.php; frontend/src/api/backupApi.ts` |
| `CSH-01` | `frontend/src/features/students/LiveStudentsPage.tsx; frontend/src/components/ui/StatusBadge.tsx` |
| `CSH-02` | `LiveStudentsPage.tsx; frontend/src/features/billing/LiveBillingAccounts.tsx` |
| `CSH-03` | `frontend/src/features/billing/LiveBillingAccounts.tsx; frontend/src/components/ui/StatusBadge.tsx` |
| `CSH-04` | `LiveBillingAccounts.tsx; backend/app/Http/Controllers/Api/BillingAccountController.php` |
| `CSH-05` | `frontend/src/features/operations/LivePaymentsPage.tsx; frontend/src/lib/status.ts` |
| `CSH-06` | `LivePaymentsPage.tsx; backend/app/Http/Controllers/Api/PaymentController.php` |
| `CSH-07` | `frontend/src/features/followup/LiveFollowupPage.tsx; backend/ReminderDeliveryController.php; SRS decision` |
| `CSH-08` | `frontend/src/features/followup/RoleFollowupWorkspace.tsx; frontend/src/components/layout/Sidebar.tsx; App.tsx` |
| `CSH-09` | `frontend/src/features/ledgerImport/LedgerImportPages.tsx; Sidebar.tsx` |
| `CSH-10` | `backend/app/Http/Controllers/Api/LedgerImportController.php; 2026-11-22 SRS decisions` |
| `ACC-01` | `AccountingDashboard.tsx; CollectionTrend.tsx; DashboardController.php` |
| `ACC-02` | `frontend/src/features/operations/LivePaymentsPage.tsx` |
| `ACC-03` | `frontend/src/features/operations/LiveFinanceSettingsPage.tsx; useClientPagination.ts` |
| `ACC-04` | `LiveFinanceSettingsPage.tsx FeeScheduleCard` |
| `ACC-05` | `LiveFinanceSettingsPage.tsx; TableActionButton.tsx` |
| `ACC-06` | `frontend/src/features/operations/LiveVoidsPage.tsx` |
| `ACC-07` | `LiveVoidsPage.tsx; backend/app/Http/Controllers/Api/VoidRequestController.php` |
| `ACC-08` | `LiveSchoolStructurePage.tsx; App.tsx; capability mapping` |
| `ACC-09` | `frontend/src/features/operations/OperationalPages.tsx; frontend/src/features/reports/LiveDailyReport.tsx; backend/DailyReportController.php` |
| `ACC-10` | `frontend/src/features/reports/LiveOutstandingReport.tsx; backend/OutstandingReportController.php` |
| `AUD-01` | `AuditorDashboard.tsx; AuditActivityPreview.tsx; DashboardController.php` |

## Decision register — unresolved; do not guess

- **D1 · School-year "Remove" RESOLVED AS ARCHIVE:** The owner confirms non-current school years go into Archives for corrections; **no hard deletion**. Remaining design gates: archive/correction/restore mechanics, links to billing and current-year protection. **Term removal/archive remains unanswered** and must not be silently cascaded; protect exam periods, billing and audit history.
- **D2 · Grade navigation RESOLVED:** One grade table at a time **within the same page/route**, controlled by an in-page pager/select. **Section archive STILL OPEN:** Does Archive mean existing inactive state with an Archived tab and Restore operation or a distinct lifecycle? Clarify impact on assigned students.
- **D3 · Ledger import RESOLVED — NO RULE CHANGES:** Owner says keep existing storage-only conversion, CSV, 12-digit LRN match, Cashier prepare, separate Accounting confirmation and pending cutover; only visible Import labeling changes. Do not request new import-rule choices unless a new explicit change arrives.
- **D4 · Notifications rename RESOLVED — LABEL ONLY:** Rename overall page/sidebar heading to Notifications; preserve Follow-up and Notification log views, routes, permission checks and delivery behavior. Delivery eligibility remains an independent `CSH-07` configuration/policy investigation, not part of renaming.
- **D5 · Data correctness:** Owner must describe representative expected dashboard, report, receipt notification, and widget numbers/filters using **synthetic** fixture cases (or supply anonymized aggregate examples, not private real data).

**Default while unresolved:** proceed with safe inspections, existing-policy-preserving UI improvements, and isolated tests; mark policy-dependent stories BLOCKED. Do not invent approval or silently change accepted decisions.

## Required agent-generated final report

The audit agent should create/update `EducatraK-Knowledge-Base/10-Quality-Audits/Per-Role-Audit-Report.md` with:
- Verified branch/commit and actual date/time (Asia/Manila), scope/modes/database, evidence and reproduction steps.
- Item-by-item ID, role, route, severity, expected/actual, code and docs pointers with exact lines, root cause or UNVERIFIED, FE and/or BE ownership, proposed minimal fix, dependencies and approval status.
- A separate frontend worklist and backend/database worklist, with cross-stream API contract handoffs and acceptance tests.
- Source conflicts, unresolved owner questions, security/data integrity/privacy notes, regression plan, pass/fail/unavailable test table, and final audit summary.
- The audit report is not a license to edit application code. Log changes per `AGENTS.md`.

## Run order

1. Run `Prompt-Per-Role-Audit-EducaTrak.md` read-only on application code; generate the final evidence-based audit Markdown.
2. Review the decision register and answer the blocked policy questions.
3. Run **frontend-only** prompt for FE items, retaining backend blocker tickets rather than spoofing data.
4. Run **backend/database-only** prompt for verified BE items in isolated test environments, then cross-check FE contract compatibility. No live/production migrations without authorization.
5. Have the audit agent perform final end-to-end verification and update each ID's status; preserve unresolved items.

**No code or runtime was changed or tested in preparing this initial triage.**

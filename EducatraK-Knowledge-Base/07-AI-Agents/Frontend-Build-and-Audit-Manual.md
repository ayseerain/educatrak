# EducatraK — Frontend Loop-Engineering Operating Manual

> **Scope:** Frontend implementation only. The Laravel/MySQL backend is handled separately.
>
> **Purpose:** This is the working execution manual an AI coding agent keeps open while building the EducatraK frontend. It is a progress ledger as well as an implementation sequence. It does not replace the project requirements, design specifications, `AGENTS.md`/`CLAUDE.md`, or the canonical `EducatraK-Knowledge-Base/`.
>
> **Core sequencing rule:** Complete the entire Build Phase across every documented screen before starting the Cross-Check & Audit Phase. Do not alternate build → audit → build → audit by screen.

## 0. Governing Sources and Non-Invention Rule

Before writing code, read the current repository-level `AGENTS.md`/`CLAUDE.md`, this manual, and all applicable current project material in `EducatraK-Knowledge-Base/`, especially:

- `00-Project-Core/`
- `01-Requirements/`
- `02-Architecture/`
- `03-Design/`
- `04-Development/`
- `05-Testing/`
- `06-Decisions/`
- `07-AI-Agents/`
- relevant recent context in `08-Logs/`
- applicable evidence/reference material in `09-References/`

Also read the current unified frontend/system specification and any uploaded modules/features documentation or UI/design guidelines that have not yet been migrated into the canonical knowledge base.

Do **not** invent modules, roles, permissions, business rules, payment methods, screens, integrations, automation, school policy, or backend behavior. If current authoritative material is silent or two same-priority sources genuinely conflict, stop only the affected portion, record the issue according to the repository instructions, and ask for clarification. Do not resolve a product requirement by assumption.

When historical vault material conflicts with a newer approved/unified specification, follow the repository source-of-truth hierarchy. Historical implementation notes are evidence of past state, not automatic requirements.

### Sequencing interpretation

During the **Build Phase**, normal implementation work is allowed: compiling, running the app, exercising the screen being built, fixing runtime/type errors, and writing the unit/component/E2E code required by the specification. What is deferred is the formal requirements/design **Countercheck & Audit** described in Phase 2.

Do not start the formal Cross-Check & Audit Phase until **every Build checkbox in this file is checked**.

### Progress and timestamp discipline

- Every checkbox must reflect real progress only.
- Every checked item must have a filled **Resume Note**.
- A Resume Note should state what was completed, important files/routes touched, validation actually run, unresolved items/TODOs, and the next relevant handoff fact.
- Any work-log entry must use a **real timestamp read from the agent's own system clock at the moment of writing**, in the format required by `AGENTS.md`/`CLAUDE.md`. Never estimate, reuse, infer, round, or fabricate timestamps.
- If context is running low, stop cleanly. Update all checkboxes and Resume Notes first, write the required real-timestamp log entry, then state exactly where work stopped and the next action.

---

# 1. Build Phase

## Build-Phase Gate

**Goal:** Build every documented frontend screen/page completely before formal cross-checking or auditing any screen.

For each screen below:

1. Read the governing module/route/role requirements and applicable design guidance before implementing it.
2. Build the complete documented screen, including its permitted actions and states needed for the screen to function.
3. Use the documented React/TypeScript frontend architecture, typed API layer, mock adapter, role/capability system, design tokens, and shared components.
4. Preserve the project's frontend-only boundary. Do not implement the real Laravel backend.
5. Use only obviously fake data in mocks, tests, screenshots, and examples.
6. Do not hard-code policy that the specification defines as configurable.
7. You may run implementation-level tests/debugging needed to make the screen work, but **do not perform or mark the formal Phase 2 Countercheck/Audit yet**.
8. Mark the Build checkbox only when the screen itself is implemented to the best of the currently documented requirements, then fill its Resume Note.

## Documented Screen Inventory

### B01. Login — M1

- **Route:** `/login`
- **Documented access:** All users
- **Build scope:** Username/password login; generic failure messaging; lockout wait-time handling.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/login` with username/password authentication, generic failure messaging, repeated-failure lockout wait time, password visibility toggle, development-only mock session handling, production Laravel cookie-session authentication, `/api/auth/me` session rehydration after refresh, retryable restore errors, and sign-out return to login. Coverage is in `frontend/src/test/login.test.tsx` and `frontend/src/test/sessionRestore.test.tsx`. Formal Phase 2 audit remains pending.

### B02. First-login password change — M1

- **Route:** `/first-login`
- **Documented access:** All users when forced
- **Build scope:** Forced password change after account creation/admin reset; live password-rule checks.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/first-login` in `frontend/src/features/auth/FirstLoginPage.tsx` with current/temporary-password verification, live password-rule checks, confirmation matching, and a server-backed `/api/auth/change-password` update. The app routes users marked `mustChangePassword` to this screen, and backend `password.changed` middleware blocks other protected APIs until the update succeeds. Coverage is in `frontend/src/test/firstLogin.test.tsx` plus `backend/tests/Feature/AuthenticationTest.php` (backend runtime is pending in a PHP environment with `mbstring`). Formal Phase 2 audit remains pending.

### B03. Access denied — System

- **Route:** `/403`
- **Documented access:** All users
- **Build scope:** Plain permission-denied message with return-to-dashboard action.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/403` with `DeniedPage`/`SystemPage` in `frontend/src/features/operations/OperationalPages.tsx`, including a plain access-denied message and return-to-dashboard action. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B04. Not found — System

- **Route:** `/404`
- **Documented access:** All users
- **Build scope:** Plain not-found message with return-to-dashboard action.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/404` with `NotFoundPage`/`SystemPage` in `frontend/src/features/operations/OperationalPages.tsx`, including a plain not-found message and return-to-dashboard action. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B05. Role-specific Dashboard — M0

- **Route:** `/`
- **Documented access:** All signed-in roles
- **Build scope:** One route with documented role-specific dashboard content and quick links; Accounting alone may have the single collection-trend chart.
- **Build status:** [x] Built
- **Resume Note:** Implemented the role-specific dashboard route in `frontend/src/features/dashboard/`, wired through `frontend/src/auth/session.tsx` and `frontend/src/App.tsx`. Live Cashier, Accounting, Administrator, and Auditor summaries use authenticated `GET /api/dashboard`; Registrar performs no dashboard-summary fetch and carries no financial values. Its amount-free student search remains the primary dashboard action; the duplicate clearance card was removed because the role sidebar already links to the sole clearance workspace. Retained one compact Audit Review dashboard link required by M0.1, and removed the larger workspace panel to reduce duplicate emphasis with the sole Auditor sidebar item. The Auditor summary returns aggregate totals/counts only; it does not expose individual student/payment activity. Removed Cashier's repeated workspace action panel; its top-level Record Payment, KPI links, status/attention summaries, and Recent Activity remain. A 1366×768 headless Chrome review confirmed the Auditor/Registrar/Cashier duplicates and confirmed the Cashier Recent Activity heading becomes visible after simplification. Accounting alone renders the collection-trend chart; its month/day labels use shared Manila date formatting independent of calendar year, and empty periods show an explicit no-collections state. Cashier and Auditor default to Today; Administrator has no unused range selector. Dashboard assertions now check the Auditor has no transaction-level recent activity; no test suite was run in this continuation. Formal Phase 2 audit remains open.

### B06. My Profile — M0/M1

- **Route:** `/profile`
- **Documented access:** All signed-in users
- **Build scope:** View name, role, last login; change own password; no self-edit of name/username.
- **Build status:** [x] Built
- **Resume Note:** `/profile` is implemented in `frontend/src/features/operations/OperationalPages.tsx`. It shows the authenticated user's name, role, server-provided last-login time, and submits password changes through `/api/auth/change-password` with confirmation, inline errors, and saving/success states; it does not allow self-editing username/name. Coverage is in `frontend/src/test/profile.test.tsx`. Formal Phase 2 audit remains pending.

### B07. Student List — M2

- **Route:** `/students`
- **Documented access:** CSH / ACC
- **Build scope:** Search/filter student records; REG receives only the documented limited fields.
- **Build status:** [x] Built
- **Resume Note:** Production `/students` uses `LiveStudentsPage` and the role-protected `/api/students` search/filter/pagination endpoint. Registrar receives only enrollment fields, without balances or guardian data; other documented reader roles may see the current school-year balance. Coverage: `frontend/src/test/liveStudents.test.tsx` and `backend/tests/Feature/StudentAccessTest.php`. Editing/import remain separate and unresolved; formal Phase 2 audit remains pending.

### B08. New Student — M2

- **Route:** `/students/new`
- **Documented access:** CSH (production write unavailable pending U02)
- **Build scope:** Create student and guardian information with duplicate-number handling.
- **Build status:** [x] Built
- **Resume Note:** Development `/students/new` retains the sample `StudentFormPage`. In production the form is disabled and cannot claim a local save because student create authority and API persistence remain unresolved under Decision 31.3. Formal Phase 2 audit remains pending.

### B09. Edit Student — M2

- **Route:** `/students/:id/edit`
- **Documented access:** CSH (production write unavailable pending U02)
- **Build scope:** Edit permitted student/guardian links and status; no hard delete.
- **Build status:** [x] Built
- **Resume Note:** Development `/students/:id/edit` retains the sample `StudentFormPage`. In production editing is disabled until the school confirms edit authority and the server-backed mutation is implemented; no sample edit success is shown. Formal Phase 2 audit remains pending.

### B10. Student Profile — M2

- **Route:** `/students/:id`
- **Documented access:** CSH / ACC
- **Build scope:** Student overview and guardian contacts for CSH/ACC; contextual actions stay in their dedicated workspaces.
- **Build status:** [x] Built
- **Resume Note:** Production `/students/:id` uses `LiveStudentProfilePage` and the role-limited server serializer. It shows guardian name, relationship, email, mobile, and email status only to CSH/ACC under the current role simplification; Registrar receives no guardian or balance fields. Production new/edit routes are disabled so sample forms cannot report a false save. Guardian privacy coverage is in `StudentAccessTest.php` and `liveStudents.test.tsx`; formal Phase 2 audit remains pending.

### B11. Account List — M3

- **Route:** `/accounts`
- **Documented access:** CSH / ACC
- **Build scope:** Search/filter billing accounts by documented criteria.
- **Build status:** [x] Built
- **Resume Note:** Production `/accounts` uses `LiveBillingAccounts` and role-protected `/api/billing-accounts` search/filter/pagination; the current simplified role map grants `account.view` to CSH/ACC only and denies ADM/AUD/REG. Coverage is in `frontend/src/test/liveBillingAccounts.test.tsx` and `backend/tests/Feature/BillingAccountReadTest.php`; the backend suite was run with the installed PHP `mbstring`, SQLite, and OpenSSL extensions explicitly enabled. Formal Phase 2 audit remains pending.

### B12. Create Billing Account — M3

- **Route:** `/accounts/new`
- **Documented access:** CSH
- **Build scope:** Four-step account wizard: student, fees, plan/schedule, review/create.
- **Build status:** [x] Built
- **Resume Note:** Development retains the sample `AccountWizardPage`. Production creation is disabled until server-backed plan/schedule creation and its confirmed configuration are available; the route cannot claim a mock account save. Formal Phase 2 audit remains pending.

### B13. Account Detail — M3

- **Route:** `/accounts/:id`
- **Documented access:** CSH / ACC
- **Build scope:** Totals, fee items, schedule, payments, adjustments, activity; cashier actions where permitted.
- **Build status:** [x] Built
- **Resume Note:** Production `/accounts/:id` uses `LiveBillingAccountDetail` for API totals, fee items, installment schedule, payments, adjustments, account-scoped activity, and the permitted Cashier record-payment shortcut. The activity feed combines the account's creation, payments, adjustments, and audit events attached to those payments; it excludes unrelated/global audit entries and does not change role access. Coverage: `frontend/src/test/liveBillingAccounts.test.tsx` and `backend/tests/Feature/BillingAccountReadTest.php`. Formal Phase 2 audit and browser/finance-control review remain pending.

### B14. Record Payment — M4

- **Route:** `/payments/new` and `?student=:id`
- **Documented access:** CSH
- **Build scope:** Fast-path payment flow with balance/next due, validation, confirmation, receipt preview and post-save feedback.
- **Build status:** [x] Built
- **Resume Note:** Production `/payments/new` uses `LivePaymentEntryPage` and authenticated student/account APIs. Cashier can fill the next installment, enter a Manila-local payment date, provide required back-date and server-requested duplicate reasons, add an optional note, review, and submit with the existing stable idempotency key; these fields reach the Laravel payment endpoint. Cash remains the documented method. Receipt preview/print after save now links to the live receipt view with Cashier Done return; formal Phase 2 audit remains pending.

### B15. Transaction History — M4

- **Route:** `/payments`
- **Documented access:** CSH / ACC
- **Build scope:** Search/filter payments; cashier own-scope by default; export where permitted.
- **Build status:** [x] Built
- **Resume Note:** Production `/payments` uses `LivePaymentsPage` and persisted API history, with student/receipt search, status, date-range, cashier, and method filters. Laravel scopes Cashier results to the authenticated recorder; Accounting has finance-wide history. Export follows current filters across all pages as Excel-compatible CSV. Coverage: `livePayments.test.tsx`, `cashierApi.test.ts`, and `CashierOperationsTest.php` (filtering and own-scope). Formal Phase 2 audit remains pending.

### B16. Payment Detail — M4

- **Route:** `/payments/:id`
- **Documented access:** CSH / ACC
- **Build scope:** Payment, allocation, receipt, recorder, notification status, audit information and permitted void/reprint actions.
- **Build status:** [x] Built
- **Resume Note:** Production `/payments/:id` uses the live payment API, shows allocation, receipt, recorder, payment status, per-channel notification status, and payment-scoped audit events, with Cashier void request where permitted. The endpoint returns no guardian contact fields, allows CSH/ACC, scopes Cashier to own records, and denies Administrator, Auditor, and Registrar. Coverage: `livePayments.test.tsx` and `CashierOperationsTest.php`. Formal Phase 2 audit remains pending.

### B17. Receipt Print View — M4

- **Route:** `/receipts/:id/print`
- **Documented access:** CSH / ACC print and view
- **Build scope:** Print-styled receipt with sequential server number and VOID/REPRINT behavior.
- **Build status:** [x] Built
- **Resume Note:** Production `/receipts/:id/print` uses `LivePaymentReceiptPage` and server payment data. The first print records `first_printed_at` without incrementing reprint count; later prints increment the count and are audit-logged as reprints. Only CSH/ACC can view and print. A17 coverage is in `livePayments.test.tsx` and `CashierOperationsTest.php`. Receipt title/header configuration and paper size remain unresolved under Decision 31.3/M9.5; formal Phase 2 audit remains pending.

### B18. Void Approval Queue — M5

- **Route:** `/voids`
- **Documented access:** ACC sees and decides the full queue; CSH sees own request status inside Transaction History; ADM/AUD have no void-history access.
- **Build scope:** Pending void requests, approve/reject behavior and separation-of-duties constraints.
- **Build status:** [x] Built
- **Resume Note:** Production `/voids` uses persisted void requests; Cashier submits requests and sees own status inline in Transaction History; Accounting sees and decides the full queue. Administrator and Auditor have no void-history access. `CashierOperationsTest.php` verifies forbidden decisions, pending state after denial, approval effects, and requester/approver audit identities. `frontend/src/test/liveVoids.test.tsx` verifies the read-only Administrator view. Formal Phase 2 audit remains pending.

### B19. Overdue Follow-up — M11

- **Route:** `/followup`
- **Documented access:** CSH / ACC
- **Build scope:** Due-soon/overdue list, filters, and reminder-batch flow for permitted roles.
- **Build status:** [x] Built
- **Resume Note:** Live Cashier and Accounting views now load a paginated read-only list from `/api/follow-up`, using unpaid installment balances and recalculated due-soon/overdue statuses. Grade, section, student search, status, amount/days sorting, and guardian contact display are available; the follow-up print option was removed by current user direction. Reminder history is shown as not recorded because no verified reminder-kind/delivery contract exists; sending remains disabled until provider, consent/cost policy, and retry safety are established. Payment and void operations recalculate installment and account status using the numeric `billing.due_soon_days` value in `system_settings` (default 7); the scheduled `educatrak:recalculate-billing-statuses` command refreshes statuses daily at 00:05 Asia/Manila. API role/response coverage is in `backend/tests/Feature/FollowUpTest.php`; lifecycle coverage is in `backend/tests/Feature/BillingStatusSynchronizationTest.php`; UI coverage is in `frontend/src/test/liveFollowup.test.tsx`. The full suites pass (114 frontend tests across 22 files; 75 backend tests / 471 assertions). Deployment must run Laravel's scheduler; the formal Phase 2 audit remains pending.

### B20. Clearance Lookup — M10

- **Route:** `/clearance`
- **Documented access:** REG only
- **Build scope:** Enrollment/exam clearance with role-aware reasons; REG never sees amounts.
- **Build status:** [x] Built
- **Resume Note:** The development mock retains student lookup and role-aware clearance examples without Registrar amounts. Production now shows an unavailable state until clearance rules and a verified live clearance API are available; formal Phase 2 audit remains pending.

### B21. Exam Permit Print View — M10

- **Route:** `/permits/:studentId/:period/print`
- **Documented access:** REG only
- **Build scope:** Printable permit only for cleared periods; print is logged.
- **Build status:** [x] Built
- **Resume Note:** The development mock retains the print layout. Production now shows an unavailable state because permit eligibility, print logging, and a live clearance API are not connected; formal Phase 2 audit remains pending.

### B22. End-of-Day Close-out — M13

- **Route:** `/closeout`
- **Documented access:** CSH
- **Build scope:** System totals, counted cash, variance/reason, confirmation, lock and printable summary.
- **Build status:** [x] Built
- **Resume Note:** Production `/closeout` uses `LiveDailyCloseOut` in `frontend/src/features/operations/LiveCloseouts.tsx` with server totals, cent-exact count/variance, required variance explanation, review confirmation, locked submission, and a Cashier print-summary action after submission. Development retains the sample page. API behavior is covered in `frontend/src/test/liveCloseouts.test.tsx` and `CashierOperationsTest.php`, which verifies cashier-only submission, Accounting-only sign-off, repeat-sign-off rejection, preserved signed amounts, and sign-off audit attribution. Formal Phase 2 audit remains pending.

### B23. Close-out History — M13

- **Route:** `/closeout/history`
- **Documented access:** CSH own / ACC
- **Build scope:** History and accounting sign-off for unsigned entries.
- **Build status:** [x] Built
- **Resume Note:** Production `/closeout/history` uses `LiveCloseOutHistory` with API-backed records and Accounting sign-off; Cashier history is scoped to the signed-in cashier, while Accounting has finance-wide read access. `CashierOperationsTest.php::test_cashier_close_out_history_is_limited_to_their_own_records` verifies the ownership boundary. History includes signer and sign-off time. Added print-summary access only for Cashier and Accounting, per M13; Administrator and Auditor stay view-only. Development retains sample rows; formal Phase 2 audit remains pending.

### B24. Reports Hub — M7

- **Route:** `/reports`
- **Documented access:** ACC only; Auditor reviews audit events in Audit Review
- **Build scope:** Entry point to permitted reports.
- **Build status:** [x] Built
- **Resume Note:** Production `/reports` exposes the live daily and outstanding reports; the statement is reached from the selected student's live profile. Monthly report shows an unavailable state until its category-allocation data source is established; development retains sample views. Formal Phase 2 audit remains pending.

### B25. Daily Collection Report — M7

- **Route:** `/reports/daily`
- **Documented access:** ACC only; Cashier own totals remain in Dashboard and Close-out
- **Build scope:** Totals by method/cashier, payment list, voids separately, print/export.
- **Build status:** [x] Built
- **Resume Note:** Production `/reports/daily` uses `LiveDailyReport` and role-protected `/api/reports/daily`; Accounting can review date, method/cashier totals, persisted payment rows, and void requests/decisions. Cashier, Administrator, Auditor, and Registrar are denied the standalone report; Cashier own daily totals remain in Dashboard and Close-out. Print and Excel-compatible CSV export are available to Accounting. Coverage: `frontend/src/test/liveDailyReport.test.tsx` and `backend/tests/Feature/DailyReportTest.php`; formal Phase 2 audit remains pending.

### B26. Monthly Financial Report — M7

- **Route:** `/reports/monthly`
- **Documented access:** ACC only
- **Build scope:** Collections by fee category/grade and collected-vs-billed, print/export.
- **Build status:** [x] Built
- **Resume Note:** Development retains the sample monthly report. Production currently shows an unavailable state until fee-category/grade collection data and billed-total contracts are implemented; formal Phase 2 audit remains pending.

### B27. Outstanding Balances Report — M7

- **Route:** `/reports/outstanding`
- **Documented access:** ACC only
- **Build scope:** Grade/section/minimum-balance/overdue filters, print/export.
- **Build status:** [x] Built
- **Resume Note:** Production `/reports/outstanding` uses `/api/reports/outstanding`, filters by grade, section, minimum balance, and unpaid installments past their due date across school years for Accounting only. School year is shown per account; Cashier, Administrator, Auditor, and Registrar are denied. Print and Excel-compatible CSV export are available across all filtered pages. Coverage: `frontend/src/test/liveOutstandingReport.test.tsx` and `backend/tests/Feature/OutstandingReportTest.php`; formal Phase 2 audit remains pending.

### B28. Student Statement of Account — M7

- **Route:** `/reports/student/:id`
- **Documented access:** ACC only
- **Build scope:** Student fees, schedule, payments and balance; role-specific print/export permissions.
- **Build status:** [x] Built
- **Resume Note:** Production `/reports/student/:id` reads current-school-year fees, installment schedule, payments, and balance through `/api/reports/students/{id}/statement`; Accounting alone can view, print, and export the statement. Administrator, Cashier, Auditor, and Registrar are denied by frontend and API capability checks. Coverage: `frontend/src/test/liveStudentStatement.test.tsx` and `backend/tests/Feature/DailyReportTest.php`; formal Phase 2 audit remains pending.

### B29. Notification Log — M6

- **Route:** `/notifications`
- **Documented access:** CSH / ACC
- **Build scope:** Filter/view notification entries in the combined Cashier/Accounting follow-up workspace; retry remains unavailable pending U04.
- **Build status:** [x] Built
- **Resume Note:** Production `/notifications` now reads persisted entries through `GET /api/notifications` with status, Manila-local date, and student filters for CSH/ACC; development retains the sample view. The live page reports recorded status without implying that queued entries were delivered. Retry remains unavailable until a real delivery/retry worker is in place. Covered by `frontend/src/test/liveNotificationLog.test.tsx` and `backend/tests/Feature/NotificationLogReadTest.php` (PHP runtime requires `mbstring`); formal Phase 2 audit remains pending.

### B30. Ledger Import Wizard — M12

- **Route:** `/import`
- **Documented access:** No role; unavailable pending U08
- **Build scope:** Upload, map, preview/validate, error report, valid-row continuation, final confirm and result summary.
- **Build status:** [x] Built
- **Resume Note:** The development mock retains staged upload, mapping, preview, and result states. Production now shows an unavailable state because student-data authority, matching rules, and a commit API are unresolved; formal Phase 2 audit remains pending.

### B31. Fee Schedules — M9

- **Route:** `/settings/fees`
- **Documented access:** ACC only
- **Build scope:** Fee schedules/items and documented lifecycle; edits affect new accounts only.
- **Build status:** [x] Built
- **Resume Note:** Production `/settings/fees` reads persisted schedules and versioned items through `/api/settings/finance/fees` for ACC only. Accounting can add items, revise by creating a linked version, and deactivate; each mutation has an audit entry, deletion is unavailable, and prior fee/account snapshots remain intact. API mutation coverage is in `FinanceSettingsMutationTest.php`; read and Accounting UI coverage is in `FinanceSettingsReadTest.php` and `liveFinanceSettings.test.tsx`. Formal Phase 2 audit remains pending.

### B32. Payment Plans — M9

- **Route:** `/settings/plans`
- **Documented access:** ACC only
- **Build scope:** Plan configuration, schedule preview and lifecycle; edits affect new accounts only.
- **Build status:** [x] Built
- **Resume Note:** Production `/settings/plans` reads persisted plans and installment structures through `/api/settings/finance/plans` for ACC only. The view clearly reports that plan edits are unavailable until an approved versioned, audited mutation workflow is implemented; formal Phase 2 audit remains pending.

### B33. Clearance Rules — M9

- **Route:** `/settings/clearance-rules`
- **Documented access:** ACC only
- **Build scope:** Enrollment/exam rules, plain-language preview, test-with-student, lifecycle.
- **Build status:** [x] Built
- **Resume Note:** The development mock retains clearance-rule examples. Production now shows an unavailable state until approved rules and a verified settings API exist; formal Phase 2 audit remains pending.

### B34. School / Academic Lists Settings — M9

- **Route:** `/settings/school`
- **Documented access:** ADM manage; ACC read
- **Build scope:** School year, terms/exam periods, grade levels, sections and payment methods.
- **Build status:** [x] Built
- **Resume Note:** The development mock retains school-year, term, grade, section, and cash-only payment-method examples. Production now shows an unavailable state because no verified academic-settings API exists. M9 routes separate system read (`ACC`/`AUD`) from manage (`ADM`) capability; role matrix coverage is in `operations.test.tsx` and `CapabilityMapTest.php`. Formal Phase 2 audit remains pending.

### B35. Receipt Settings — M9

- **Route:** `/settings/receipt`
- **Documented access:** ADM manage; ACC read
- **Build scope:** School identity, receipt title, paper size and next receipt number behavior.
- **Build status:** [x] Built
- **Resume Note:** The development mock retains receipt-format examples. Production now shows an unavailable state because receipt settings are not connected to a verified API. M9 routes separate system read (`ACC`/`AUD`) from manage (`ADM`) capability; role matrix coverage is in `operations.test.tsx` and `CapabilityMapTest.php`. Formal Phase 2 audit remains pending.

### B36. Email Settings — M9

- **Route:** `/settings/email`
- **Documented access:** ADM manage; ACC read
- **Build scope:** Sender settings, daily send limit and test email.
- **Build status:** [x] Built
- **Resume Note:** The development mock retains sender, daily-limit, and test-email examples. Production now shows an unavailable state because email-provider configuration and delivery are not connected. M9 routes separate system read (`ACC`/`AUD`) from manage (`ADM`) capability; role matrix coverage is in `operations.test.tsx` and `CapabilityMapTest.php`. Formal Phase 2 audit remains pending.

### B37. User Administration — M1

- **Route:** `/admin/users`
- **Documented access:** ADM
- **Build scope:** Search/create/edit/deactivate/reactivate/reset users and inspect user activity as documented.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/admin/users` as `UsersPage` with live name-or-username search, user list rows, and an Edit action that opens account editing plus password reset, confirmed deactivation, and reactivation controls. The mock preserves account history messaging, shows the reset temporary password once, and disables an administrator's self-deactivation action. Mock creation mirrors live role-assignment choices, adds the new fictional account to the local sample list, and rejects duplicate usernames. Focused `operations.test.tsx` passes (49 tests), the TypeScript/Vite production build passes, and production asset verification excludes all 74 checked markers. Formal Phase 2 audit remains pending. Updated Sunday, October 25, 2026 — 15:04:28 Asia/Manila.

### B38. Role Matrix — M1

- **Route:** `/admin/roles`
- **Documented access:** ADM
- **Build scope:** Read-only reference of the documented role/capability matrix.
- **Build status:** [x] Built
- **Resume Note:** `/admin/roles` renders the six-role capability matrix from the same frontend capability map used by route guards, including the separate Super Admin governance role and Accounting Officer. It states that server checks remain authoritative; workflows whose live APIs are unavailable remain unavailable separately. `operations.test.tsx` verifies six-role navigation and capability visibility. Formal Phase 2 audit remains pending.

### B39. Audit Log — M8

- **Route:** `/admin/audit-log`
- **Documented access:** ADM security events; ACC / AUD Audit Review
- **Build scope:** Filter audit entries and inspect before/after change detail; immutable.
- **Build status:** [x] Built
- **Resume Note:** Production Administrator `/admin/audit-log` is limited to `LiveAdminLog` and capability-protected `/api/admin/security-events`; Auditor alone receives the separate read-only filtered `/api/audit-log` through `LiveAuditLog`. Accounting is denied this workspace to keep Audit Review exclusive to Auditor. The general audit serializer returns before/after values from a field allowlist and date filters use Asia/Manila day boundaries. Coverage: `frontend/src/test/liveAuditLog.test.tsx`, `backend/tests/Feature/AuditLogReadTest.php`, and Administrator security-event coverage in `UserAdministrationTest.php`. Formal Phase 2 audit remains pending.

### B40. Backup & Recovery — M8

- **Route:** `/admin/backup`
- **Documented access:** ADM
- **Build scope:** Backup status/history, run backup, restore-test date and restore instructions.
- **Build status:** [x] Built
- **Resume Note:** The development mock retains backup-status and restore-instruction examples. Production now shows an unavailable state because backup ownership, retention, storage, and restore-drill evidence are not configured; formal Phase 2 audit remains pending.
---

# 2. Cross-Check & Audit Phase

## Phase Entry Gate

Start this phase **only when every Build Phase checkbox is checked**. The purpose is to audit the already-complete frontend as a whole, screen by screen, without having interleaved formal audits during construction.

Process the screens in the same order as the Build Phase.

For **every screen**, perform all four steps below.

### A. Countercheck

Verify the built screen item by item against the actual current project sources. At minimum, verify:

- route and screen purpose;
- visible content and required data;
- documented operations/actions;
- role and capability visibility;
- role-limited data views and privacy restrictions;
- validation, confirmations, warnings and error wording;
- loading, saving, success, error, warning, empty, disabled, hover, focus, completed and permission-denied states where applicable;
- navigation/quick links and documented transitions;
- print/export behavior where applicable;
- documented mock/API interaction and business-rule presentation;
- any module-specific requirements and open-decision handling.

Do not treat the implementation itself as proof that a requirement exists. Countercheck against the actual source documents.

### B. Audit

Audit the screen against all applicable project-wide rules, including:

- **Accessibility:** WCAG AA target; keyboard-only operation; logical tab order; visible focus; clear labels; status never communicated by color alone; minimum readable type sizes; controls at least the documented minimum height.
- **Design system:** exact documented brand/design tokens; typography hierarchy; button hierarchy; shape/radius language; spacing/layout; modal rules; restrained animation; consistent component reuse; one primary action/main task per screen where applicable.
- **Responsive/display behavior:** target Chrome/Edge on Windows 10; correct operation at 1366×768; no page-level horizontal scrolling; must not break at 1024px; desktop-first rather than invented mobile layouts.
- **Data/privacy/security presentation:** no real student data; no credentials/personal data in `localStorage`; REG never sees prohibited amounts/payment/guardian/account information; AUD remains strictly read-only; frontend capability checks are applied consistently without pretending they replace backend enforcement.
- **Financial/business presentation:** integer-centavo handling; no invented receipt numbers; no hard deletes where prohibited; correct void/reprint/clearance/installment behavior as applicable; configurable school policy remains data-driven.
- **Audit/logging implications:** data-changing actions and specifically documented print/reprint/void/etc. events call the appropriate typed/mock API behavior expected to create audit records; do not fabricate backend enforcement.
- **Runtime constraints:** no CDN, Google Fonts, remote images, analytics or telemetry; no unnecessary external runtime dependency.
- **Quality states:** actionable errors; form data preservation on validation failure; confirmations for irreversible operations; session-expiry behavior where applicable.
- **Print surfaces:** browser print-preview compliance for receipt, permit, statements, reports, follow-up list and close-out summary where applicable.
- **Testing/quality:** applicable pure logic unit tests and documented Playwright flow coverage; no console errors; relevant build/test commands actually pass before claiming they pass.

Where guidelines conflict, use the documented priority: **Usability → Clarity → Accessibility → Consistency → Efficiency → Visual polish.**

### C. Simulate

After the screen-specific Countercheck and Audit, trace the screen in application context. Across the audit pass, exercise the documented end-to-end flows rather than checking isolated pages only.

The specification defines these flows and they must all be covered during the completed audit pass:

1. F1 — Record a payment.
2. F2 — Create a billing account at enrollment.
3. F3 — Void a payment.
4. F4 — Check clearance and print an exam permit.
5. F5 — Overdue follow-up and reminder batch.
6. F6 — End-of-day close-out.
7. F7 — Import an existing ledger.
8. F8 — First login and password change.

For each screen, trace **at least one or two complete relevant end-to-end flows when the screen participates in them**. If the screen does not participate directly in F1–F8, simulate a complete role-appropriate path into, through, and out of that screen using only documented behavior. Do not invent a new product workflow merely to satisfy this step.

Record which flow(s) were actually exercised in the Resume Note.

### D. Confirm

Give the screen an explicit **PASS** or **FAIL**.

- **PASS:** all applicable documented requirements and audit rules have been verified, and relevant simulation succeeds.
- **FAIL:** one or more applicable requirements/rules are missing, incorrect, or unverified.

If FAIL:
1. Fix the screen.
2. Re-run its Countercheck.
3. Re-run its Audit.
4. Re-run the relevant simulation.
5. Only then mark the Cross-Check & Audit checkbox complete and record PASS.

A screen is never marked audited merely because it was previously built.

## Screen-by-Screen Audit Inventory

### A01. Login — M1

- **Route:** `/login`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Initial source/test countercheck started against Project Specification M1.1 and `/login`. The implementation includes username/password validation, generic failure messaging, timed lockout feedback, logout routing, password-visibility control, administrator-reset help, labelled fields, and username autofocus. `frontend/src/test/login.test.tsx` covers valid mock login to the dashboard, logout, invalid credentials, repeated-failure wait time, visibility toggle, focus, reset help, sequential keyboard navigation through all login controls, and an API-client/session/UI simulation of HTTP 429 with `Retry-After: 60`. The focused login suite passes (14 tests). This is not a formal PASS: visual review at 1366×768 and 1024px, a real Laravel API login/lockout journey in browser, and the relevant F8 path have not been exercised. Chrome 151 is available by full path outside PATH; isolated headless Chrome browser review at 1366×768 has covered dashboards, but login review at 1366×768 and 1024px, production login/lockout behavior, and F8 remain unexercised. Keep A01 unchecked until those checks are performed.
- **Implementation update (Sunday, October 25, 2026 — 10:32:45 +08:00):** Laravel's named login limiter is five requests per minute per normalized username/IP and returns `Retry-After` when exceeded. The production client now maps a numeric `Retry-After` on HTTP 429 into the existing countdown/disabled state. Build and production-asset verification passed; application tests and live login/lockout browser validation were not run. A01 remains unchecked.
- **Visual update (Sunday, October 25, 2026 — 11:25:44 +08:00):** Development-mode headless Chrome captures at 1366×768 and 1024×768 show the two-column login layout within each viewport, with fields/actions visible and no horizontal overflow. This does not establish production behavior; real Laravel login/throttle and F8 remain unverified. A01 remains unchecked.
- **Server test update (Sunday, October 25, 2026 — 11:28:11 +08:00):** `backend/tests/Feature/AuthenticationTest.php` now submits five failed login requests followed by a sixth and verifies Laravel returns HTTP 429 with a numeric `Retry-After`; the full backend suite passes (118 tests, 753 assertions). This proves the middleware/API response in the test environment, not the browser countdown journey. A01 remains unchecked.

### A02. First-login password change — M1

- **Route:** `/first-login`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Initial source/test countercheck started against Project Specification M1.1, F8, and the temporary-password rule. The screen requires the current temporary password, shows a live 12-character minimum, confirms the new password, sends the change to the authenticated API, and redirects only after success. The profile form now presents the same minimum. `frontend/src/test/firstLogin.test.tsx` and `profile.test.tsx` submit 12+ character lowercase-only examples; `AuthenticationTest.php` verifies the server accepts a 12-character lowercase password and enforces forced-change protection. The approved policy may add class rules, but none are imposed by the current server/spec; the decision remains open for the MCA security/system owner. `firstLogin.test.tsx` verifies a Laravel current-password validation error is announced without leaving the forced-change route, a short password is announced and not sent to the API, autofocus lands on the current-password field, and Tab moves through new password, confirmation, and submit in order. Browser keyboard/focus/visual review and the complete admin-create → login → forced-change F8 journey have not been exercised in this audit. Keep A02 unchecked.

### A03. Access denied — System

- **Route:** `/403`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Initial countercheck against the Project Specification's Access denied requirement confirms `/403` shows a plain permission message and a dashboard link. `RequireCapability` renders this page without rendering the protected child, and `operations.test.tsx` now asserts both denial and the `/` dashboard link. This is not a formal PASS: direct `/403` behavior, keyboard/focus and responsive visual review, and browser route simulation remain unverified. Keep A03 unchecked.

### A04. Not found — System

- **Route:** `/404`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Initial source/test countercheck confirms unmatched app routes redirect to `/404`; `NotFoundPage` shows a not-found message and dashboard link. `operations.test.tsx` covers missing student and billing-account records and asserts the link points to `/`. This is not a formal PASS: an arbitrary unmatched route, keyboard/focus and responsive visual review, and browser simulation remain unverified. Keep A04 unchecked.

### A05. Role-specific Dashboard — M0

- **Route:** `/`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Source/API and development-browser review covers role-specific dashboard summaries, Today defaults, Administrator range-control omission, Registrar financial-data omission, Manila date bounds, and missing/unknown backup results. Live Registrar search has combobox/listbox semantics, active-descendant keyboard navigation, Enter selection, and Escape dismissal; shared student search supports the same keyboard movement. Browser review used isolated headless Chrome at 1366×768. It identified the Registrar clearance card and larger Auditor panel as unnecessary duplicates; the Cashier workspace action panel was also redundant. Registrar search calls `/api/clearance/students` and navigates to `/clearance?studentId=...`, as M0.1 requires. The actual clearance status, decision, and permit-print workflow remain unavailable under U03. This is not a formal pass: visual/focus/contrast review, print-at-1366×768, and F1-F8 checks remain. Keep A05 unchecked.

### A06. My Profile — M0/M1

- **Route:** `/profile`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Source/test countercheck against Project Specification M1.2 confirms the route is inside the authenticated shell and displays the signed-in user's name, role, and server-supplied last-login time. The profile password form calls the authenticated password-change API and the focused suite covers those fields for all six roles; the existing Cashier case also verifies the submitted request and success state. A02/U10's unresolved difference between frontend complexity hints and backend password policy also applies here. A06 remains unchecked pending browser visual, focus/keyboard, and contrast review and end-to-end password-change/error simulation.

### A07. Student List — M2

- **Route:** `/students`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Source/test countercheck against Project Specification M2.1 confirms that the live list queries persisted students and supports name/number, grade, section, and enrollment-status filters. Balance visibility follows `account.view`; only Cashier and Accounting have the general student list. Registrar has no general directory/profile access. `StudentAccessTest.php` verifies role boundaries, Registrar amount/guardian suppression, and guardian visibility for Cashier/Accounting. M2.1 also requires clearance filtering, which is absent from the live page/API while clearance records and calculation remain unavailable under U03. A07 remains unchecked pending the clearance filter contract plus visual, keyboard/focus, contrast, print, and role-journey evidence.

### A08. New Student — M2

- **Route:** `/students/new`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Production `/students/new` returns an explicit unavailable state; `liveStudents.test.tsx` verifies no mock form is exposed as a save path. The create API and approved student-record authority remain unresolved under U02, with account/configuration dependencies also tracked there. A08 remains unchecked pending policy/API resolution and browser visual/accessibility review.

### A09. Edit Student — M2

- **Route:** `/students/:id/edit`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Production `/students/:id/edit` returns an explicit unavailable state; `liveStudents.test.tsx` now verifies this separately from the new-student route and confirms no mock edit form is exposed. Student edit authority remains unresolved under U02. A09 remains unchecked pending policy/API resolution and browser visual/accessibility review.

### A10. Student Profile — M2

- **Route:** `/students/:id`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Production `/students/:id` loads the role-filtered student API. Registrar has no general student profile access; only CSH/ACC can view the profile and guardian contacts. The Cashier now has a profile-only `Record payment` shortcut that deep-links to `/payments/new?student=:id`; the live payment page fetches that student's billing context directly. Focused tests cover this link and preselection. The current user-directed simplification keeps Billing, Payments, and Follow-up in their dedicated workspaces; the older M2.1 nested-tab wording is superseded for this profile. A manual Cashier browser review at 1366×768 found the development profile free of nested workflow tabs and the overview/clearance/guardian sections visible within the viewport. After that review, the duplicate top-level Clearance metric was removed because the clearance-details panel already communicates the same status. Build and production-asset verification passed; application tests were not run. A10 remains unchecked pending Accounting/Cashier/Registrar role-flow review, keyboard/contrast acceptance across all states, and approved role journey evidence.

### A11. Account List — M3

- **Route:** `/accounts`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M3.2 countercheck: the production page exposes search, school-year, grade, and status filters and renders server-paginated account totals/status. `BillingAccountController::index` validates and applies those filters; the current role map allows CSH/ACC and denies ADM/AUD/REG. `BillingAccountReadTest` covers the reader/denied roles with combined search/year/grade filters; `liveBillingAccounts.test.tsx` verifies that each UI filter is sent to the API and changing a filter resets pagination. Formal audit remains unchecked pending browser role-journey, keyboard/focus/visual review at 1366×768, and evidence capture.

### A12. Create Billing Account — M3

- **Route:** `/accounts/new`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M3.1 requires a four-step Cashier flow that selects a student, loads the grade-level fee schedule, allows only optional items to be removed, previews configured plan installments, and creates one account per student/school year with a duplicate guard. The production route currently shows an unavailable state; `POST /api/billing-accounts` is absent, and the existing fee/plan read routes require `settings.finance.view`, which Cashier does not hold. The cashier-only `account.create` UI capability is correct, but the supporting configured-data and create APIs are missing. Do not re-enable the sample wizard or claim a save. Formal audit remains unchecked pending the approved server API, then role journeys and visual/keyboard review.

### A13. Account Detail — M3

- **Route:** `/accounts/:id`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M3.2 source/test countercheck: `/accounts/:id` is protected by `account.view`; the production detail renders API totals, fee items, installments, payments, adjustments, and an account-scoped activity timeline. The timeline combines persisted account/payment/adjustment records with audit events attached to that account's payments and does not expose global audit entries. The `Record payment` action appears only when `payment.record` is allowed (Cashier). `BillingAccountReadTest` covers CSH/ACC detail reads, denies ADM/AUD/REG, and verifies that unrelated payment audit events are excluded; `liveBillingAccounts.test.tsx` covers rendering the activity feed. A13 remains unchecked pending browser visual/keyboard review and full Cashier/Accounting journeys.

### A14. Record Payment — M4

- **Route:** `/payments/new` and `?student=:id`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M4.1 source/test countercheck: the live Cashier form searches students, reads balance/next installment from the API, offers the next-installment shortcut, restricts the date to today or earlier, requires a 10-character back-date reason, accepts an optional note and duplicate override reason, and submits these fields using the stable idempotency key. `livePayments.test.tsx` covers the retry key and the new fields. The server remains authoritative for overpayment, duplicate detection, back-date validation, and persistence. Post-save receipt preview/print is still missing (tracked); formal audit remains unchecked pending that flow plus Cashier browser visual/keyboard evidence.

### A15. Transaction History — M4

- **Route:** `/payments`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M4.2 countercheck: the live list offers student/receipt search and status, date-range, cashier, and method filters; CSV export requests every result page using the active filters. The API restricts Cashier rows to `recorded_by = current user`; backend tests cover Cashier/Accounting readers, Admin/Auditor/Registrar denials, filters, and Cashier scope, while frontend tests cover export and the absence of a cashier selector for Cashier. No edit/delete action is presented. Formal audit remains unchecked pending browser journeys for all roles and visual/keyboard evidence.

### A16. Payment Detail — M4

- **Route:** `/payments/:id`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M4.2 source/test countercheck: payment detail now returns and displays amount/allocation, receipt, recorder, notification channel/status, and a scoped audit trail. The API restricts Cashier to own payments (404 otherwise), supports CSH/ACC, and denies ADM/AUD/REG; the feature test checks CSH/ACC readers and denies ADM/AUD/REG, and confirms notification data omits guardian contact fields. Frontend coverage checks the notification and audit sections. Formal audit remains unchecked pending all-role browser journeys and visual/keyboard evidence.

### A17. Receipt Print View — M4

- **Route:** `/receipts/:id/print`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M4.3 countercheck: the live receipt uses persisted payment and receipt values; only CSH/ACC can view and print. The first print is timestamped and audited without a reprint increment; subsequent print requests increment the reprint count and audit `receipt.reprinted`. Backend and frontend tests cover first print versus reprint. The visible receipt title/header and paper size are still hard-coded because policy remains unresolved in Decision 31.3/M9.5. Formal audit remains unchecked pending browser/print preview at the required size and all-role view/print simulation.

### A18. Void Approval Queue — M5

- **Route:** `/voids`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M5 is simplified per the current role-specific workspace direction: `/voids` is Accounting's approval queue and full history; Cashier sees only own request status inside `/payments`, not a duplicate sidebar page. `VoidRequestController` scopes Cashier API results to `requested_by`; `CashierOperationsTest` verifies Cashier cannot see another Cashier's request, Accounting sees all requests, and other roles are denied. `livePayments.test.tsx` verifies the inline status workspace. Formal A18 visual/browser and keyboard audit remains unchecked.

### A19. Overdue Follow-up — M11

- **Route:** `/followup`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M11.2 cross-check: `/followup` is available to Cashier and Accounting; the live API supplies account/guardian reminder context, and the page filters grade/section/status and sorts overdue days/amount/due date. The follow-up print action was removed by current user direction. Cashier and Accounting use the combined follow-up/notification workspace. Reminder sending remains unavailable because no delivery API/provider and operational limits are approved under U04. Formal audit remains unchecked pending full-role browser, keyboard, and print evidence.

### A20. Clearance Lookup — M10

- **Route:** `/clearance`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M10/current-role countercheck: `/clearance` is Registrar-only; other roles are denied. Clearance and permit access is Registrar-only; Registrar search uses `/api/clearance/students`, while no clearance/permit API exists yet and production shows unavailable states. Development still shows mock student clearance examples, and the Registrar-safe amount suppression is covered in the mock UI, but it is not a live clearance result. The minimum-payment basis, installment cut-off, period/year selection, missing/inactive rule behavior, and correction lifecycle remain undecided under U03. Keep A20 unchecked until Registrar/Finance approve the rules and the server-side API exists; browser/keyboard checks are also pending.

### A21. Exam Permit Print View — M10

- **Route:** `/permits/:studentId/:period/print`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M10/Section 6.4 and U03 countercheck: `permit.print` is Registrar-only and the route guard matches. The production route is unavailable because no eligibility-check/print API exists; the development route prints a fixed sample permit with no student/period route-data binding or print audit. Do not treat the mock as proof of eligibility. U03 still needs policy and print lifecycle decisions. Keep A21 unchecked pending the approved policy, server enforcement and per-print audit; browser/print-layout checks remain.

### A22. End-of-Day Close-out — M13

- **Route:** `/closeout`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M13 source/test countercheck: production `/closeout` uses `LiveDailyCloseOut`; the Cashier sees the Manila business date, own cash-payment total, cent-exact count/variance, required variance explanation, confirmation dialog, and locked state after submit. `CloseoutController` derives totals and records submission audit; `CashierOperationsTest::test_cashier_can_submit_only_one_daily_close_out_and_non_zero_variance_needs_a_reason` covers variance reason, lock, Accounting sign-off and audit actor. Cashier can open own history in the same workspace, keeping navigation consolidated. Added a print-summary action for the locked daily record, limited to the Cashier workspace. `liveCloseouts.test.tsx` passes (3 tests) and `npm run build` passes; A22 remains unchecked for browser, keyboard and print-layout evidence.

### A23. Close-out History — M13

- **Route:** `/closeout/history`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M13 source/test countercheck: Cashier sees own history and Accounting has finance-wide history; backend scopes Cashier rows to the authenticated cashier (`CashierOperationsTest::test_cashier_close_out_history_is_limited_to_their_own_records`). Only Accounting has `closeout.signoff`; backend rejects Cashier sign-off and prevents repeat sign-off, and the frontend shows the action only when authorized. Added a print-summary action for Cashier and Accounting, consistent with M13; Administrator and Auditor have no close-out history access. `liveCloseouts.test.tsx` passes (3 tests) and `npm run build` passes; A23 remains unchecked for browser, keyboard, and print-layout evidence.

### A24. Reports Hub — M7

- **Route:** `/reports`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M7/Section 6.4 route and role countercheck: the hub filters cards with `canViewReport`; Accounting sees reports and statements; Cashier, Administrator, Auditor, and Registrar are denied standalone report routes. The live Student Statement link goes to `/students` for a real student selection instead of a sample identifier; monthly report is hidden in production because U05 is unresolved. `operations.test.tsx` covers Cashier card restrictions and the live student-selection link. A24 remains unchecked pending full role/browser and keyboard evidence.

### A25. Daily Collection Report — M7

- **Route:** `/reports/daily`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M7 countercheck: live daily report queries persisted payments/voids, supports date selection for Accounting only; Cashier, Administrator, Auditor, and Registrar are denied. `DailyReportTest.php` verifies Accounting access and denies Cashier, Administrator, Auditor, and Registrar. CSV export gathers all payment pages; screen print is available to Accounting. Cashier own daily totals remain in Dashboard/Close-out, with no standalone report route. The full frontend suite passes (145 tests across 25 files); the export assertion now follows the report-date input rather than a hard-coded day, so it remains valid across Manila midnight. A25 remains unchecked pending browser, export, print and role-journey evidence.

### A26. Monthly Financial Report — M7

- **Route:** `/reports/monthly`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M7/U05 countercheck: the live route is deliberately unavailable and the production Reports hub hides the card; the implementation has no monthly-report API. Cashier is denied by `GuardReport`; Registrar lacks `report.view`. Development mock rows remain sample-only. Monthly billing semantics and payment-to-fee-category allocation are unresolved under U05, so no report behavior was inferred. A26 remains unchecked pending U05 resolution, API implementation and role/browser evidence.

### A27. Outstanding Balances Report — M7

- **Route:** `/reports/outstanding`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M7 countercheck: the live page reads the paginated outstanding API and supports grade, section, minimum-balance, and overdue-only filters, with clear/reset, print, and CSV export across all pages. `OutstandingReportController` rejects Cashier; `OutstandingReportTest.php` covers the filters and Cashier denial, while the route capability excludes Registrar. Only Accounting can access this report under the current role simplification. A27 remains unchecked pending browser, keyboard, print/export, and all-role evidence.

### A28. Student Statement of Account — M7

- **Route:** `/reports/student/:id`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M7 countercheck: the live statement loads the selected student's current-year fee items, installments, payments and balance from `StudentStatementController`; missing current-year account returns 404. Accounting alone can view, print, and export; Administrator, Cashier, Auditor, and Registrar are denied. Statement navigation starts at `/students`, avoiding a sample student route. `liveStudentStatement.test.tsx` covers API rendering and role-specific actions. A28 remains unchecked pending browser, privacy, print and role-journey evidence.

### A29. Notification Log — M6

- **Route:** `/notifications`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M6/Section 6.4 countercheck: live Cashier/Accounting log reads persisted notification attempts and supports status, student, and Manila-local date filters with paging. The `/notifications` URL redirects both Cashier and Accounting into the notification tab of the combined follow-up workspace, reducing duplicate navigation. Administrator, Auditor, and Registrar are denied. `NotificationLogReadTest.php` covers CSH/ACC reads; Administrator, Auditor, and Registrar denial. Queued records are explicitly described as unconfirmed delivery; provider, retry policy and SMS consent/cost remain unresolved under U04. A29 remains unchecked pending browser/filter/role and delivery-status evidence.

### A30. Ledger Import Wizard — M12

- **Route:** `/import`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M12/Section 6.4 countercheck: import access is denied to every role, and production keeps the route unavailable. Production renders an unavailable state; no import API exists. The development wizard is sample-only. U08 still needs the student master-list owner, accepted file format, duplicate/matching rules, year association and rollover authority. Keep A30 unchecked until that contract and audited import endpoint exist.

### A31. Fee Schedules — M9

- **Route:** `/settings/fees`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M9 countercheck: Accounting alone reads persisted fee schedules and can add, version/revise, or deactivate fee items. Backend routes use separate read/manage capabilities, mutation tests verify version linkage, audit events and unchanged existing billing-account snapshots; Cashier and Registrar are denied reads. No fee deletion is exposed. `FinanceSettingsReadTest.php`, `FinanceSettingsMutationTest.php`, and `liveFinanceSettings.test.tsx` cover current behavior. A31 remains unchecked pending browser, keyboard, and role-journey evidence.

### A32. Payment Plans — M9

- **Route:** `/settings/plans`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M9 countercheck: live payment-plan configuration is Accounting-only; Administrator, Cashier, Auditor and Registrar are denied. The page shows persisted down-payment and installment details. Accounting's interface states plan writes are not yet available and no payment-plan mutation API exists, so no sample save flow is used in production. `FinanceSettingsReadTest.php` covers role access and installment order; `liveFinanceSettings.test.tsx` covers rendering. A32 remains unchecked pending browser and role-journey evidence and approved write API follow-up under U06.

### A33. Clearance Rules — M9

- **Route:** `/settings/clearance-rules`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M9/U03 countercheck: the route is limited to Accounting finance-settings readers, with only Accounting designated for edits; Auditor is restricted to Audit Review. Production shows an unavailable state; there is no clearance-rule API or plain-language test-with-student calculator. Clearance thresholds, exam-period selection, inactive/missing-rule behavior, and correction lifecycle remain unresolved in U03, so the mock settings are not treated as policy. A33 remains unchecked pending owner-approved rules/API and role/browser evidence.

### A34. School / Academic Lists Settings — M9

- **Route:** `/settings/school`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M9/U06 countercheck: Administrator manages system settings and Accounting may read the required configuration; Cashier, Auditor and Registrar have no access. Production shows an unavailable state because school-year/list APIs are absent; the development mock does not persist changes. School-year start/end-date and overlap rules remain unresolved in the existing decision record. A34 remains unchecked pending policy, persistence API and browser/role evidence.

### A35. Receipt Settings — M9

- **Route:** `/settings/receipt`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M9/U06 countercheck: only Administrator has system-settings edit access; only Accounting has read access; Auditor is restricted to Audit Review, and Cashier/Registrar are denied. Production shows an unavailable state because receipt-setting APIs are not implemented. Receipt title/header and paper size remain undecided under Decision 31.3; do not treat mock defaults as configured policy. A35 remains unchecked pending the decision, settings API and print/browser evidence.

### A36. Email Settings — M9

- **Route:** `/settings/email`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M6/M9/U04 countercheck: Administrator is the only system-settings editor and Accounting is the only read-only role; Cashier, Auditor and Registrar are denied. Production shows an unavailable state because email-setting/test-delivery APIs are absent. Provider/network availability, sender configuration, consent/cost and retry rules remain unresolved under U04; mock send limits are not live configuration. A36 remains unchecked pending policy, API and browser evidence.

### A37. User Administration — M1

- **Route:** `/admin/users`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M1/Section 6.4 countercheck: only Administrator can use the persisted user API; creation, update/status changes and temporary-password reset are server-backed and record security events. The role picker excludes Accounting Officer creation/promotion per Decision 31.5; self-deactivation and disabling the last active Administrator are prevented. Password complexity remains a decision item because UI rules exceed server validation. `UserAdministrationTest.php` and `liveUsers.test.tsx` cover roles, safeguards and actions. A37 remains unchecked pending approved password policy, browser/keyboard and all-role evidence.

### A38. Role Matrix — M1

- **Route:** `/admin/roles`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M1/Section 6.4 countercheck: the live interface derives its six-role matrix from the same frontend capability sets that drive route/action guards. It presents the governance-only Super Admin, Administrator, Cashier, Accounting Officer, Auditor, and Registrar. `operations.test.tsx` verifies the six-role navigation and role-matrix capabilities. Super Admin bootstrap is console-only and protected-account changes are backend-denied; MCA recovery/second-person policy remains open in U09. A38 remains unchecked pending browser/keyboard and policy-owner evidence.

### A39. Audit Log — M8

- **Route:** `/admin/audit-log`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** Administrator `/admin/audit-log` is limited to security events under `security.events.view`. Auditor alone uses the filtered finance/change audit under `audit.view`; Accounting is denied this workspace and Admin has no route or API access to it. `liveAdminLog.test.tsx` verifies the Security page stays security-event-only (2 tests), while `LiveAuditLog` covers audit filtering/detail. Neither feed exposes edit/delete actions. A39 remains unchecked pending persistence/actor-retention review and browser/role evidence.

### A40. Backup & Recovery — M8

- **Route:** `/admin/backup`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** M8.2/U07 countercheck: `backup.manage` is Administrator-only and the production route fails closed; there is no backup status/history or manual backup API. The development mock's displayed success/date values and Run backup button are not live. Deployment owner, secure storage, retention, schedule, recovery instructions and witnessed restore test remain unapproved under U07. A40 remains unchecked pending those decisions, API implementation and recovery drill evidence.

---

# 3. Full Handoff Checklist

> **Important:** Build and Audit are intentionally separate. A checked Build box means the screen was built; it does **not** mean it has passed the later compliance audit.
>
> **Checked is not permanently final.** If project documentation, an approved decision, access rules, design guidance, API contract, or another governing requirement changes after a screen was checked in a way that could affect that screen, the relevant checkbox must be treated as stale. Re-open the affected work and re-audit it. Never assume “checked” still means “compliant” after a potentially relevant source-of-truth change.
>
> The detailed entries in Sections 1 and 2 are the authoritative progress records. This summary must be kept synchronized with them.

## Build Phase Summary

- [x] B01 — **Login** (`/login`)
  - **Resume Note:** Implemented and validated. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B02 — **First-login password change** (`/first-login`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B03 — **Access denied** (`/403`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B04 — **Not found** (`/404`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B05 — **Role-specific Dashboard** (`/`)
  - **Resume Note:** Implemented and validated. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B06 — **My Profile** (`/profile`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B07 — **Student List** (`/students`)
  - **Resume Note:** Implemented and validated. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B08 — **New Student** (`/students/new`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B09 — **Edit Student** (`/students/:id/edit`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B10 — **Student Profile** (`/students/:id`)
  - **Resume Note:** Implemented and validated. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B11 — **Account List** (`/accounts`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B12 — **Create Billing Account** (`/accounts/new`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B13 — **Account Detail** (`/accounts/:id`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B14 — **Record Payment** (`/payments/new` and `?student=:id`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B15 — **Transaction History** (`/payments`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B16 — **Payment Detail** (`/payments/:id`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B17 — **Receipt Print View** (`/receipts/:id/print`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B18 — **Void Approval Queue** (`/voids`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B19 — **Overdue Follow-up** (`/followup`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B20 — **Clearance Lookup** (`/clearance`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B21 — **Exam Permit Print View** (`/permits/:studentId/:period/print`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B22 — **End-of-Day Close-out** (`/closeout`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B23 — **Close-out History** (`/closeout/history`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B24 — **Reports Hub** (`/reports`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B25 — **Daily Collection Report** (`/reports/daily`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B26 — **Monthly Financial Report** (`/reports/monthly`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B27 — **Outstanding Balances Report** (`/reports/outstanding`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B28 — **Student Statement of Account** (`/reports/student/:id`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B29 — **Notification Log** (`/notifications`)
  - **Resume Note:** Implemented and validated. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B30 — **Ledger Import Wizard** (`/import`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B31 — **Fee Schedules** (`/settings/fees`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B32 — **Payment Plans** (`/settings/plans`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B33 — **Clearance Rules** (`/settings/clearance-rules`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B34 — **School / Academic Lists Settings** (`/settings/school`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B35 — **Receipt Settings** (`/settings/receipt`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B36 — **Email Settings** (`/settings/email`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B37 — **User Administration** (`/admin/users`)
  - **Resume Note:** Implemented and validated. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B38 — **Role Matrix** (`/admin/roles`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B39 — **Audit Log** (`/admin/audit-log`)
  - **Resume Note:** Production Administrator security events and the separate Auditor-only financial-change audit read persisted events through their role-specific APIs; Accounting is denied the latter. See B39 evidence above; focused audit authorization tests and the full Laravel suite pass when bundled PHP extensions are loaded, and formal Phase 2 audit remains pending.
- [x] B40 — **Backup & Recovery** (`/admin/backup`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.

## Cross-Check & Audit Phase Summary

- [ ] A01 — **Login** (`/login`)
  - **Resume Note:** Source/test countercheck started against Project Specification M1.1: username/password entry, generic failed-login response, lockout wait feedback, and login/logout/session behavior are implemented. `login.test.tsx` covers first-field focus, sequential keyboard order, password visibility, administrator-led reset help, generic failure, and local lockout state; its production-path case feeds an HTTP 429 response with `Retry-After: 60` through the real API client/session/UI and confirms the one-minute message plus disabled submit. Backend `AuthenticationTest.php` covers login, inactive-account denial, failed-login audit without password capture, and protected session behavior. Current full suites pass (frontend: 157 tests across 25 files; backend: 117 tests / 745 assertions). Remaining before A01 can be checked: exercise a real Laravel 429 response and visible countdown end-to-end, and finish production-browser/contrast acceptance; see the open U12 throttle item in `Issues-and-TODOs.md`.
- [ ] A02 — **First-login password change** (`/first-login`)
  - **Resume Note:** _Not started._
- [ ] A03 — **Access denied** (`/403`)
  - **Resume Note:** _Not started._
- [ ] A04 — **Not found** (`/404`)
  - **Resume Note:** _Not started._
- [ ] A05 — **Role-specific Dashboard** (`/`)
  - **Resume Note:** _Not started._
- [ ] A06 — **My Profile** (`/profile`)
  - **Resume Note:** _Not started._
- [ ] A07 — **Student List** (`/students`)
  - **Resume Note:** _Not started._
- [ ] A08 — **New Student** (`/students/new`)
  - **Resume Note:** _Not started._
- [ ] A09 — **Edit Student** (`/students/:id/edit`)
  - **Resume Note:** _Not started._
- [ ] A10 — **Student Profile** (`/students/:id`)
  - **Resume Note:** _Not started._
- [ ] A11 — **Account List** (`/accounts`)
  - **Resume Note:** _Not started._
- [ ] A12 — **Create Billing Account** (`/accounts/new`)
  - **Resume Note:** _Not started._
- [ ] A13 — **Account Detail** (`/accounts/:id`)
  - **Resume Note:** _Not started._
- [ ] A14 — **Record Payment** (`/payments/new` and `?student=:id`)
  - **Resume Note:** _Not started._
- [ ] A15 — **Transaction History** (`/payments`)
  - **Resume Note:** _Not started._
- [ ] A16 — **Payment Detail** (`/payments/:id`)
  - **Resume Note:** _Not started._
- [ ] A17 — **Receipt Print View** (`/receipts/:id/print`)
  - **Resume Note:** _Not started._
- [ ] A18 — **Void Approval Queue** (`/voids`)
  - **Resume Note:** _Not started._
- [ ] A19 — **Overdue Follow-up** (`/followup`)
  - **Resume Note:** _Not started._
- [ ] A20 — **Clearance Lookup** (`/clearance`)
  - **Resume Note:** Production route is unavailable under U03; development contains mock clearance examples. See A20 countercheck.
- [ ] A21 — **Exam Permit Print View** (`/permits/:studentId/:period/print`)
  - **Resume Note:** Production route is unavailable under U03; development permit is fixed mock data without eligibility enforcement, route binding, or print audit. See A21 countercheck.
- [ ] A22 — **End-of-Day Close-out** (`/closeout`)
  - **Resume Note:** Cashier print-summary action is implemented; `liveCloseouts.test.tsx` (3 tests) and production build pass. Browser/print evidence remains.
- [ ] A23 — **Close-out History** (`/closeout/history`)
  - **Resume Note:** Cashier own-history and Accounting sign-off boundaries verified; print-summary control is limited to Cashier/Accounting. Browser/print evidence remains.
- [ ] A24 — **Reports Hub** (`/reports`)
  - **Resume Note:** Live Student Statement routes through `/students`; production hides Monthly under U05. Role-card tests cover Cashier restrictions. Browser/keyboard evidence pending.
- [ ] A25 — **Daily Collection Report** (`/reports/daily`)
  - **Resume Note:** Cashier is locked to own activity today; API tests enforce own-user/current-day scope and deny Registrar. CSV fetches all payment pages. Browser, print and export evidence pending.
- [ ] A26 — **Monthly Financial Report** (`/reports/monthly`)
  - **Resume Note:** Production route/card unavailable under U05 pending report semantics and allocation mapping; development mock remains sample-only.
- [ ] A27 — **Outstanding Balances Report** (`/reports/outstanding`)
  - **Resume Note:** ACC only; filters, print and all-page CSV are implemented. Backend test enforces Cashier denial; browser/print/export evidence pending.
- [ ] A28 — **Student Statement of Account** (`/reports/student/:id`)
  - **Resume Note:** Current-year API view is Accounting-only for view, print, and CSV export. Browser/privacy/print evidence pending.
- [ ] A29 — **Notification Log** (`/notifications`)
  - **Resume Note:** Persisted status/date/student filters and paging are available to Cashier and Accounting inside the combined Follow-up workspace. U04 delivery policies remain unresolved.
- [ ] A30 — **Ledger Import Wizard** (`/import`)
  - **Resume Note:** Production unavailable under U08; no role has import access or API; matching/source/rollover policy remains open.
- [ ] A31 — **Fee Schedules** (`/settings/fees`)
  - **Resume Note:** Accounting-only reads and versioned fee item writes. Backend read/mutation tests and UI test coverage exist; browser evidence pending.
- [ ] A32 — **Payment Plans** (`/settings/plans`)
  - **Resume Note:** Accounting-only read; no edit API or sample production save flow. U06 follow-up remains.
- [ ] A33 — **Clearance Rules** (`/settings/clearance-rules`)
  - **Resume Note:** Production unavailable under U03; only Accounting is intended to read finance settings but policy API/calculator is absent.
- [ ] A34 — **School / Academic Lists Settings** (`/settings/school`)
  - **Resume Note:** Production settings unavailable under U06; Administrator manages system settings, Accounting has read access, and Auditor has none.
- [ ] A35 — **Receipt Settings** (`/settings/receipt`)
  - **Resume Note:** Production settings unavailable; Administrator manages system settings and Accounting has read access. Receipt title/header and paper size remain open under Decision 31.3.
- [ ] A36 — **Email Settings** (`/settings/email`)
  - **Resume Note:** Production settings unavailable under U04; Administrator manages system settings, Accounting has read access, and Auditor has none. Provider/network, consent/cost, and retry policy remain unresolved.
- [ ] A37 — **User Administration** (`/admin/users`)
  - **Resume Note:** Persisted Administrator/Super Admin management with role-specific creation choices; only trusted-console bootstrap creates the protected Super Admin, hidden from Administrator listings and immutable through the application. Accounting assignment and password complexity policy remain open.
- [ ] A38 — **Role Matrix** (`/admin/roles`)
  - **Resume Note:** Six-role capability-driven matrix now shows the unique Super Admin governance set and the separate Administrator control plane. `operations.test.tsx` checks all six role navigation inventories and the Super Admin denied payment/finance capabilities. Formal acceptance remains open.
- [ ] A39 — **Audit Log** (`/admin/audit-log`)
  - **Resume Note:** Administrator receives security events; Super Admin receives security events plus read-only finance/change audit; Auditor receives read-only finance/change audit; Accounting has no separate audit workspace. API, route-capability, and role navigation checks cover the split. Browser, actor-retention, screen-reader, contrast, and all-role evidence remain open.
- [ ] A40 — **Backup & Recovery** (`/admin/backup`)
  - **Resume Note:** Production unavailable under U07; no backup/history API or approved deployment/recovery plan.

---

# 4. Project-Wide Completion Gate

The frontend loop-engineering pass is complete only when:

- every Build checkbox is checked with a truthful Resume Note;
- every Cross-Check & Audit checkbox is checked with a truthful Resume Note and explicit PASS;
- all applicable F1–F8 flows have been simulated end to end;
- failed screens were fixed and re-run before being marked audited;
- required build/test/E2E commands that exist in the repository have actually passed;
- applicable print views have been checked in browser print preview;
- documentation/decision/backend-handoff artifacts required by the current specification have been updated;
- work logs contain real, freshly obtained timestamps;
- unresolved requirements remain explicitly unresolved rather than silently invented.

## Context-Limit / Agent-Handoff Procedure

If an agent cannot finish before its context limit:

1. Stop before starting a new ambiguous unit of work.
2. Make the Build and Audit checkboxes reflect the exact real state.
3. Fill every newly completed item's Resume Note with enough implementation detail for a fresh agent to continue.
4. Do not mark partial work complete.
5. Read the system clock and write the required real-timestamp work-log entry.
6. State explicitly:
   - the last fully completed checklist item;
   - any item currently partial;
   - the exact next checklist item/action;
   - known blockers or unresolved questions;
   - validation already run and its real result.
7. The next agent must re-read the governing sources and this manual before continuing; it must not rely only on the previous agent's summary.

## Scope Guard

This manual controls the frontend execution loop only. It must not be used as authorization to add undocumented screens, backend implementation, integrations, product features, roles, business rules, or policy. When the documentation does not support a requirement, ask rather than guess.

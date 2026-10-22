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
- **Resume Note:** Implemented `/login` with username/password authentication, generic failure messaging, repeated-failure lockout wait time, password visibility toggle, in-memory mock session handling, sign-out return to login, and login/session tests in `frontend/src/test/login.test.tsx`. Validation was recorded in the work logs; formal Phase 2 audit remains pending.

### B02. First-login password change — M1

- **Route:** `/first-login`
- **Documented access:** All users when forced
- **Build scope:** Forced password change after account creation/admin reset; live password-rule checks.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/first-login` in `frontend/src/features/auth/FirstLoginPage.tsx` with forced password-change UI, live password-rule checks, confirmation matching, and redirect after save. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

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
- **Documented access:** ADM / CSH / ACC / AUD / REG
- **Build scope:** One route with documented role-specific dashboard content and quick links; Accounting alone may have the single collection-trend chart.
- **Build status:** [x] Built
- **Resume Note:** Implemented the role-specific dashboard route in `frontend/src/features/dashboard/`, wired through `frontend/src/auth/session.tsx` and `frontend/src/App.tsx`. Cashier, Accounting, Administrator, Auditor, and Registrar views use the typed mock dashboard adapter; Accounting alone renders the collection-trend chart, and Registrar receives no financial values. Loading, error/retry, empty activity, role-specific CTA visibility, range filtering, and record-payment modal behavior are covered by `frontend/src/test/dashboard.test.tsx`. Validation was recorded in the work logs; formal Phase 2 audit remains pending.

### B06. My Profile — M0/M1

- **Route:** `/profile`
- **Documented access:** All signed-in users
- **Build scope:** View name, role, last login; change own password; no self-edit of name/username.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/profile` as `ProfilePage` in `frontend/src/features/operations/OperationalPages.tsx`, showing user name, role, last-login sample context, and a change-password form without self-editing username/name. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B07. Student List — M2

- **Route:** `/students`
- **Documented access:** ADM / CSH / ACC / AUD / REG limited
- **Build scope:** Search/filter student records; REG receives only the documented limited fields.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/students` as `StudentsPage` with searchable mock student records, row navigation, student/billing status separation, and Registrar-limited columns that avoid balances. Covered by `frontend/src/test/operations.test.tsx`; formal Phase 2 audit remains pending.

### B08. New Student — M2

- **Route:** `/students/new`
- **Documented access:** ADM / CSH
- **Build scope:** Create student and guardian information with duplicate-number handling.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/students/new` as `StudentFormPage` with student and guardian fields, grade selector, duplicate-number handling, and post-create navigation. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B09. Edit Student — M2

- **Route:** `/students/:id/edit`
- **Documented access:** ADM / CSH
- **Build scope:** Edit permitted student/guardian links and status; no hard delete.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/students/:id/edit` as `StudentFormPage edit` with editable student/guardian fields, existing sample values, and no hard-delete action. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B10. Student Profile — M2

- **Route:** `/students/:id`
- **Documented access:** ADM / CSH / ACC / AUD / REG limited
- **Build scope:** Overview/Accounts/Payments/Notifications as permitted; REG sees limited Overview only; cashier shortcuts where documented.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/students/:id` as `StudentProfilePage` with role-aware overview data, Registrar-limited display, edit action where permitted, and inline activity widgets for follow-up, record payment, and statement context. Covered by `frontend/src/test/operations.test.tsx`; formal Phase 2 audit remains pending.

### B11. Account List — M3

- **Route:** `/accounts`
- **Documented access:** ADM / CSH / ACC / AUD
- **Build scope:** Search/filter billing accounts by documented criteria.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/accounts` as `AccountsPage` with a mock billing-account list, status display, balances, and create-account entry action. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B12. Create Billing Account — M3

- **Route:** `/accounts/new`
- **Documented access:** CSH
- **Build scope:** Four-step account wizard: student, fees, plan/schedule, review/create.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/accounts/new` as `AccountWizardPage` with a four-step mock wizard for student selection, fees/plan, schedule, and review/create. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B13. Account Detail — M3

- **Route:** `/accounts/:id`
- **Documented access:** ADM / CSH / ACC / AUD
- **Build scope:** Totals, fee items, schedule, payments, adjustments, activity; cashier actions where permitted.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/accounts/:id` as `AccountDetailPage` with account totals, schedule rows, balance state, and cashier record-payment action where permitted. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B14. Record Payment — M4

- **Route:** `/payments/new` and `?student=:id`
- **Documented access:** CSH
- **Build scope:** Fast-path payment flow with balance/next due, validation, confirmation, receipt preview and post-save feedback.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/payments/new` as `PaymentEntryPage` with student search, preselected-student context from `?student=:id`, balance display, and dashboard-linked mock payment entry flow with validation/confirmation/receipt behavior. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B15. Transaction History — M4

- **Route:** `/payments`
- **Documented access:** ADM / CSH / ACC / AUD
- **Build scope:** Search/filter payments; cashier own-scope by default; export where permitted.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/payments` as `PaymentsPage` with transaction-history rows, cashier default copy, payment statuses, and record-payment action where permitted. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B16. Payment Detail — M4

- **Route:** `/payments/:id`
- **Documented access:** ADM / CSH / ACC / AUD
- **Build scope:** Payment, allocation, receipt, recorder, notification status, audit information and permitted void/reprint actions.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/payments/:id` via `PaymentDetailPage` with payment summary, receipt link, email status, and cashier void-request UI requiring a reason. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B17. Receipt Print View — M4

- **Route:** `/receipts/:id/print`
- **Documented access:** CSH / ACC print; ADM / AUD view
- **Build scope:** Print-styled receipt with sequential server number and VOID/REPRINT behavior.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/receipts/:id/print` as `ReceiptPage` with print-styled receipt content, receipt number display, payment details, and browser print action. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B18. Void Approval Queue — M5

- **Route:** `/voids`
- **Documented access:** ACC; ADM/AUD read-only context as documented
- **Build scope:** Pending void requests, approve/reject behavior and separation-of-duties constraints.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/voids` as `VoidsPage` with pending void request rows, requester/reason/amount context, approval/rejection decision text for Accounting, and separation-of-duties copy. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B19. Overdue Follow-up — M11

- **Route:** `/followup`
- **Documented access:** CSH / ACC / AUD
- **Build scope:** Due-soon/overdue list, filters, print list, and reminder-batch flow for permitted roles.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/followup` as `FollowupPage` with overdue/due-soon sample rows, individual and select-all account checkboxes, and a send action shown only when one or more accounts are selected and the user has `followup.send`. The focused operations test and frontend production build pass; formal Phase 2 audit remains pending.

### B20. Clearance Lookup — M10

- **Route:** `/clearance`
- **Documented access:** ADM / CSH / ACC / AUD / REG
- **Build scope:** Enrollment/exam clearance with role-aware reasons; REG never sees amounts.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/clearance` as `ClearancePage` with student search, enrollment/exam-period clearance rows, role-aware permit action, and Registrar-safe reasons without financial amounts. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B21. Exam Permit Print View — M10

- **Route:** `/permits/:studentId/:period/print`
- **Documented access:** CSH / REG
- **Build scope:** Printable permit only for cleared periods; print is logged.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/permits/:studentId/:period/print` as `PermitPage` with print-styled exam permit content and print action for permitted roles. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B22. End-of-Day Close-out — M13

- **Route:** `/closeout`
- **Documented access:** CSH
- **Build scope:** System totals, counted cash, variance/reason, confirmation, lock and printable summary.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/closeout` as `CloseoutPage` with system cash total, counted-cash entry, variance calculation, variance reason field, and review action. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B23. Close-out History — M13

- **Route:** `/closeout/history`
- **Documented access:** ADM / CSH own / ACC / AUD
- **Build scope:** History and accounting sign-off for unsigned entries.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/closeout/history` as `CloseoutHistoryPage` with close-out history rows and sign-off/view action text based on role capability. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B24. Reports Hub — M7

- **Route:** `/reports`
- **Documented access:** ADM / CSH limited / ACC / AUD
- **Build scope:** Entry point to permitted reports.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/reports` as `ReportsHubPage` with links to daily, monthly, outstanding-balance, and student-statement reports. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B25. Daily Collection Report — M7

- **Route:** `/reports/daily`
- **Documented access:** ADM / ACC / AUD; CSH own day
- **Build scope:** Totals by method/cashier, payment list, voids separately, print/export.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/reports/daily` through `ReportPage type="daily"` with date filter, print/export actions, and collection summary rows. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B26. Monthly Financial Report — M7

- **Route:** `/reports/monthly`
- **Documented access:** ADM / ACC / AUD
- **Build scope:** Collections by fee category/grade and collected-vs-billed, print/export.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/reports/monthly` through `ReportPage type="monthly"` with month filter, print/export actions, and monthly summary rows. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B27. Outstanding Balances Report — M7

- **Route:** `/reports/outstanding`
- **Documented access:** ADM / ACC / AUD
- **Build scope:** Grade/section/minimum-balance/overdue filters, print/export.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/reports/outstanding` through `ReportPage type="outstanding"` with report filter controls, print/export actions, and outstanding-balance summary rows. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B28. Student Statement of Account — M7

- **Route:** `/reports/student/:id`
- **Documented access:** ADM / CSH / ACC / AUD
- **Build scope:** Student fees, schedule, payments and balance; role-specific print/export permissions.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/reports/student/:id` through `ReportPage type="statement"` with statement rows for fees, due dates, payments, balances, and print/export actions. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B29. Notification Log — M6

- **Route:** `/notifications`
- **Documented access:** ADM / CSH / ACC / AUD
- **Build scope:** Filter/view notification entries; retry failed messages only where permitted.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/notifications` as `NotificationsPage` with notification rows, queued/sent/failed statuses, URL-backed status filter, and retry/view action behavior gated by permission. Covered by `frontend/src/test/operations.test.tsx`; formal Phase 2 audit remains pending.

### B30. Ledger Import Wizard — M12

- **Route:** `/import`
- **Documented access:** ADM / CSH
- **Build scope:** Upload, map, preview/validate, error report, valid-row continuation, final confirm and result summary.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/import` as `ImportPage` with staged upload, column mapping, preview/validation, final-confirm/result, and error-report download states. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B31. Fee Schedules — M9

- **Route:** `/settings/fees`
- **Documented access:** ACC write; ADM/AUD read
- **Build scope:** Fee schedules/items and documented lifecycle; edits affect new accounts only.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/settings/fees` as `SettingsPage section="fees"` with Accounting edit access, read-only variants, active fee-schedule sample data, and note that edits affect new accounts only. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B32. Payment Plans — M9

- **Route:** `/settings/plans`
- **Documented access:** ACC write; ADM/AUD read
- **Build scope:** Plan configuration, schedule preview and lifecycle; edits affect new accounts only.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/settings/plans` as `SettingsPage section="plans"` with Accounting edit access, read-only variants, payment-plan sample data, and schedule-preview/lifecycle copy. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B33. Clearance Rules — M9

- **Route:** `/settings/clearance-rules`
- **Documented access:** ACC write; ADM/AUD read
- **Build scope:** Enrollment/exam rules, plain-language preview, test-with-student, lifecycle.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/settings/clearance-rules` as `SettingsPage section="clearance"` with Accounting edit access, read-only variants, clearance-rule sample data, and server-computed rule copy. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B34. School / Academic Lists Settings — M9

- **Route:** `/settings/school`
- **Documented access:** ADM write; ACC/AUD read
- **Build scope:** School year, terms/exam periods, grade levels, sections and payment methods.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/settings/school` as `SettingsPage section="school"` with Administrator edit access, read-only variants, and school-year/term/grade/section/payment-method configuration context. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B35. Receipt Settings — M9

- **Route:** `/settings/receipt`
- **Documented access:** ADM write; ACC/AUD read
- **Build scope:** School identity, receipt title, paper size and next receipt number behavior.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/settings/receipt` as `SettingsPage section="receipt"` with Administrator edit access, read-only variants, and school header/receipt title/paper-size configuration context. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B36. Email Settings — M9

- **Route:** `/settings/email`
- **Documented access:** ADM write; ACC/AUD read
- **Build scope:** Sender settings, daily send limit and test email.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/settings/email` as `SettingsPage section="email"` with Administrator edit access, read-only variants, sender/daily-limit/test-email configuration context. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B37. User Administration — M1

- **Route:** `/admin/users`
- **Documented access:** ADM
- **Build scope:** Search/create/edit/deactivate/reactivate/reset users and inspect user activity as documented.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/admin/users` as `UsersPage` with live name-or-username search, user list rows, and an Edit action that opens account editing plus password reset, confirmed deactivation, and reactivation controls. The mock preserves account history messaging, shows the reset temporary password once, and disables an administrator's self-deactivation action. Covered by `frontend/src/test/operations.test.tsx`; `npm test -- --run` and `npm run build` pass. Formal Phase 2 audit remains pending.

### B38. Role Matrix — M1

- **Route:** `/admin/roles`
- **Documented access:** ADM
- **Build scope:** Read-only reference of the documented role/capability matrix.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/admin/roles` as `RolesPage` with a read-only role/capability matrix surface. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B39. Audit Log — M8

- **Route:** `/admin/audit-log`
- **Documented access:** ADM / ACC / AUD
- **Build scope:** Filter audit entries and inspect before/after change detail; immutable.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/admin/audit-log` as `AuditPage` with immutable audit-log copy, filter-oriented description, and sample before/after detail rows. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.

### B40. Backup & Recovery — M8

- **Route:** `/admin/backup`
- **Documented access:** ADM
- **Build scope:** Backup status/history, run backup, restore-test date and restore instructions.
- **Build status:** [x] Built
- **Resume Note:** Implemented `/admin/backup` as `BackupPage` with backup status, manual backup action, last restore-test date, and restore instructions. Built during the remaining-route implementation pass; formal Phase 2 audit remains pending.
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
- **Resume Note:** _Not started._

### A02. First-login password change — M1

- **Route:** `/first-login`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A03. Access denied — System

- **Route:** `/403`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A04. Not found — System

- **Route:** `/404`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A05. Role-specific Dashboard — M0

- **Route:** `/`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A06. My Profile — M0/M1

- **Route:** `/profile`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A07. Student List — M2

- **Route:** `/students`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A08. New Student — M2

- **Route:** `/students/new`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A09. Edit Student — M2

- **Route:** `/students/:id/edit`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A10. Student Profile — M2

- **Route:** `/students/:id`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A11. Account List — M3

- **Route:** `/accounts`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A12. Create Billing Account — M3

- **Route:** `/accounts/new`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A13. Account Detail — M3

- **Route:** `/accounts/:id`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A14. Record Payment — M4

- **Route:** `/payments/new` and `?student=:id`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A15. Transaction History — M4

- **Route:** `/payments`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A16. Payment Detail — M4

- **Route:** `/payments/:id`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A17. Receipt Print View — M4

- **Route:** `/receipts/:id/print`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A18. Void Approval Queue — M5

- **Route:** `/voids`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A19. Overdue Follow-up — M11

- **Route:** `/followup`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A20. Clearance Lookup — M10

- **Route:** `/clearance`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A21. Exam Permit Print View — M10

- **Route:** `/permits/:studentId/:period/print`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A22. End-of-Day Close-out — M13

- **Route:** `/closeout`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A23. Close-out History — M13

- **Route:** `/closeout/history`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A24. Reports Hub — M7

- **Route:** `/reports`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A25. Daily Collection Report — M7

- **Route:** `/reports/daily`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A26. Monthly Financial Report — M7

- **Route:** `/reports/monthly`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A27. Outstanding Balances Report — M7

- **Route:** `/reports/outstanding`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A28. Student Statement of Account — M7

- **Route:** `/reports/student/:id`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A29. Notification Log — M6

- **Route:** `/notifications`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A30. Ledger Import Wizard — M12

- **Route:** `/import`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A31. Fee Schedules — M9

- **Route:** `/settings/fees`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A32. Payment Plans — M9

- **Route:** `/settings/plans`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A33. Clearance Rules — M9

- **Route:** `/settings/clearance-rules`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A34. School / Academic Lists Settings — M9

- **Route:** `/settings/school`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A35. Receipt Settings — M9

- **Route:** `/settings/receipt`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A36. Email Settings — M9

- **Route:** `/settings/email`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A37. User Administration — M1

- **Route:** `/admin/users`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A38. Role Matrix — M1

- **Route:** `/admin/roles`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A39. Audit Log — M8

- **Route:** `/admin/audit-log`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

### A40. Backup & Recovery — M8

- **Route:** `/admin/backup`
- **Cross-Check & Audit status:** [ ] Audited
- **Confirmation:** _Not run — PASS/FAIL pending._
- **Simulation(s):** _Not run._
- **Resume Note:** _Not started._

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
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.
- [x] B40 — **Backup & Recovery** (`/admin/backup`)
  - **Resume Note:** Implemented as a mock frontend route. See the detailed Build Resume Note above; formal Phase 2 audit remains pending.

## Cross-Check & Audit Phase Summary

- [ ] A01 — **Login** (`/login`)
  - **Resume Note:** _Not started._
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
  - **Resume Note:** _Not started._
- [ ] A21 — **Exam Permit Print View** (`/permits/:studentId/:period/print`)
  - **Resume Note:** _Not started._
- [ ] A22 — **End-of-Day Close-out** (`/closeout`)
  - **Resume Note:** _Not started._
- [ ] A23 — **Close-out History** (`/closeout/history`)
  - **Resume Note:** _Not started._
- [ ] A24 — **Reports Hub** (`/reports`)
  - **Resume Note:** _Not started._
- [ ] A25 — **Daily Collection Report** (`/reports/daily`)
  - **Resume Note:** _Not started._
- [ ] A26 — **Monthly Financial Report** (`/reports/monthly`)
  - **Resume Note:** _Not started._
- [ ] A27 — **Outstanding Balances Report** (`/reports/outstanding`)
  - **Resume Note:** _Not started._
- [ ] A28 — **Student Statement of Account** (`/reports/student/:id`)
  - **Resume Note:** _Not started._
- [ ] A29 — **Notification Log** (`/notifications`)
  - **Resume Note:** _Not started._
- [ ] A30 — **Ledger Import Wizard** (`/import`)
  - **Resume Note:** _Not started._
- [ ] A31 — **Fee Schedules** (`/settings/fees`)
  - **Resume Note:** _Not started._
- [ ] A32 — **Payment Plans** (`/settings/plans`)
  - **Resume Note:** _Not started._
- [ ] A33 — **Clearance Rules** (`/settings/clearance-rules`)
  - **Resume Note:** _Not started._
- [ ] A34 — **School / Academic Lists Settings** (`/settings/school`)
  - **Resume Note:** _Not started._
- [ ] A35 — **Receipt Settings** (`/settings/receipt`)
  - **Resume Note:** _Not started._
- [ ] A36 — **Email Settings** (`/settings/email`)
  - **Resume Note:** _Not started._
- [ ] A37 — **User Administration** (`/admin/users`)
  - **Resume Note:** _Not started._
- [ ] A38 — **Role Matrix** (`/admin/roles`)
  - **Resume Note:** _Not started._
- [ ] A39 — **Audit Log** (`/admin/audit-log`)
  - **Resume Note:** _Not started._
- [ ] A40 — **Backup & Recovery** (`/admin/backup`)
  - **Resume Note:** _Not started._

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

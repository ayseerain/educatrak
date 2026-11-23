# Scope and Access Control

> **SRS v3.0 policy reconciliation — November 22, 2026.** The dated project-owner confirmation in `06-Decisions/2026-11-22-srs-v3-policy-confirmations.md` supersedes conflicting active access text below for guardian management (Registrar only), ledger preparation/review (Cashier/Accounting), direct Cashier adjustments, Super Admin-only Accounting Officer assignment, Administrator manual backup, and the receipt title (`Acknowledgment Receipt`). Its November 23 owner answers add: Super Admin may view backup status but not run backups; the ledger-batch preparer may not confirm it; only the Registrar edits shared guardian contacts, after confirmation.

> **MockDB profile update — November 7, 2026.** In the frontend MockDB workflow, Registrar's `/students/:id` profile shows academic, personal, and guardian information without billing content. Personal fields are Registrar-only. Cashier and Accounting retain their existing financial profile behavior. Live API behavior is outside this change.

> **Approved operational reassignment — November 5, 2026.** Older clearance, permit, and Cashier student-editing provisions are superseded. Registrar may view and manage the shared Students module's basic records, grade, section, and enrollment status without financial or guardian data. Cashier may view the shared module and perform approved billing actions, but cannot create or edit students. Accounting keeps its financial oversight permissions. Clearance and exam permits are not active features.

> **Registrar student-context update — November 5, 2026.** On the shared Students list and profile only, Registrar receives the same read-only current-balance and guardian-contact context as Cashier. Registrar retains its existing student-management buttons; this narrowly scoped visibility does not grant billing-account, payment, report, or other finance-workspace access.

> **Student identifier reconciliation — November 13, 2026.** Every active operational reference to “student number” means the approved twelve-digit text LRN, represented as `lrn`. This terminology reconciliation does not represent a schema migration, installed-record conversion, or change to numerical student IDs and their relationships. Dated decision records retain their original wording as historical context.

> Source-derived view extracted from the canonical Project Specification. Do not edit independently of the master specification.

## 2. Scope

### 2.1 In scope
Everything described in Sections 8–22 (Modules M0–M14), built against the roles, routes, data model, and business rules in this document.

### 2.2 Explicitly out of scope (do not build)
- Parent or student login/portal, or any public-facing page.
- Online payment gateway, card, bank, or check payment recording. Transactions are recorded as cash only.
- Mobile app or mobile-first layouts.
- SMS, push notifications, or Messenger integration.
- LMS (Quipper) integration, grading, class scheduling, attendance, the enrollment workflow itself (only billing and clearance), payroll, or a general ledger/full accounting system.
- Self-registration and email-based "forgot password" — password resets are performed by an admin only.
- QR codes, barcodes, biometrics, chatbots, AI features, gamification.
- Multi-school or multi-campus support; multiple languages or a language switcher.
- Dark mode or theme customization.
- BIR-registered official-receipt tax compliance features — the receipt title is a setting; do not add tax fields.
- Editing or deleting payments, receipts, or audit entries, ever.
- Decorative dashboards or charts beyond the one Accounting collection-trend chart.
- Real backend code, database code, or deployment scripts (frontend only).

Where this specification is silent, do the simplest thing that fits the rules in Sections 3–6, leave a `// TODO(spec): ...` comment in code, and add a line to `DECISIONS.md`. Do not invent new modules, roles, payment methods, business rules, screens, integrations, or automation beyond what is written here.

---
---

## 6. Roles and Access Control

### 6.1 Role reference

| Code | Role name | TS role key | Summary |
|---|---|---|---|
| `SAD` | Super Admin | `super_admin` | Governance, protected bootstrap account, user administration, security events, audit oversight. No payment or finance operations. |
| `ADM` | Administrator | `admin` | Users, system settings, backups. Does **not** record payments. |
| `CSH` | Cashier | `cashier` | Daily operations: accounts, payments, receipts, follow-up, close-out. |
| `ACC` | Accounting Officer | `accounting` | Finance settings, void approvals, sign-off, reports. |
| `AUD` | Auditor | `auditor` | Read-only Audit Review workspace and approved audit summary. |
| `REG` | Enrollment / Registrar | `registrar` | Clearance lookup and exam permit only. Sees no amounts. |

**Access-note vocabulary:** "own" = only records the user created; "own day" = only the current day's activity; "limited" = reduced fields (noted per module).

### 6.2 Global rules (apply to every module)

1. **No hard deletes of financial or audit records.** Payments, receipts, accounts, adjustments, audit entries, and notification logs can never be deleted or edited after saving. Mistakes are handled by **void** (with approval) or a **correcting adjustment**. Where an operation table says "Delete," the row states what happens instead.
2. **Everything that changes data writes an audit entry** (who, when, what, before/after values).
3. **Separation of duties:** the user who records a payment cannot approve its void.
4. **AUD has no create, edit, approve, send, or print-permit buttons anywhere.**
5. **REG never sees** amounts, payment history, guardian contact details, or account details.
6. **The frontend hides actions a role cannot perform, but the backend is the real enforcer.** Implement a `can(user, capability)` helper (`src/auth/permissions.ts`) and use it for both route guards and to hide/disable buttons — never rely on hiding alone for security, and never show an action a user cannot perform.

### 6.3 Module-level access summary

`F` = full access to the module's operations for that role, `R` = read-only, `L` = limited (see module notes), `-` = no access.

| # | Module | SAD | ADM | CSH | ACC | AUD | REG |
|---|---|---|---|---|---|---|
| M0 | Dashboard & Navigation | F (system governance) | F | F | F | R | L |
| M1 | User Management | F (privileged lifecycle) | F | L (own profile) | L (own profile) | L (own profile) | L (own profile) |
| M2 | Students & Guardians | - | - | F | R (workflow context) | - | - |
| M3 | Billing Accounts | - | - | F | R (workflow context) | - | - |
| M4 | Payments & Receipts | - | - | F | R (workflow context) | - | - |
| M5 | Void Control / Receipt Integrity | - | - | L (request/status) | F (queue/decision) | - | - |
| M6 | Notifications | - | - | L (combined follow-up workspace) | R (combined follow-up workspace) | - | - |
| M7 | Reports | - | - | - | F | - | - |
| M8 | Audit & Backup | F (audit/security and backup-status oversight) | F (security events/backup management) | - | - | R (Audit Review) | - |
| M9 | Settings | - | F (system) | - | F (finance) / R (required system settings) | - | - |
| M11 | Installments & Follow-up | - | - | F | F | - | - |
| M12 | Ledger Import | - | - | - | - | - | - |
| M13 | End-of-Day Close-out | - | - | F (submit/own history) | F (review/sign-off) | - | - |
| M14 | Shareable PDF Receipt | - | - | F | F | - | - |

> The settings access cells reflect the current role simplification: Administrator manages system settings; Accounting manages finance settings and reads required system configuration; Auditor has no settings workspace. This supersedes the earlier Reconciliation item 3 proposal.

### 6.4 Capability matrix

This is the implementation-level role list. `F` = full/write access, `R` = read-only, blank = no access. The requester authorized implementation of the proposed Super Admin as a separate governance role. Super Admin is limited to user lifecycle, security events, audit oversight, and backup status; it receives no student, billing, payment-recording, finance-setting, void-approval, or report-operation capabilities. Administrator retains day-to-day system configuration; Accounting retains finance operations; Auditor retains the independent Audit Review workspace; Registrar owns basic student records in the shared Students module. External client acceptance and unresolved bootstrap recovery/second-person policy remain tracked in Section 31.

| Capability | SAD | ADM | CSH | ACC | AUD | REG |
|---|---|---|---|---|---|
| `user.manage` (controlled lifecycle; bootstrap Super Admin excluded) | F | F | | | | |
| `settings.system` (school info, receipt, email, school year) | | F | | R | | |
| `settings.finance` (fees, plans) | | | | F | | |
| `student.view` | | | F | F | | F |
| `student.edit` (basic student info) | | | | | | F |
| `student.financial.view` (student list/profile balance only) | | | F | F | | F |
| `guardianContact.view` (student profile contact details) | | | F | F | | F |
| `account.view` | | | F | F | | |
| `account.create` | | | F | | | |
| `payment.record` | | | F | | | |
| `payment.view` | | | F (own by default) | F | | |
| `payment.void.request` | | | F | | | |
| `payment.void.view` | | | | F | | |
| `payment.void.approve` | | | | F | | |
| `receipt.reprint` (logged) | | | F | F | | |
| `statement.print` (student statement of account) `NEW` | | | | F | | |
| `followup.view` | | | F | F | | |
| `followup.send` (approve reminder batch) | | | F | F | | |
| `closeout.submit` | | | F | | | |
| `closeout.signoff` | | | | F | | |
| `closeout.view` | | | F (own) | F | | |
| `report.view` | | | | F | | |
| `notification.view` | | | F | F | | |
| `notification.retry` | | | F | | | |
| `import.run` | | | | | | |
| `security.events.view` (account and authentication events) | F | F | | | | |
| `audit.view` (financial/change audit) | F | | | | F | |
| `backup.manage` | | F | | | | |

\* **Registrar (`REG`)** sees only: student name, LRN, grade and section, and clearance status with a reason that **hides amounts**. No payment history, no guardian contact details, no account details — see Section 6.2, rule 5, and the reconciliation in Section 30, item 2.

**Auditor is strictly read-only:** no create/edit/approve buttons anywhere.
**Separation of duties:** the person who records a payment cannot approve its void. The UI shows the approve button only to `ACC`.

### 6.5 Per-role summary

**SAD — Super Admin**
**Can:** use the system-governance dashboard; provision the initial protected account only through the trusted server-console bootstrap command; create and manage non-Super-Admin staff accounts (including Administrators, but not Accounting Officers pending policy); review security events and the financial/change audit; view backup status; change their own password.
**Cannot:** record payments, create billing accounts, manage finance settings, request or approve voids, sign off close-outs, send notifications, run backups, access student or financial-operation workspaces, assign another Super Admin, or modify/reset/deactivate the protected bootstrap account. No second-person recovery or break-glass policy is implemented until MCA defines it.

**ADM — Administrator**
**Can:** manage user accounts (M1.3); manage system settings — school year, terms, grade levels, sections, payment methods, receipt, and email configuration (M9.4–M9.6); review authentication/account-administration security events; manage backups (M8.2); view the system dashboard (backup and active-user status) and change their own password.
**Cannot:** access student, guardian, billing-account, payment, receipt, void, notification, clearance, follow-up, close-out, or financial-report workspaces; view or manage finance settings; print exam permits; send reminders; retry notifications; run ledger imports; view the finance/change audit log; record payments or create accounts.

**CSH — Cashier**
**Can:** add/edit students and guardians (M2); create accounts and adjustments (M3); record payments (M4.1); view their own history and void-request status (M4.2); print and reprint receipts (M4.3); request voids (M5); review/retry notification attempts only within the combined follow-up workspace (M6.2); use the follow-up list and send reminder batches (M11); perform close-out and review their own close-out history (M13); change their own password. Clearance status may appear only as supporting context in an authorized student/payment workflow.
**Cannot:** approve voids, access standalone reports/student statements, manage fees/system settings or users, access standalone notification/clearance/permit/import workspaces, view the audit log or backups, see other cashiers' history by default, or sign off close-outs.

**ACC — Accounting Officer**
**Can:** edit fee schedules, plans, and clearance rules (M9.1–M9.3); approve or reject voids (M5); run and export all reports (M7); sign off close-outs (M13.4); reprint receipts and generate PDF receipts (M4.3, M14); view accounts, payments, and notifications (read-only); view follow-up and send reminder batches (M11); read system settings (M9.4–M9.6).
**Cannot:** record payments, create accounts, add adjustments (see Section 31, adjustment-threshold item), manage users, run backups, run ledger imports, manage school and receipt settings, or open the Auditor's Audit Review workspace. System settings are read-only only where required by the current proposal.

**AUD — Auditor**
**Can (read-only):** use one Audit Review workspace for finance/change audit evidence. The dashboard may show the approved read-only oversight summary.
**Cannot:** use separate student, billing, payment, void, notification, report, clearance, follow-up, close-out, or settings pages; create, edit, approve, send, print permits, retry notifications, run backups, or change anything.

**REG — Enrollment / Registrar**
**Can:** view and manage basic student records through the shared Students module; change their own password.
**Cannot:** view financial or guardian-contact details, reports, or other finance/operations workspaces.

---

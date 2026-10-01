# Scope and Access Control

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
| `ADM` | Administrator | `admin` | Users, system settings, backups. Does **not** record payments. |
| `CSH` | Cashier | `cashier` | Daily operations: accounts, payments, receipts, follow-up, close-out. |
| `ACC` | Accounting Officer | `accounting` | Finance settings, void approvals, sign-off, reports. |
| `AUD` | Auditor | `auditor` | **Strictly read-only** across finance data and logs. |
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

| # | Module | ADM | CSH | ACC | AUD | REG |
|---|---|---|---|---|---|---|
| M0 | Dashboard & Navigation | F | F | F | R | L |
| M1 | User Management | F | L (own profile) | L (own profile) | L (own profile) | L (own profile) |
| M2 | Students & Guardians | F | F | R | R | L |
| M3 | Billing Accounts | R | F | R | R | - |
| M4 | Payments & Receipts | R | F | R (+ reprint) | R | - |
| M5 | Void Control / Receipt Integrity | R | L (request) | F (approve) | R | - |
| M6 | Email Notifications | F | L | R | R | - |
| M7 | Reports | F | L (own day + student statement) | F | R | - |
| M8 | Audit & Backup | F | - | R (audit only) | R (audit only) | - |
| M9 | Settings | F (system) / R (finance) | - | F (finance) / R (system) | R | - |
| M10 | Clearance & Exam Permit | R | F | R | R | F (limited) |
| M11 | Installments & Follow-up | - | F | F | R | - |
| M12 | Ledger Import | F | F | - | - | - |
| M13 | End-of-Day Close-out | R | F | F (sign-off) | R | - |
| M14 | Shareable PDF Receipt | - | F | F | - | - |

> M9's cell is expanded from the original handoff — see Reconciliation item 3 in Section 30: ADM and AUD both get read access to finance settings, and ACC gets read access to system settings, in addition to their write scopes.

### 6.4 Capability matrix

This is the authoritative, implementation-level list for `src/auth/permissions.ts`. `F` = full/write access, `R` = read-only, blank = no access. Keep it in one config file so it stays easy to change; treat it as a proposal awaiting final client confirmation (see Section 31).

| Capability | ADM | CSH | ACC | AUD | REG |
|---|---|---|---|---|---|
| `user.manage` (create, deactivate, reset password) | F | | | | |
| `settings.system` (school info, receipt, email, school year) | F | | R | R | |
| `settings.finance` (fees, plans, clearance rules) | R | | F | R | |
| `student.view` | F | F | F | F | L* |
| `student.edit` (basic info, guardian) | F | F | | | |
| `account.view` | F | F | F | F | |
| `account.create` | | F | | | |
| `payment.record` | | F | | | |
| `payment.view` | F | F (own by default) | F | F | |
| `payment.void.request` | | F | | | |
| `payment.void.view` | F | | F | F | |
| `payment.void.approve` | | | F | | |
| `receipt.reprint` (logged) | R (view only) | F | F | R (view only) | |
| `statement.print` (student statement of account) `NEW` | | F | F | | |
| `followup.view` | | F | F | F | |
| `followup.send` (approve reminder batch) | | F | F | | |
| `clearance.view` | F | F | F | F | F* |
| `permit.print` | | F | | | F |
| `closeout.submit` | | F | | | |
| `closeout.signoff` | | | F | | |
| `closeout.view` | F | F (own) | F | F | |
| `report.view` | F | L (own day only) | F | F | |
| `notification.view` | F | F | F | F | |
| `notification.retry` | F | F | | | |
| `import.run` | F | F | | | |
| `audit.view` | F | | F | F | |
| `backup.manage` | F | | | | |

\* **Registrar (`REG`)** sees only: student name, student number, grade and section, and clearance status with a reason that **hides amounts**. No payment history, no guardian contact details, no account details — see Section 6.2, rule 5, and the reconciliation in Section 30, item 2.

**Auditor is strictly read-only:** no create/edit/approve buttons anywhere.
**Separation of duties:** the person who records a payment cannot approve its void. The UI shows the approve button only to `ACC`.

### 6.5 Per-role summary

**ADM — Administrator**
**Can:** manage users (M1.3); view all finance data read-only (M2–M5, M7, M10, M13); export reports (M7); manage system settings — school year, terms, grade levels, sections, payment methods, receipt, email (M9.4–M9.6); manage the reminder template and send test emails (M6.4); retry failed emails (M6.2); run ledger imports (M12); view the audit log (M8.1) and manage backups (M8.2); add and edit students and guardians (M2); read finance settings (M9.1–M9.3).
**Cannot:** record payments, create accounts, add adjustments, request or approve voids, edit fees/plans/clearance rules, print exam permits, submit or sign off close-outs, send reminder batches.

**CSH — Cashier**
**Can:** add/edit students and guardians (M2); create accounts and adjustments (M3); record payments (M4.1); view their own history (M4.2); print and reprint receipts (M4.3); request voids (M5); view and retry notifications (M6.2); run the daily report for their own day and print student statements (M7.1, M7.4); look up clearance and print exam permits (M10); use the follow-up list and send reminder batches (M11); run ledger imports (M12); perform close-out (M13); generate PDF receipts (M14); change their own password.
**Cannot:** approve voids, edit settings, manage users, view the audit log or backups, view monthly or outstanding-balance reports, see other cashiers' history by default, sign off close-outs.

**ACC — Accounting Officer**
**Can:** edit fee schedules, plans, and clearance rules (M9.1–M9.3); approve or reject voids (M5); run and export all reports (M7); sign off close-outs (M13.4); reprint receipts and generate PDF receipts (M4.3, M14); view accounts, payments, and notifications (read-only); view follow-up and send reminder batches (M11); view the audit log (M8.1); read system settings (M9.4–M9.6).
**Cannot:** record payments, create accounts, add adjustments (see Section 31, adjustment-threshold item), manage users, run backups, run ledger imports, edit school or receipt settings.

**AUD — Auditor**
**Can (all read-only):** students, accounts, payments, receipts, void history, notifications, all reports (with export), the audit log, clearance lookup, the follow-up list, close-out history, and all settings screens.
**Cannot:** create, edit, approve, send, print permits, retry emails, run backups, or change anything at all.

**REG — Enrollment / Registrar**
**Can:** search students (name, student number, grade and section only); view enrollment and exam-clearance status with a reason that hides amounts (M10.1); print exam permits for cleared periods (M10.2); change their own password.
**Cannot:** see amounts, payments, accounts, guardian contact details, reports, settings, or anything else.

---

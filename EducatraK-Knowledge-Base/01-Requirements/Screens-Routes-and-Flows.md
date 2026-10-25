# Screens, Routes, and User Flows

> Source-derived screen, route, and flow inventory extracted from the canonical Project Specification.

## 23. Screens, Routes, and Key Flows

Route guard = the capability required (Section 6.4). "Shell" = sidebar + header layout; the sidebar shows only the items a role can use.

### 23.1 Public and system routes

| Route | Screen | Notes |
|---|---|---|
| `/login` | Login | Username + password. Generic error on failure. Shows lockout wait time (M1.1). |
| `/first-login` | Set new password | Forced after admin reset or first login; password rules shown live. |
| `/403`, `/404` | Error pages | Plain message and a "Go to dashboard" button. |
| (modal) | Session timeout warning | See Section 4. |

### 23.2 Full route table

| Route | Module | Guard |
|---|---|---|
| `/` | M0 Dashboard | all (content differs by role) |
| `/profile` | M0/M1 My profile | all |
| `/students` | M2 Student list | `student.view` |
| `/students/new`, `/students/:id/edit` | M2 Student form | `student.edit` |
| `/students/:id` | M2 Student profile | `student.view` |
| `/accounts` | M3 Account list | `account.view` |
| `/accounts/new` | M3 Create account wizard | `account.create` |
| `/accounts/:id` | M3 Account detail | `account.view` |
| `/payments/new` (+ `?student=:id`) | M4 Record payment | `payment.record` |
| `/payments` | M4 Transaction history | `payment.view` |
| `/payments/:id` | M4 Payment detail | `payment.view` |
| `/receipts/:id/print` | M4 Receipt print view | `payment.view` |
| `/voids` | M5 Void approval queue | `payment.void.view` |
| `/followup` | M11 Overdue follow-up | `followup.view` |
| `/clearance` | M10 Clearance lookup | `clearance.view` |
| `/permits/:studentId/:period/print` | M10 Exam permit print view | `permit.print` |
| `/closeout` | M13 End-of-day close-out | `closeout.submit` |
| `/closeout/history` | M13 Close-out history | `closeout.view` |
| `/reports` | M7 Report hub | `report.view` |
| `/reports/daily` | M7 Daily collection | `report.view` |
| `/reports/monthly` | M7 Monthly financial | `report.view` |
| `/reports/outstanding` | M7 Outstanding balances | `report.view` |
| `/reports/student/:id` | M7 Statement of account | `report.view` |
| `/notifications` | M6 Notification log | `notification.view` |
| `/import` | M12 Ledger import wizard | `import.run` |
| `/settings/fees` | M9 Fee schedules | `settings.finance` |
| `/settings/plans` | M9 Payment plans | `settings.finance` |
| `/settings/clearance-rules` | M9 Clearance rules | `settings.finance` |
| `/settings/school` | M9 School year and terms | `settings.system` |
| `/settings/receipt` | M9 Receipt settings | `settings.system` |
| `/settings/email` | M9 Email settings | `settings.system` |
| `/admin/users` | M1 Users | `user.manage` |
| `/admin/roles` | M1 Role matrix | `user.manage` |
| `/admin/audit-log` | M8 Audit log | `audit.view` |
| `/admin/backup` | M8 Backup and recovery | `backup.manage` |

### 23.3 Key user flows

Each flow must have a Playwright test against the mock adapter.

**F1. Record a payment** (the most-used flow; target under 2 minutes)
1. Cashier clicks **Record payment** (dashboard) or opens from a student profile.
2. Search field is focused; typing a name or student number shows results; Enter selects the first match.
3. The screen shows the student, current balance, and the next due installment with its amount.
4. Cashier enters an amount (a "Pay next installment" shortcut fills it), picks a method, enters a reference if not cash.
5. Live validation shows: overpayment block, duplicate warnings, missing reference.
6. Submit opens a confirm dialog: student, amount, method, new balance after payment.
7. On confirm: receipt preview appears with **Print** and **Done**; a toast says the email was queued (or that the guardian has no email).
8. Done returns to a fresh Record payment screen (cashiers process many in a row).

Errors to handle: network/API failure (keep the form, show retry), duplicate reference, overpayment, session expired.

**F2. Create a billing account at enrollment**
Student search (or create student inline) → fees load for the grade level → optional items and adjustments → choose plan → schedule preview → review → create → account detail with a **Record down payment** button.

**F3. Void a payment**
Cashier opens payment → Request void → reason (required, min 10 characters) → status "Void pending." Accounting sees it in `/voids` → approve or reject with note → payment shows VOID, balance updated, audit log entry. The cashier who requested it cannot approve it.

**F4. Check clearance and print an exam permit**
Registrar (or cashier) opens `/clearance` → searches student → sees Enrollment and each exam-period status with a reason **appropriate to the viewer's role** (an amount for CSH/ACC/AUD/ADM, no amount for REG) → for a cleared period, clicks **Print exam permit** → print view → browser print dialog. For a not-cleared period the button is disabled with the reason.

**F5. Overdue follow-up**
Cashier or accounting opens `/followup` → filters → selects rows → **Send reminder emails** → review dialog (recipients, missing emails flagged, message preview) → confirm → rows show "Reminder sent today."

**F6. End-of-day close-out**
Cashier opens `/closeout` → sees system totals by method → enters counted cash → variance appears → adds reason if needed → confirm → day locks and a printable summary opens. Accounting later signs off from history.

**F7. Import an existing ledger**
Upload `.xlsx` or `.csv` → map spreadsheet columns to fields (auto-suggest by header name; the user can correct) → preview table with row-level warnings and errors and a summary → fix the file and re-upload, or continue with valid rows only → final confirm → result screen (created, skipped, with a downloadable error report). Nothing is saved before the final confirm.

**F8. First login and password change**
Admin creates a user → shows a temporary password once → user logs in → forced to `/first-login` → sets a new password (rules shown live) → lands on the dashboard for their role.

---

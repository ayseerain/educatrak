# Modules and Features

> Source-derived module requirements extracted from the canonical Project Specification. No new requirements are introduced here.

## 7. Module Summary

**Must** (build first) / **Should** / **Could** — if time is short, drop **Could** items first without asking. Do not start a **Should** item until every **Must** item passes its Definition of Done (Section 29).

| # | Module | Features | Priority |
|---|---|---|---|
| M0 | Dashboard & Navigation | Role-specific dashboard widgets; role-based sidebar; session timeout warning; access-denied page | Must |
| M1 | User Management | Login, logout, first-login password change, lockout message, session timeout, profile/change password, admin user CRUD and password reset, role assignment | Must |
| M2 | Students & Guardians | Searchable student list, student profile, add/edit student and guardian (name, grade, section, guardian name/email, relationship), email-valid indicator | Must |
| M3 | Billing Accounts | Create account wizard (student, fee schedule, plan, review), account detail (fees, schedule, payments, balance), discount/scholarship adjustments | Must |
| M4 | Payment Recording & Receipts | Record payment (fast path), server-side validation results, receipt preview/print, transaction history, payment detail, reprint (marked REPRINT) | Must |
| M5 | Void Control / Receipt Integrity | No delete; void request with reason; approval queue; VOID marking; audit trail | Must |
| M6 | Email Notifications | Notification log (sent/queued/failed with reason), retry failed, per-guardian email status | Must |
| M7 | Reports | Daily collection, monthly financial, student statement of account, outstanding balances; print and export to Excel | Must |
| M8 | Audit & Backup | Audit log viewer with filters, backup status page, "Run backup now," last restore-test date | Must |
| M9 | Settings | Fees per grade level, payment plans, clearance rules, school year/terms, receipt settings, school info | Must |
| M10 | Clearance & Exam Permit (headline) | Clearance lookup, status per student (enrollment and each exam period), printable exam permit | Should |
| M11 | Installments & Follow-up | Schedule display, Current/Due soon/Overdue status, overdue follow-up list, cashier-approved reminder batches | Should |
| M12 | Ledger Import | Upload Excel, map columns, preview, validation report, confirm, result summary | Should |
| M13 | End-of-Day Close-out | Count cash, show variance, require reason, lock day, print report, accounting sign-off | Could |
| M14 | Shareable PDF Receipt | Download a receipt as PDF for guardians who prefer Messenger | Could |

---
---

## 8. M0 — Dashboard & Navigation (Must)

Each role gets a different dashboard; the sidebar shows only the items that role can use. Route: `/`.

### M0.1 Dashboard widgets

| Operation | What it does | Roles |
|---|---|---|
| View cashier dashboard | Big "Record payment" button; today's collected total and payment count; failed-email count; due-soon count; reminder to submit close-out | CSH |
| View accounting dashboard | Pending void approvals; overdue total; collection trend (one chart); unsigned close-outs | ACC |
| View admin dashboard | Last backup time and result; active user count; failed-email count | ADM |
| View auditor dashboard | Today's totals; links to reports and audit log (read-only) | AUD |
| View registrar dashboard | One large student search that opens clearance | REG |
| Quick links | Jump to the most common task for the role | all |

### M0.2 Navigation and session

| Operation | What it does | Roles |
|---|---|---|
| Role-based sidebar | Only shows allowed modules | all |
| Session timeout warning | Warns 1 minute before expiry; "Stay signed in" | all |
| Access denied page | Plain message and a button back to the dashboard | all |

**Route:** `/profile` (My profile — change own password, see own role, last login) is also available to everyone signed in.

---
---

## 9. M1 — User Management (Must)

### M1.1 Authentication

| Operation | What it does | Roles |
|---|---|---|
| Log in | Username and password; generic error on failure; shows "Account locked, try again in N minutes" on lockout | all |
| Log out | Ends the session | all |
| Lockout handling | After repeated failed logins the account is locked for a time; the screen shows the wait time | all (system) |
| Forced first-login password change | After account creation or admin reset, the user must set a new password with live rule checks | all |
| Session timeout | Ends the session after inactivity; redirects to login | all (system) |

Routes: `/login`, `/first-login`.

### M1.2 My profile

| Operation | What it does | Roles |
|---|---|---|
| View my profile | Name, role, last login | all |
| Change my password | Requires the current password; live rule checks | all |
| Edit my name/username | **Not allowed** (admin only) | - |

### M1.3 User administration

| Operation | What it does | Roles |
|---|---|---|
| List and search users | Search by name or username; filter by role and active state | ADM |
| Create user | Full name, username, role; system creates a temporary password shown **once** | ADM |
| Edit user | Change full name and role | ADM |
| Deactivate / reactivate user | Blocks or restores login; keeps all history | ADM |
| Reset password | Generates a new temporary password shown once; forces change at next login | ADM |
| Delete user | **Not allowed.** Use Deactivate so audit history stays linked to the user | - |
| View user login/activity history | Filtered view of the audit log for one user | ADM, ACC, AUD |
| View role matrix | Read-only reference of Section 6 | ADM |

**Rules:** an admin cannot deactivate themselves or the last active admin; a cashier account cannot be given approval rights by anyone other than by changing its role.

Routes: `/admin/users` (`user.manage`), `/admin/roles` (`user.manage`).

---
---

## 10. M2 — Students & Guardians (Must)

Registrar (`REG`) is **limited**: name, student number, grade and section, and clearance status only.

### M2.1 Student records

| Operation | What it does | Roles |
|---|---|---|
| List and search students | Search by name or student number; filter by grade, section, status, clearance | ADM, CSH, ACC, AUD; REG (limited) |
| View student profile | Tabs: Overview, Accounts, Payments, Notifications | ADM, CSH, ACC, AUD; REG (Overview only, limited) |
| Add student | Student number, name, grade, section, guardian(s); rejects duplicate student numbers | ADM, CSH |
| Edit student | Change name, grade, section, guardian links | ADM, CSH |
| Set inactive / reactivate | Marks a student as no longer enrolled; keeps all billing history | ADM, CSH |
| Delete student | **Not allowed.** Use Set inactive | - |
| Bulk add students | Through the Ledger Import wizard (M12) | ADM, CSH |
| Jump to Create account / Record payment | Shortcuts on the profile | CSH |

### M2.2 Guardians

| Operation | What it does | Roles |
|---|---|---|
| View guardian details | Name, relationship, email, mobile, email status | ADM, CSH, ACC, AUD |
| Add guardian to a student | Name, relationship, email (validated), mobile (optional) | ADM, CSH |
| Edit guardian | Fix email or contact details; resets email status to "unverified" | ADM, CSH |
| Unlink guardian from student | Removes the link only; the guardian record stays | ADM, CSH |
| Flag missing or bounced email | Automatic badge on the student and guardian | system |
| Delete guardian | **Not allowed** if they have notification history; unlink instead | - |

**Routes:** `/students` (`student.view`, columns: name, grade & section, balance, status badge; REG sees the limited columns only), `/students/new` and `/students/:id/edit` (`student.edit`), `/students/:id` (`student.view`; Overview/Accounts/Payments/Notifications tabs; REG sees Overview limited; buttons: Create account, Record payment).

---
---

## 11. M3 — Billing Accounts (Must)

An account = one student for one school year: fees, plan, installment schedule, adjustments, payments.

### M3.1 Account creation (wizard)

| Operation | What it does | Roles |
|---|---|---|
| Select student | Search and pick (or add a new student inline) | CSH |
| Load fee schedule | Fees for the student's grade level load automatically | CSH |
| Remove optional fee items | Only items marked optional can be unticked; required items are locked | CSH |
| Choose payment plan | Full, semestral, quarterly, monthly, etc. as configured | CSH |
| Preview installment schedule | Shows due dates and amounts before saving | CSH |
| Review and create | Confirm dialog; creates the account and schedule | CSH |
| Duplicate account guard | Blocks a second account for the same student and school year | CSH (system) |

### M3.2 Account viewing

| Operation | What it does | Roles |
|---|---|---|
| List and search accounts | Filter by school year, grade, status (Current, Due soon, Overdue, Paid) | ADM, CSH, ACC, AUD |
| View account detail | Total, paid, balance, status; fee items; schedule; payments; adjustments; activity | ADM, CSH, ACC, AUD |
| View installment schedule | Each row: due date, amount, paid, status | ADM, CSH, ACC, AUD |
| Edit account fees after creation | **Not allowed** except through adjustments | - |
| Delete account | **Not allowed** | - |

### M3.3 Adjustments (discounts, scholarships, corrections)

| Operation | What it does | Roles |
|---|---|---|
| Add adjustment | Type (discount, scholarship, correction), amount, required reason; recalculates balance and schedule | CSH |
| View adjustments | List with who added it and when | ADM, CSH, ACC, AUD |
| Reverse an adjustment | Adds an opposite **correction** entry with a reason | CSH |
| Edit / delete adjustment | **Not allowed** | - |

See Section 31 for the open question on whether large adjustments need Accounting Officer approval.

### M3.4 Status

| Operation | What it does | Roles |
|---|---|---|
| Auto-compute status | System sets Paid, Current, Due soon, or Overdue from the schedule | system |
| Show status badge | Icon plus text on lists and details | all with account access |

**Routes:** `/accounts` (`account.view`), `/accounts/new` (`account.create`, 4-step wizard matching M3.1), `/accounts/:id` (`account.view`; Actions: Record payment, Add adjustment (cashier)). See also Flow F2 in Section 23.

---
---

## 12. M4 — Payments & Receipts (Must)

### M4.1 Record payment

| Operation | What it does | Roles |
|---|---|---|
| Search student | Type name or number; Enter picks the first match | CSH |
| View balance and next due installment | Shown before entry | CSH |
| Enter amount | "Pay next installment" shortcut fills the amount | CSH |
| Choose method | From the configured list (default: Cash, Check, Bank deposit) | CSH |
| Enter reference number | Required for any method except Cash | CSH |
| Set payment date | Defaults to today; back-dating requires a reason; future dates blocked | CSH |
| Add note | Optional free text | CSH |
| Live validation | Blocks overpayment; hard-blocks duplicate reference; warns on same student and amount within 10 minutes (needs tick and reason) | CSH (system) |
| Confirm and save | Confirm dialog repeats student, amount, method, new balance; saves | CSH |
| Post-save actions | Receipt preview with Print and Done; toast about the email; returns to a fresh form | CSH |

### M4.2 Transaction history

| Operation | What it does | Roles |
|---|---|---|
| List and search payments | Filter by date range, cashier, method, status (valid, void pending, voided), student | ADM, ACC, AUD; CSH (own by default) |
| View payment detail | Amount, allocation across installments, receipt number, recorded by, email status, audit trail | ADM, CSH, ACC, AUD |
| Export to Excel | Exports the current filtered list | ADM, ACC, AUD; CSH (own) |
| Edit payment | **Not allowed** | - |
| Delete payment | **Not allowed.** Use Void (M5) | - |

### M4.3 Receipts

| Operation | What it does | Roles |
|---|---|---|
| Generate receipt | Server assigns a sequential number automatically on save | system |
| View / print receipt | Print-styled half-page block; title and school header from settings | CSH, ACC (print); ADM, AUD (view) |
| Reprint receipt | Logged, increments reprint count, prints with a "REPRINT" mark | CSH, ACC |
| Show VOID mark | Voided receipts print with "VOID" | system |
| Edit receipt number or content | **Not allowed** | - |

**Routes:** `/payments/new` (also `/payments/new?student=:id`, `payment.record` — see Flow F1, Section 23), `/payments` (`payment.view`), `/payments/:id` (`payment.view`; actions: Reprint, Request void, Approve/Reject void), `/receipts/:id/print` (`payment.view`).

---
---

## 13. M5 — Void Control / Receipt Integrity (Must)

| Operation | What it does | Roles |
|---|---|---|
| Request void | Reason required (minimum 10 characters); payment shows "Void pending" | CSH |
| View pending void queue | List of requests with reason, amount, requester | ACC (ADM, AUD read-only) |
| Approve void | Payment becomes VOID, balance restored, audit entry written | ACC |
| Reject void | Requires a note; payment returns to valid | ACC |
| View void history | All requests with decision, who decided, and when | ADM, ACC, AUD; CSH (own requests) |
| Withdraw own void request | **Not in scope.** The cashier asks accounting to reject it | - |

**Rule:** a user cannot approve a void of a payment they recorded (Section 6.2, rule 3).

**Route:** `/voids` (`payment.void.view`; approval actions require `payment.void.approve`). See also Flow F3, Section 23.

---
---

## 14. M6 — Email Notifications (Must)

### M6.1 Payment confirmation emails

| Operation | What it does | Roles |
|---|---|---|
| Queue confirmation email | Automatically after every confirmed payment: amount, balance, receipt number, date | system |
| Show email status on payment | Queued, Sent, Failed, or "No guardian email" | ADM, CSH, ACC, AUD |
| Keep payment if email fails | Payment is always saved; failure goes to the log | system |

### M6.2 Notification log

| Operation | What it does | Roles |
|---|---|---|
| List and filter | By status (Sent, Queued, Failed), date, student | ADM, CSH, ACC, AUD |
| View entry | Recipient, type, attempts, failure reason | ADM, CSH, ACC, AUD |
| Retry failed email | Re-queues one failed email | ADM, CSH |
| Delete log entry | **Not allowed** | - |

### M6.3 Guardian email health

| Operation | What it does | Roles |
|---|---|---|
| See students with missing or bounced email | Filter on the student list and follow-up list | ADM, CSH, ACC, AUD |
| Fix email address | Through Edit guardian (M2.2) | ADM, CSH |

### M6.4 Reminder template

| Operation | What it does | Roles |
|---|---|---|
| View template | Text with placeholders such as `{student}` and `{balance}` | ADM |
| Edit template | Save changes; live preview | ADM |
| Send test email | Sends to a chosen address to check the setup | ADM |

(Sending the reminders themselves is in M11.)

**Route:** `/notifications` (`notification.view`; failed rows show a Retry button, `notification.retry`).

---
---

## 15. M7 — Reports (Must)

Every report supports **print** and **export to Excel** unless stated otherwise.

### M7.1 Daily collection

| Operation | What it does | Roles |
|---|---|---|
| Pick date and view | Totals by method and by cashier; list of payments; voids shown separately | ADM, ACC, AUD; CSH (own day only) |
| Print / export | Print view and Excel file | same as above |

### M7.2 Monthly financial

| Operation | What it does | Roles |
|---|---|---|
| Pick month and view | Collections by fee category and grade level; total collected vs. billed | ADM, ACC, AUD |
| Print / export | Print view and Excel file | ADM, ACC, AUD |

### M7.3 Outstanding balances

| Operation | What it does | Roles |
|---|---|---|
| Filter and view | By grade, section, minimum balance, overdue only | ADM, ACC, AUD |
| Print / export | Print view and Excel file | ADM, ACC, AUD |

### M7.4 Student statement of account

| Operation | What it does | Roles |
|---|---|---|
| View statement | One student's fees, schedule, payments, balance | ADM, CSH, ACC, AUD |
| Print statement | Handed to a guardian who has no email | CSH, ACC |
| Export | Excel file | ADM, ACC, AUD |

**Routes:** `/reports` (report hub, `report.view`), `/reports/daily`, `/reports/monthly`, `/reports/outstanding`, `/reports/student/:id` (all `report.view`; cashiers see only their own day on `/reports/daily`, and can print the student statement per Section 30 item 1).

---
---

## 16. M8 — Audit & Backup (Must)

### M8.1 Audit log

| Operation | What it does | Roles |
|---|---|---|
| View and filter log | By user, action, date, entity | ADM, ACC, AUD |
| View change detail | Before and after values for an entry | ADM, ACC, AUD |
| Edit or delete entries | **Not allowed** | - |
| Write entries | Automatic on every data change and every login, void, reprint, permit print | system |

### M8.2 Backup and recovery

| Operation | What it does | Roles |
|---|---|---|
| View backup status | Last backup time and result; list of recent backups | ADM |
| Run backup now | Starts a manual backup | ADM |
| View last restore-test date | Reminder to test recovery | ADM |
| View restore instructions | Plain step-by-step text | ADM |
| Perform restore | Done outside the app by the admin using the instructions | - |
| Nightly automatic backup | Scheduled on the server | system |

**Routes:** `/admin/audit-log` (`audit.view`), `/admin/backup` (`backup.manage`).

---
---

## 17. M9 — Settings (Must)

Read access for settings screens: `ADM`, `ACC`, `AUD` (read-only for those without edit rights). `CSH` and `REG` have no settings access; they only see the results of settings (fees, plans) inside their normal screens. See Section 30, item 3 for how this read-access rule was reconciled with the original capability matrix.

### M9.1 Fee schedules (per school year and grade level)

| Operation | What it does | Roles |
|---|---|---|
| View fee schedules | List by school year and grade level | ACC; ADM, AUD (read-only) |
| Add fee item | Name, category (tuition, miscellaneous, other), amount, required or optional | ACC |
| Edit fee item | Changes apply to **new accounts only**; existing accounts keep their fees | ACC |
| Deactivate fee item | Hides it from new accounts; history kept | ACC |
| Delete fee item | **Not allowed** once used; deactivate instead | - |
| Copy schedule to next school year `NEW` (Could) | Duplicates a grade level's fees so they can be adjusted | ACC |

### M9.2 Payment plans

| Operation | What it does | Roles |
|---|---|---|
| View plans | Name, installments, down payment | ACC; ADM, AUD (read-only) |
| Add plan | Name, down payment (amount or percent), installment labels and due dates or offsets | ACC |
| Edit plan | Applies to **new accounts only** | ACC |
| Preview schedule | Shows the schedule for a sample total | ACC |
| Deactivate plan | Hides from new accounts | ACC |
| Delete plan | **Not allowed** once used | - |

Editing a fee item or plan applying to new accounts only requires a **versioning rule on the backend** so existing accounts keep the terms they were created under.

### M9.3 Clearance rules

| Operation | What it does | Roles |
|---|---|---|
| View rules | One enrollment rule and one rule per exam period | ACC; ADM, AUD (read-only) |
| Add / edit rule | E.g., minimum down payment for enrollment; installments paid through the exam start date | ACC |
| Plain-language preview | Shows the rule in a sentence | ACC |
| Test with a student | Shows what status that student would get | ACC |
| Deactivate rule | Stops applying it | ACC |

### M9.4 School year, terms, and lists

| Operation | What it does | Roles |
|---|---|---|
| Create school year | Label; set as current | ADM |
| Add / edit terms and exam periods | Names and start dates | ADM |
| Manage grade levels and sections | Add, rename, deactivate | ADM |
| Manage payment methods | Add, rename, deactivate | ADM |
| View lists | Read-only | ACC, AUD |

### M9.5 Receipt settings

| Operation | What it does | Roles |
|---|---|---|
| Edit school name and address | Shown on receipts and reports | ADM |
| Set receipt title | "Official Receipt" or "Acknowledgment Receipt" | ADM |
| Set paper size | Letter or A4 | ADM |
| View next receipt number | Read-only once the first receipt exists | ADM |

### M9.6 Email settings

| Operation | What it does | Roles |
|---|---|---|
| Edit sender name and address | Used for all outgoing email | ADM |
| Set daily send limit | Protects free email limits | ADM |
| Send test email | Checks the connection | ADM |

**Routes:** `/settings/fees`, `/settings/plans`, `/settings/clearance-rules` (`settings.finance`), `/settings/school`, `/settings/receipt`, `/settings/email` (`settings.system`) — all also readable by `ADM`/`AUD` (finance) and `ACC`/`AUD` (system) per the reconciled access rule above.

---
---

## 18. M10 — Clearance & Exam Permit (Should, headline feature)

Statuses are computed by the server from the rules in M9.3 and recomputed after every payment, void, or adjustment.

### M10.1 Clearance lookup

| Operation | What it does | Roles |
|---|---|---|
| Search student | Large search box | all (ADM, CSH, ACC, AUD, REG) |
| View enrollment clearance | Cleared or Not cleared with a plain reason | all |
| View exam period clearance | One row per exam period with status and reason | all |
| Reason detail | CSH, ACC, AUD, ADM see the amounts (e.g., balance due and date); **REG sees a reason without amounts** (e.g., "Installment overdue") | all (REG limited) |
| Filter students by clearance on the student list | Cleared / Not cleared | ADM, CSH, ACC, AUD |

### M10.2 Exam permit

| Operation | What it does | Roles |
|---|---|---|
| Print exam permit | Available only for a cleared period; opens a print-styled slip | CSH, REG |
| Explain why not | Button disabled with the reason if not cleared | CSH, REG |
| Log each print | Every print is written to the audit log | system |
| Edit permit content | **Not allowed** | - |

**Routes:** `/clearance` (`clearance.view` — the Registrar's only working screen; result card shows Enrollment and each exam-period status with a plain, **role-aware** reason — never an amount for REG, see Section 30 item 2), `/permits/:studentId/:examPeriodId/print` (`permit.print`). See also Flow F4, Section 23.

---
---

## 19. M11 — Installments & Follow-up (Should)

### M11.1 Schedule and status

| Operation | What it does | Roles |
|---|---|---|
| Show installment schedule | Inside account detail (M3.2) | ADM, CSH, ACC, AUD |
| Auto-apply payments to oldest installment | Spills into the next installment | system |
| Auto-mark Paid, Current, Due soon, Overdue | Due soon window default 7 days | system |

### M11.2 Overdue follow-up list

| Operation | What it does | Roles |
|---|---|---|
| View overdue and due-soon accounts | Student, guardian contact, amount overdue, days overdue, last reminder date | CSH, ACC, AUD |
| Filter and sort | By grade, section, days overdue, amount | CSH, ACC, AUD |
| Print list | One-page printable | CSH, ACC |

### M11.3 Reminder batches

| Operation | What it does | Roles |
|---|---|---|
| Select accounts | Checkbox selection | CSH, ACC |
| Review batch | Recipients, missing-email warnings, message preview, remaining daily send limit | CSH, ACC |
| Confirm and send | Queues the emails; rows show "Reminder sent today" | CSH, ACC |
| Automatic sending with no approval | **Not allowed** | - |

**Route:** `/followup` (`followup.view`, send via `followup.send`). See also Flow F5, Section 23.

---
---

## 20. M12 — Ledger Import (Should)

Nothing is saved until the final confirm.

| Operation | What it does | Roles |
|---|---|---|
| Upload file | `.xlsx` or `.csv` | ADM, CSH |
| Map columns | Auto-suggests by header name; user can correct | ADM, CSH |
| Preview and validate | Row-level warnings and errors; summary counts (duplicate student number is an error; missing guardian email is a warning) | ADM, CSH |
| Download error report | File listing problem rows | ADM, CSH |
| Continue with valid rows only | Skips rows with errors | ADM, CSH |
| Cancel import | Discards the upload; nothing saved | ADM, CSH |
| Commit import | Final confirm dialog; creates records | ADM, CSH |
| View result summary | Created, skipped, and a link to the error report | ADM, CSH |
| Undo a committed import | **Not in scope.** Corrections are made through normal edit and adjustment operations | - |

**Route:** `/import` (`import.run`). See also Flow F7, Section 23.

---
---

## 21. M13 — End-of-Day Close-out (Could)

| Operation | What it does | Roles |
|---|---|---|
| View system totals for today | By method, for the signed-in cashier | CSH |
| Enter counted cash | Amount counted in the drawer | CSH |
| See variance | Counted cash minus system cash total, live | CSH |
| Enter variance reason | Required when the variance is not zero | CSH |
| Submit close-out | Confirm dialog; locks the day for that cashier | CSH |
| Print summary | Print-styled close-out report | CSH, ACC |
| View history | List by date with variance and sign-off status | ADM, ACC, AUD; CSH (own) |
| Sign off | Accounting confirms the close-out | ACC |
| Reopen a locked day | **Not in scope** | - |

**Routes:** `/closeout` (`closeout.submit`), `/closeout/history` (`closeout.view`; ACC sees a "Sign off" button on each unsigned entry). See also Flow F6, Section 23.

---
---

## 22. M14 — Shareable PDF Receipt (Could)

| Operation | What it does | Roles |
|---|---|---|
| Download receipt as PDF | For guardians who prefer Messenger; carries the same number and VOID/REPRINT marks | CSH, ACC |
| Track downloads | Written to the audit log | system |

---

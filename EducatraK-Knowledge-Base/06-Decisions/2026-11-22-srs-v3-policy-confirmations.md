# 2026-11-22 SRS v3.0 policy confirmations

**Recorded:** Monday, November 23, 2026 — 20:42:32 +08:00  
**Authority:** Project-owner confirmation supplied in the revised SRS v3.0 reconciliation directive. These are engineering policy directions, not evidence of school institutional approval, deployment, legal compliance, backup recovery, or UAT sign-off.

## Confirmed policy baseline

| Key | Direction | Reconciliation status at this record |
| --- | --- | --- |
| SRS-01 | Registrar alone manages guardian creation, updates, links and unlinks. Cashier and Accounting retain only authorized contact context. | Implemented and feature-tested in the isolated SQLite suite. 2026-11-23: shared-contact edits require explicit confirmation listing affected students; primary unlink requires a same-request replacement; email status resets only when the email changes. |
| SRS-02 | Cashier prepares financial ledger batches; Accounting reviews and confirms; nothing posts before confirmation. | 2026-11-23: implemented as a one-time opening-balance conversion (CSV, Cashier prepare/submit, different Accounting user confirm/reject) creating `opening_balance_conversions` records only; feature-tested in SQLite. Cutover date value and whether confirmed balances feed billing accounts/reports remain open. |
| SRS-03 | Cashier directly finalizes reasoned/audited adjustments; no Accounting approval threshold. | 2026-11-23: proportional redistribution over unpaid remainders, rounding to the oldest unpaid installment, Correction installment on a fully paid account, installment amounts in audit; feature-tested in SQLite. |
| SRS-04 | Propose ten-year audit-log and five-year other-personal-information retention, subject to institutional approval. | Policy documented; enforcement deferred. No generalized purge or change to the separate 30-day archived-staff lifecycle is authorized. |
| SRS-05 | Only Super Admin assigns Accounting Officer accounts. | Implemented and feature-tested in the isolated SQLite suite. |
| SRS-06 | Daily automated local backup plus Administrator-authorized manual backup. | 2026-11-23: `mysqldump` service, daily 21:00 Manila schedule, Administrator manual endpoint, shared lock, checksum, attempt history implemented and tested with a faked process. Rotation implemented but disabled by default. Real MySQL dump, Task Scheduler setup and restore test not yet performed. |
| SRS-07 | Propose performance targets from local deployment measurements. | Proposed targets and method recorded below. No measurement has been run. |
| SRS-08 | The approved receipt title is exactly `Acknowledgment Receipt`. | API default and Administrator validation reconciled; existing persisted historical settings are not rewritten. Receipt IDs, sequences, and payment history are unchanged. |
| SRS-09 | UAT participants are school representatives and Project Supervisor Coleen Creus. | Participants and scenario checklist recorded (testing doc §29.5). Actual evaluator names, dates and signed acceptance remain pending. |

## Remaining policy decisions

1. Ledger import: approved source template and fields; whether it covers opening balances, accounts, historical payments, fee items, or another bounded set; historical receipts/dates/duplicates; posting/allocation/correction/notification treatment.
2. Guardians: shared identity/contact edit authority; how a primary guardian is chosen, replaced, or unlinked; whether a student may have no primary guardian.
3. Adjustments: how changed total due is redistributed over future installments without rewriting paid allocation history.
4. Retention: formal approval, per-record start events, holds/exceptions, disposal/anonymization, copied/exported data, backup rotation, enforcement authorization and audit evidence.
5. Backup: protected destination, daily time, rotation, native MySQL backup tool, scheduler host operation, available storage, restore owner and isolated recovery exercise.
6. Performance/UAT: deployment hardware and synthetic benchmark fixture; designated school representatives, dates, final acceptance instrument and signatures.

## Explicit safeguards preserved

- No financial or audit hard deletes, no changed receipt sequence/identifier, no new payment methods, no active clearance/permit workflow, no production secrets, data, backup artifacts, deployment, or destructive migration.
- “Verified” in this repository means a relevant test environment only. It does not mean a live MySQL deployment or institutional acceptance.

## Project-owner answers — November 23, 2026

**Recorded:** Monday, November 23, 2026 — 21:55:00 +08:00
**Authority:** Project-owner answers to the six remaining decisions above. They supersede the "Remaining policy decisions" list where they answer it. They are still not school institutional approval.

### 1. Financial ledger import = one-time opening-balance conversion

- Cashier uploads and prepares a CSV batch. Accounting reviews, rejects or confirms it. The preparer cannot confirm their own batch.
- The uploaded file is immutable after upload. Any change needs a new batch.
- Only rows with no validation errors may be confirmed. A rejected or cancelled batch creates no financial records.
- Imports never create students. Every row must match an existing student by 12-digit LRN.
- Imports never create historical payments, issue or reuse receipts, alter closed cashier days, or trigger notifications.
- Each approved row creates a dedicated, auditable opening-balance conversion record. It is not a Payment or an Adjustment.
- Required columns: `source_row_id, student_lrn, school_year, as_of_date, total_due_cents, total_paid_cents, balance_cents, source_reference, notes`.
- Validation: `total_due_cents - total_paid_cents = balance_cents`; non-negative amounts; valid LRN; one row per student and school year; `as_of_date` no later than the approved cutover date.
- Full historical-payment import is a separate future project.

### 2. Shared guardians and primary contacts

- A guardian is one shared identity. The relationship and the primary flag belong to each student–guardian link.
- Only the Registrar creates, edits, links, unlinks or sets primary guardians. Cashier and Accounting read contact context only where their student access allows it.
- A contact edit on a guardian linked to several students changes that one identity for all of them. The system shows the affected students and requires explicit confirmation first.
- Each student with guardians has exactly one primary guardian. Creating or linking a guardian requires choosing Primary or Secondary.
- Changing the primary guardian is one atomic action. A primary guardian can be unlinked only when a replacement linked guardian is chosen in the same request.
- Unlinking keeps the guardian record, the links to other students, and all financial and notification history.
- Changing an email address resets only that guardian's email status to unverified. Unrelated edits do not.

### 3. Adjustment installment redistribution

- Cashier finalizes valid discounts, scholarships and corrections directly, with a 10–1000-character reason and an audit trail. Accounting has read-only oversight and no approval queue.
- Paid amounts and prior payment allocations never change.
- The adjustment is spread proportionally over each unpaid installment's remaining amount. Rounding centavos go to the oldest unpaid installment first.
- Installment and account status are recalculated immediately.
- An adjustment that reduces total due below valid payments, or creates a negative balance, is rejected.
- A positive correction on a fully paid account creates a new "Correction" installment due on the current Manila business date and reopens the account.
- Each adjustment audit entry stores prior and resulting account totals plus affected installment amounts.

### 4. Backup operation

- Destination: a protected folder outside the application and web root, for example `D:\EducatraKBackups\database`.
- Schedule: daily at 9:00 PM Asia/Manila, configurable through protected server configuration.
- Tool: the `mysqldump` executable compatible with the installed MySQL version. No ad hoc SQL exports.
- Manual backup: Administrator only. Super Admin may view status but cannot run backups.
- Each attempt records trigger type, requester for manual runs, start and completion time, result, byte size, SHA-256 checksum, and a sanitized failure reason.
- One shared lock prevents overlapping manual and scheduled runs. Output goes to a temporary file, is checked for nonzero size, completeness and checksum, then is renamed into place.
- Recommended recovery-copy rotation: 30 daily and 12 monthly backups. This is disaster recovery, not the personal-data retention policy.
- Windows Task Scheduler runs Laravel's scheduler on the office computer.
- An isolated restore test runs quarterly against a disposable MySQL database only: reconcile student, account, payment and receipt counts, then a basic role/login smoke test. No one-click restore endpoint.

### 5. Retention (proposed; enforcement not active)

- Audit and security records: 10 years from `occurred_at`.
- Student, guardian and ordinary operational personal information: 5 years from the student's final school relationship or final account settlement, whichever is later.
- Financial, receipt, payment, void and close-out data are not deleted under the 5-year rule until the Academy confirms its financial, tax and records-management obligations.
- A legal hold, dispute, audit, incident or investigation suspends disposal.
- Backups follow the recovery rotation above. Expired copies must be securely destroyed.
- The 30-day archived-staff restore/anonymization lifecycle stays separate.
- Enforcement needs an approved data inventory, retention register, disposal method, authorization workflow and disposal audit log. Academy/DPO approval is required; Philippine privacy rules set no single universal period.

### 6. Performance targets (proposed local-deployment targets, not SLAs)

| Operation | Proposed p95 |
| --- | ---: |
| Page navigation, student search, account retrieval | ≤ 2 s |
| Payment confirmation and committed receipt creation | ≤ 3 s |
| Login and initial application navigation | ≤ 5 s |
| Daily, outstanding-balance and statement reports | ≤ 5 s |
| Monthly financial report, once implemented | ≤ 10 s |

Method: disposable MySQL database and synthetic data only; about 1,000 students with realistic accounts, installments and payments; six fictional staff accounts. Record CPU, RAM, storage, OS, PHP/MySQL versions, browser, dataset size, sample count, cold/warm runs, p50/p95, errors and outliers. Measure API/server time separately from the user-visible workflow. Never weaken locking, validation, authorization or audits to meet a target. Revisit after measuring the actual office computer.

### 7. UAT and acceptance

Participants: school-designated Administrator, Cashier, Accounting Officer, Registrar and school-management representatives; Project Supervisor Coleen Creus; project team representatives for facilitation, technical support and defect recording. The scenario list and record fields are in `05-Testing/Testing-and-Definition-of-Done.md` §29.5. Automated tests never substitute for UAT.

### 8. Receipt title

`Acknowledgment Receipt` is the only approved active title. `Official Receipt` needs separate owner and institutional approval. `OR-YYYY-NNNNNN` identifiers, historical receipt evidence and sequences are never renamed, rewritten or reset.


## Project-owner answers — second round, November 23, 2026

**Recorded:** Monday, November 23, 2026 — 22:46:05 +08:00
**Authority:** Project-owner answers to the five follow-up questions. They refine the first-round answers above. Not institutional approval.

### Cutover date

- No cutover date is approved. Do not invent one, use today, or pick a school-year start.
- The finance authority must confirm it, and it must be recorded here. It is interpreted as an Asia/Manila calendar date: a row is accepted when `as_of_date <= cutover date`.
- While unset: upload, parsing, validation, preview and submission stay available; the screens say the cutover is pending; confirmation is blocked (API 409). A missing cutover is a batch-level state, not a row error. Billing accounts, installments, payments and receipts are never touched.
- Configuration: `LEDGER_CUTOVER_DATE` in `backend/.env` (`YYYY-MM-DD`). Leave empty until approved.

### Opening balances and billing accounts

- Intended end state: posted opening balances become part of the student's financial position (balances, outstanding summaries, Accounting dashboards, follow-up, statements, reports), while staying distinguishable from new charges and from cash collections.
- Never present an opening balance as a payment, create historical receipts, change past collection totals, or overwrite history.
- A student who already has a billing account for that school year: do not overwrite or increase it. The row is flagged `conflict` for Accounting reconciliation and is not recorded. Merging needs a separately approved rule.
- Until the posting mapping below is approved, confirmation stays **storage-only**.

### Partial batches

- Accounting confirms only eligible rows. Invalid, duplicate and conflicting rows stay unrecorded and visible.
- The confirmation dialog shows how many rows are recorded and excluded. The server revalidates; if the eligible set changed since review, nothing is written (409) and Accounting must review again.
- Posting is one transaction and idempotent; a second confirmation returns 409. Uploaded values, row findings, outcomes and audit entries are kept. A downloadable error report lists every non-eligible row.
- A batch with zero eligible rows cannot be submitted or confirmed.

### Backup rotation

- Automatic deletion stays **off** (`BACKUP_ROTATION_ENABLED=false`). 30 daily + 12 monthly remains a recommendation.
- Before enabling it, approve: exact periods; daily/monthly classification; destination and capacity; responsible operator; restore-test requirements; security, encryption and access controls; rules that protect essential recovery copies; legal and institutional retention requirements.
- Never silently delete backup files or history rows. Disk-capacity monitoring is documented in `04-Development/Backend-Readiness.md`.

### Frontend workstream (approved)

- Ledger import: Cashier upload, column mapping, validation preview and submission; Accounting review, row findings and confirmation of eligible rows; pending-cutover and storage-only notices; results and review history.
- Backups: Administrator sees history, schedule, executor status, free space and restore-test information. "Run backup now" appears only when the server executor is configured.
- Super Admin gets a separate read-only `backup.view` capability, synchronized in backend and frontend. Super Admin does not get `backup.manage`, and nobody gets a restore control.

## PROPOSED — opening-balance posting mapping (awaiting approval; not implemented)

Status: proposal for owner and finance approval. Confirmation remains storage-only until this is approved.

1. **Students without an account for the row's school year.** Posting creates one billing account for that student and school year, marked as an opening-balance account (new `source = opening_balance` column). It gets one account item, "Opening balance as of {as_of_date}", for `balance_cents`. No fee schedule or payment plan is applied, so nothing is double-charged. Historical `total_due_cents` and `total_paid_cents` stay only on the conversion record; they are not turned into charges or payments.
2. **Rows with a zero balance.** These are recorded only. No billing account is created.
3. **Due date and installments.** Proposed: one installment for the full balance, with a due date that Accounting chooses for the batch at confirmation. That date must be on or after the cutover date. The existing oldest-first allocation then applies to later cash payments.
4. **Visibility.** The account then appears in outstanding balances, follow-up, Accounting dashboards and statements through the normal account queries. Statements and the account page label the item "Opening balance carried forward". Daily and monthly collection reports are unchanged because no payment exists.
5. **Existing-account conflicts.** These stay flagged and unrecorded. A reconciliation screen would show the imported balance next to the account's charges, adjustments, payments, allocations and outstanding amount. Merging needs a separate approved rule.
6. **Open question for approval.** When the opening balance belongs to a past school year, should it stay in its own past-year account (option 1), or be carried into the student's current-year account as a separate "Prior balance" item?
7. **Representative tests before activation:**
   - Posting creates exactly one account and one item per eligible row.
   - Fee schedules are not applied.
   - Collections totals are unchanged.
   - Outstanding, follow-up and statements include the balance with its distinct label.
   - Conflicts are never posted.
   - A repeated confirmation posts nothing twice.
   - A failure midway rolls back the whole batch.
   - The one-account-per-student-per-year constraint holds.

# Open Decisions and Clarifications

> **November 22, 2026 SRS v3.0 update:** `2026-11-22-srs-v3-policy-confirmations.md` resolves the policy owner for guardian management, direct adjustments, Accounting Officer assignment, receipt title, ledger workflow roles, backup intent, proposed retention periods, performance-target approach, and UAT participant categories. It does **not** resolve the detailed ledger-posting, shared-guardian/primary-contact, installment redistribution, retention-enforcement, backup-operation, performance-measurement, or UAT-sign-off questions listed there. Older sections remain historical context where they conflict.

> Source-derived unresolved decisions. Do not treat these items as settled requirements.

## 31. Open Decisions and Clarifications

Only genuine unresolved items are listed here — points the two source documents could not settle between them, or that both sources explicitly flagged as needing client or adviser input.

### 31.1 Adjustment approval threshold
- **Issue:** Should a discount or scholarship adjustment above a certain amount require Accounting Officer approval before it takes effect?
- **Conflicting/incomplete information:** The access-control breakdown raises this as a consideration ("discounts and scholarships change money owed, so consider requiring accounting approval above a threshold") but explicitly marks it "not decided."
- **Current interpretation:** None adopted. As currently specified (M3.3), the Cashier can add an adjustment unilaterally, with a required reason and a full audit trail; there is no approval gate.
- **What needs confirmation:** Ask the Accounting Officer whether a threshold and approval step are required, and if so, what the threshold and approval flow should be.

### 31.2 Confirmation of the "no hard delete" policy
- **Issue:** Deactivate/void/correct is used everywhere instead of delete (Section 6.2, rule 1), but the access-control breakdown flags this global pattern as needing sign-off.
- **Current interpretation:** Applied throughout this document as the working rule, since both sources are consistent with it and no alternative is proposed anywhere in either source.
- **What needs confirmation:** Confirm this policy with the client and the academic adviser before backend implementation locks it in.

### 31.3 Items still awaiting client confirmation (carried over as configurable, not final)
These were flagged in the original handoff as assumptions to be treated as configurable, not as finished requirements. They should be built as settings/config data (never hard-coded) and each one noted in `DECISIONS.md`:
1. Grade levels, sections, and school terms — unknown; seed with samples only.
2. Fee types, payment plans, discounts, and scholarships — configurable by Accounting (M9.1–M9.2).
3. What counts as "cleared" for enrollment and exams — configurable rules (M9.3).
4. Receipt title ("Official Receipt" vs. "Acknowledgment Receipt") and paper size (Letter vs. A4) (M9.5).
5. Payment methods list — default: Cash, Check, Bank deposit, all recorded manually.
6. The role/capability permission matrix itself (Section 6.4) — proposal awaiting client confirmation.
7. Who may add or edit student records — resolved by the approved November 5, 2026 role reassignment: Registrar manages approved basic student records; Cashier and Accounting do not edit them. Guardian-data ownership remains unresolved.
8. Due-soon window (default 7 days) and the duplicate-payment time window (default 10 minutes) (Section 25, rules 4–5).
9. Whether the backend uses Inertia.js or a separate REST API — default assumed here: SPA + REST (Section 28.2); components should stay presentational so either works.

### 31.5 Administrator assignment of Accounting Officer accounts
- **Issue:** The role specification gives Administrator user-management access but does not explicitly say whether an Administrator may create or promote an account into the Accounting Officer role. The mockup-based proposal also calls this out for confirmation.
- **Current interpretation:** Keep the Accounting Officer role and existing responsibilities. Until MCA confirms the assignment policy, Administrator requests cannot create or promote accounts into that role; this is enforced in the backend validation. Existing Accounting Officer accounts remain manageable, subject to the existing role and last-active-Administrator safeguards.
- **What needs confirmation:** Confirm which role may create or promote Accounting Officer accounts and whether separate approval is required. If approved, update both the API policy and role-administration UI together.

### 31.6 Administrator account assignment lifecycle
- **Issue:** The implementation prompt proposes a sixth, privileged Super Admin role and requires a protected bootstrap account, but the school has not confirmed recovery, second-person approval, or long-term account ownership policy. Administrator-to-Administrator promotion and Accounting Officer assignment also require policy boundaries.
- **Current implementation:** Per the requester's explicit instruction to execute the prompt, Super Admin is implemented as a separate governance role with no payment, student, or finance-operation capabilities. The initial account can only be created through the trusted `educatrak:bootstrap-super-admin` server-console command; it is marked protected, hidden from Administrator listings, and cannot be edited or reset through user-management APIs. Super Admin can create Administrator and non-privileged accounts; Accounting Officer assignment remains blocked for both roles. Administrator cannot create or promote an account into Super Admin or newly assign Administrator. This implementation is not evidence of MCA policy approval.
- **What needs confirmation:** MCA must still designate who may run bootstrap, approve break-glass recovery and second-person controls, confirm whether multiple Super Admins or later Super Admin assignment will ever be allowed, and confirm Administrator peer-promotion and Accounting Officer assignment policy. Finance/report read access remains denied to Super Admin except the separate audit-review capability. Do not expose a public Super Admin creation path.
- **Reviewed:** Sunday, October 25, 2026 — 11:53:55 +08:00.

### 31.7 Dashboard school-year range without a current school year
- **Issue:** The dashboard offers a “This school year” range, but the requirements do not define its behavior when no school year is marked current.
- **Current implementation:** `DashboardController::schoolYearStart` uses the current date as the range start when no current school year exists, making the range cover only today. This fallback is not approved as school policy.
- **Current interpretation:** No policy interpretation is approved; leave the behavior tracked and do not treat the one-day fallback as settled.
- **What needs confirmation:** The MCA finance/system-settings owner must specify whether to reject the range, return an empty result, select another configured period, or require a current school year. Then align API, UI messaging, and focused coverage.
- **Resolved 2026-11-19 (owner decision 4):** Exactly one school year is always current, and the dashboard keeps its existing 409 when none exists. The current year may change mid-year with a required 10–1000 character reason, audited before/after. Implemented in W1a.
- **Reviewed:** Sunday, October 25, 2026 — 10:51:18 +08:00.

### 2026-11-09 backend Part 1b status note

At Monday, November 09, 2026 — 12:40:29 Asia/Manila, Project owner left guardian-data ownership, adjustment approval threshold, Super Admin lifecycle, no-current-school-year dashboard behavior, and client sign-off for global no-hard-delete policy open. Recommendations in `2026-11-09-backend-part-1b-owner-decisions.md` are proposals only. Keep these decisions open; this note does not resolve or amend their substantive policy.
### 31.8 Backend retention versus current Privacy Policy text
- **Issue:** Project owner said backend audit/security/backup/notification/financial retention remains undecided. Current Privacy Policy copy in `frontend/src/i18n/en.ts:87` states ten-year audit-log and five-year other personal-information periods.
- **Status:** Source conflict remains open. Part 1b did not edit the client-facing promise or canonical requirements and does not authorize retention/purge implementation. Staff account archive's 30-day restore/anonymization lifecycle remains separate.
- **Next action:** MCA policy owner reconcile which records and systems the published periods govern, then separately authorize any canonical or implementation update.
- **Recorded:** Monday, November 09, 2026 — 12:46:06 Asia/Manila.
### 31.9 Guardian relationship scope in persisted schema
- **Issue:** MockDB `studentGuardianLinks` records `relationship` on each student–guardian link (`frontend/src/api/mock/mock-db.json:64-67`). SQL stores `relationship` on `guardians` (`backend/database/migrations/2026_10_09_062757_create_educatrak_reference_and_people_tables.php:60-68`); `guardian_student` contains `is_primary` but no relationship field (`:80-85`). A guardian linked to multiple students therefore has one persisted relationship value.
- **Answer:** Project owner confirmed Tuesday, November 10, 2026 — 14:50:29 Asia/Manila: relationship describes each student–guardian link.
- **Status:** Semantic question resolved. Current SQL stores `relationship` on `guardians`, so schema/API reconciliation remains open and requires separate authorization. Guardian-data ownership/lifecycle and primary-contact rules remain distinct open questions.
- **Recorded:** Tuesday, November 10, 2026 — 14:50:29 Asia/Manila.

### 31.10 Owner decisions approved 2026-11-19 (settings and account creation)

Recorded Friday, November 20, 2026 — 01:05:12 +08:00. Approved by the project owner on 2026-11-19 for `feature/backend-completion`:

1. **Settings ownership.** Administrator manages school year, terms, exam periods, grade levels/sections and school/receipt/email settings (`settings.system.manage`). Accounting manages fees and payment plans (`settings.finance.manage`) and reads system settings (`settings.system.view`). No new capabilities.
2. **School-year lifecycle.** School years are never deleted. Label corrections are always allowed and audited. School-year and term start/end dates lock once any billing account exists for that year. Descriptive fields stay editable.
3. **Payment plans.** Edits apply to new accounts only through versioning. A revision creates version N+1 and deactivates the old version, which existing accounts keep. No delete once used.
4. **Current school year.** The current year may change mid-year with a required 10–1000 character reason, audited before/after. Exactly one year is always current. The dashboard keeps its 409 when none exists.

Follow-up answers given by the owner during the W1b/W2 planning session (November 19–20, 2026):

- Installment due dates (`due_day_offset`) count from the account creation business date (Asia/Manila); the down payment is due that day.
- A percent down payment `down_payment_value` is in basis points (10000 = 100%), rounded down. Each installment takes floor(remaining × bp / 10000); the last installment absorbs the remainder.
- Billing accounts can be created only for the current school year.
- Account creation requires exactly one active fee schedule per (school year, grade level); otherwise 422.

Still open: adjustment threshold (31.1), global no-hard-delete sign-off (31.2), payment-method list and management, test email and email delivery semantics, Super Admin lifecycle (31.6), Accounting assignment (31.5), retention (31.8), guardian lifecycle, and whether term/exam dates must fall inside the school year.

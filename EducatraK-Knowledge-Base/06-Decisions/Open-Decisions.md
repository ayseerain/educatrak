# Open Decisions and Clarifications

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
- **Reviewed:** Sunday, October 25, 2026 — 10:51:18 +08:00.

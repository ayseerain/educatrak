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
7. Who may add or edit student records — assumed: Admin and Cashier (M2.1).
8. Due-soon window (default 7 days) and the duplicate-payment time window (default 10 minutes) (Section 25, rules 4–5).
9. Whether the backend uses Inertia.js or a separate REST API — default assumed here: SPA + REST (Section 28.2); components should stay presentational so either works.

### 31.4 SMS notifications and load cost
- **Issue:** Receipt and reminder notifications can now be sent by email, SMS, or both, but no carrier, gateway, price, or party responsible for the SMS load cost has been approved.
- **Current interpretation:** SMS is an optional notification channel. `SMS_LOAD_FEE_CENTS` is an optional server setting; when configured, its value is recorded with the SMS notification and is never added to a student's billing balance. When it is not configured, the UI states that no fee is configured rather than inventing an amount.
- **What needs confirmation:** Select an SMS gateway, define consent and mobile-number verification rules, identify the party that bears the load cost, approve the configured rate and effective date, and specify delivery/retry handling.

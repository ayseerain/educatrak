# Reconciled Decisions

> Source-derived record of reconciled differences from the canonical Project Specification.

## 30. Reconciled Changes

These are the points where the two source documents differed and were merged into a single rule, using the precedence order stated at the top of this document.

1. **Cashier can print student statements (M7.4).** The original handoff only let cashiers see their own day's reports; the access-control breakdown adds that the fallback for guardians without email needs a cashier-printed statement. **Resolved:** added a `statement.print` capability for `CSH` and `ACC` (Section 6.4), and `CSH` can open `/reports/student/:id`.
2. **Registrar sees clearance reasons without amounts (M10.1).** The original handoff's Flow F4 example showed "Balance due: ₱1,200.00," which contradicts the explicit privacy rule that the Registrar sees no amounts (Section 6.2, rule 5). Per the reconciliation priority (explicit privacy rule outranks a general screen example), **resolved:** reasons are role-aware — Flow F4 (Section 23.3) and M10.1 now state this explicitly, and the illustrative amount was removed from the Registrar's case.
3. **Read-only settings for ADM and AUD (M9).** The original handoff gave finance settings only to Accounting. **Resolved:** Auditors and Admins get read access to finance settings, and Accounting and Auditors get read access to system settings, since all three need to see this data to do their jobs (Section 6.3, 6.4, 17).
4. **Fee and plan edits apply to new accounts only (M9.1, M9.2).** Both sources agree; the access-control breakdown adds the requirement that this needs a versioning rule on the backend so existing accounts keep their original terms. **Resolved:** stated as Business Rule 20 (Section 25).
5. **Copy fee schedule to next school year (M9.1).** A new Could-have convenience introduced in the access-control breakdown, not present in the original handoff. **Resolved:** kept as a Could-priority operation in M9.1.
6. **"Delete" replaced by deactivate, void, or correct everywhere.** Both sources agree on the pattern (Global Rule 1, Section 6.2); it is applied consistently throughout every module's operation table. The need for final client/adviser confirmation of this policy is carried forward — see Section 31.
7. **Admin safety rules (M1.3).** Present only in the access-control breakdown (an admin cannot deactivate themselves or the last active admin). **Resolved:** carried forward as-is; no conflict with the handoff.
8. **Cashier "own" scope** for history, close-out history, and daily reports is enforced by the backend, not only the UI — stated explicitly in the access-control breakdown and consistent with the handoff's general "frontend never relies on hiding alone" rule (Section 6.2, rule 6).

---

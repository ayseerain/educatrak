# Reconciled Decisions

> Source-derived record of reconciled differences from the canonical Project Specification.

## 30. Reconciled Changes

These are the points where the two source documents differed and were merged into a single rule, using the precedence order stated at the top of this document.

1. **Cashier student-statement access (M7.4).** Earlier reconciliation assigned statement printing to Cashier and Accounting for guardians without email. The current role simplification assigns reporting and statement printing to Accounting; Cashier uses the existing transaction-history and close-out workspaces for their own activity and has no standalone Reports or statement page. The approved Project Specification's current Section 6.3/6.4 role boundaries take precedence over the older reconciliation text.
2. **Registrar sees clearance reasons without amounts (M10.1).** The original handoff's Flow F4 example showed "Balance due: ₱1,200.00," which contradicts the explicit privacy rule that the Registrar sees no amounts (Section 6.2, rule 5). Per the reconciliation priority (explicit privacy rule outranks a general screen example), **resolved:** reasons are role-aware — Flow F4 (Section 23.3) and M10.1 now state this explicitly, and the illustrative amount was removed from the Registrar's case.
3. **Settings access (M9).** Earlier reconciliation proposed read access for Administrator/Auditor to finance settings and for Auditor to system settings. The current role simplification assigns system settings to Administrator (manage) and Accounting (read), finance settings to Accounting, and keeps Auditor within the single Audit Review workspace; the role matrix in the current Project Specification supersedes that older access proposal.
4. **Fee and plan edits apply to new accounts only (M9.1, M9.2).** Both sources agree; the access-control breakdown adds the requirement that this needs a versioning rule on the backend so existing accounts keep their original terms. **Resolved:** stated as Business Rule 20 (Section 25).
5. **Copy fee schedule to next school year (M9.1).** A new Could-have convenience introduced in the access-control breakdown, not present in the original handoff. **Resolved:** kept as a Could-priority operation in M9.1.
6. **"Delete" replaced by deactivate, void, or correct everywhere.** Both sources agree on the pattern (Global Rule 1, Section 6.2); it is applied consistently throughout every module's operation table. The need for final client/adviser confirmation of this policy is carried forward — see Section 31.
7. **Admin safety rules (M1.3).** Present only in the access-control breakdown (an admin cannot deactivate themselves or the last active admin). **Resolved:** carried forward as-is; no conflict with the handoff.
8. **Cashier "own" scope** for payment history and close-out history is enforced by the backend, not only the UI — stated explicitly in the access-control breakdown and consistent with the handoff's general "frontend never relies on hiding alone" rule (Section 6.2, rule 6). Cashier daily totals are shown in the dashboard and close-out workspace; separate report pages belong to Accounting under the current role simplification.

---

## 31. Decisions adopted by explicit task direction

Recorded Sunday, October 25, 2026 — 12:55:14 Asia/Manila. These are implementation approvals supplied by the requester during this refinement task, not separate evidence of MCA-wide policy approval.

1. **Staff account archive lifecycle.** Disable login immediately when an authorized Administrator or Super Admin archives an account. Start a configurable 30-day restore window at `archived_at`. At expiry, anonymize account identifiers and personal fields, including corresponding audit snapshots, while retaining user IDs, roles, archive metadata, linked financial references, and audit history. Do not physically delete the user row or linked records.
2. **Reminder delivery.** Support email and SMS reminders; use Twilio for SMS. Read credentials from server environment configuration. Keep provider-accepted messages `queued` until a delivery result is confirmed; verify Twilio status callbacks with its request signature. Permit explicit retry only for failed attempts and leave uncertain provider responses pending to prevent duplicate sends. Record an optional SMS load cost without adding it to student balances.

## 31. Decisions adopted by explicit task direction

Recorded Sunday, October 25, 2026 — 12:55:14 Asia/Manila. These are implementation approvals supplied by the requester during this refinement task, not separate evidence of MCA-wide policy approval.

1. **Staff account archive lifecycle.** Disable login immediately when an authorized Administrator or Super Admin archives an account. Start a configurable 30-day restore window at `archived_at`. At expiry, anonymize account identifiers and personal fields, including corresponding audit snapshots, while retaining user IDs, roles, archive metadata, linked financial references, and audit history. Do not physically delete the user row or linked records.
2. **Reminder delivery.** Support email and SMS reminders; use Twilio for SMS. Read credentials from server environment configuration. Keep provider-accepted messages `queued` until a delivery result is confirmed; verify Twilio status callbacks with its request signature. Permit explicit retry only for failed attempts and leave uncertain provider responses pending to prevent duplicate sends. Record an optional SMS load cost without adding it to student balances.

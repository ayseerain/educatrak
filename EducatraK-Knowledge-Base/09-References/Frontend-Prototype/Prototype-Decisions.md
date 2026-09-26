# DECISIONS.md

Per spec section 24 ("No Invention"), this file records every place the
brief left a decision unspecified and the simplest conventional choice
that was made instead. None of these introduce new business rules,
roles, financial logic, or modules — they are UI/scaffolding decisions
only.

## 1. Record Payment destination
The brief establishes "Record payment" as the Cashier's primary CTA but
does not specify the payment-recording screen/flow itself (fields,
validation, receipt generation). `onRecordPayment` in `DashboardPage`
is currently a no-op with a `TODO(spec)` comment. Wire it to a route
once that screen is specified.

## 2. Non-dashboard screens
The sidebar links to every nav item permitted by the capability matrix
(Students, Accounts, Payments, Follow-up, Clearance, Reports, Void
approvals, Close-out, Close-out history, Import, Administration,
Backup, Audit log, Notifications, Settings), but the brief's scope for
this task was the Dashboard page only. Non-dashboard routes render a
minimal `PlaceholderScreen` rather than a broken link, so the
role-aware navigation can be reviewed end-to-end. These should be
replaced screen-by-screen as each is specified.

## 3. Authenticated user / session source
The brief specifies cookie-session authentication but this task did
not include an auth API contract. `App.tsx` hard-codes a single fake
`AuthenticatedUser` (`CURRENT_USER`) with a `TODO(spec)` note. Replace
with a real `useSession()`/`useCurrentUser()` hook backed by the
cookie session once that endpoint is defined. To preview a different
role's dashboard during development, edit the `role` field on that
constant.

## 4. Table row actions
The brief lists an "Actions" column as a *potential* column for the
Payment entity but doesn't specify what actions are available beyond
implying a cashier can act on a row. `RecentActivity` renders a
"View receipt" text action for the Cashier's table (`showActions`)
and no actions column for Auditor/Accounting, consistent with their
read-only capabilities. The actual receipt-viewing behavior is not
wired up.

## 5. Notification bell / search box behavior
The header's search box and notification bell are visually present
per the reference composition (section 25/26) but the brief does not
define their behavior (what search indexes, what notifications
contain). Both are currently inert UI affordances.

## 6. Badge tone mapping
The brief specifies status must use icon + text (never color alone)
and gives example glyphs (✓ ! ⚠ × i) but doesn't map every payment
status to a specific tone. `posted → success`, `pending → warning`,
`voided → error` was chosen as the simplest conventional mapping.

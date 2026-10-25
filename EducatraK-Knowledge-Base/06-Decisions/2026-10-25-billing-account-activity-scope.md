# Implementation Decision — Billing Account Activity Scope

Recorded: Sunday, October 25, 2026 — 08:37:46 Asia/Manila

## Decision

`GET /api/billing-accounts/{id}` supplies a read-only activity feed scoped to the requested billing account. It includes:

- The account creation record, using its persisted creation time and creator.
- Payment records belonging to the account, using their persisted recording time and cashier.
- Adjustment records belonging to the account, using their persisted creation time, creator, type, amount, and reason.
- Audit events whose entity is one of the account's payments, including void and receipt print/reprint changes.

The feed excludes authentication events, events for other payments/accounts, private payment notes, and fields outside the activity response allowlist. It reuses the existing `account.view` authorization and grants no new role access. This defines the implementation scope for M3.2's unspecified "activity" field; it does not decide adjustment approval policy, account mutation authority, or audit retention.

## Rationale

M3.2 requires activity on Account Detail but does not enumerate event types. The listed event sources are already persisted and directly associated with the account; no new business event or policy is inferred. Existing payments and adjustments sections remain available for their detailed records, while the timeline gives a chronological account-level view.

## Evidence

- `EducatraK-Knowledge-Base/01-Requirements/Modules-and-Features.md`, M3.2.
- `backend/app/Http/Controllers/Api/BillingAccountController.php`.
- `frontend/src/features/billing/LiveBillingAccounts.tsx`.
- `backend/tests/Feature/BillingAccountReadTest.php` and `frontend/src/test/liveBillingAccounts.test.tsx`.
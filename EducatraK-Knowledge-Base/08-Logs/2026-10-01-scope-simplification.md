# Scope Simplification

Timestamp: Thursday, October 01, 2026 — 16:14:53 +08:00

## What Changed

- Added an explicit `receipt.pdf` frontend capability for Cashier and Accounting users.
- Added manual PDF receipt actions to the payment detail and receipt print views while keeping Administrator and Auditor view-only.
- Added a scoped Receipt PDF entry in the reports hub that opens the existing receipt surface instead of creating any public portal, online payment, or messaging integration.
- Updated the receipt copy to describe PDF downloads as backend-logged receipt activity, without tying it to Messenger or any external integration.
- Added a regression test confirming Cashier can see the PDF action and Auditor cannot.

## Why

The requested scope keeps the existing staff-only billing modules, includes optional shareable PDF receipts, and excludes public portals, online payment processing, self-service password recovery, and messaging integrations.

## Validation

- `rg` scan for out-of-scope frontend wording only found the existing test assertion that "forgot password" is absent.
- `npm test -- --run` passed: 44 tests.
- `npm run build` passed.

## Follow-Up

- No unresolved scope questions were found in this pass.

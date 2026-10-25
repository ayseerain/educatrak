# Implementation Decision — Billing Status Recalculation

Recorded: Saturday, October 24, 2026 — 20:26:29 Asia/Manila

## Decision

- Store the due-soon window as a numeric JSON value at `system_settings.key = billing.due_soon_days`.
- When that setting is absent or invalid, use the approved specification default of 7 days. This is a fallback; a persisted valid setting takes precedence.
- Compute status using Asia/Manila calendar dates: fully paid installments are `paid`; unpaid installments with a due date before today are `overdue`; installments due from today through today plus the configured window are `due_soon`; all other unpaid installments are `current`.
- The billing-account status is the worst status among its installments (`overdue`, then `due_soon`, then `current`, then `paid`).
- Recalculate within payment and approved-void transactions, and refresh all accounts daily through the Laravel scheduler.

## Scope and follow-up

This records the storage and calculation implementation for the existing approved status rule. It does not settle any policy beyond the documented configurable window and its seven-day default. The M9 settings screen/API is still not connected; deployments must maintain the setting in `system_settings` until that workflow is delivered. The deployment owner must enable Laravel's scheduler for daily aging.

## Evidence

- `EducatraK-Knowledge-Base/01-Requirements/Data-and-Business-Rules.md`, Business Rule 25.4.
- `backend/app/Actions/RecalculateBillingStatusAction.php`.
- `backend/tests/Feature/BillingStatusSynchronizationTest.php`.
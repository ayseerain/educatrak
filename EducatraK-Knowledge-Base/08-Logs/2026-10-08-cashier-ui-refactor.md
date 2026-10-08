# Cashier UI Refactor

Thursday, October 08, 2026 — 21:37:57 +08:00

## Summary

Refactored the Cashier-facing frontend to reduce duplicate navigation and duplicate UI surfaces while keeping approved routes available. Payment recording now uses the shared `/payments/new` workflow for Dashboard, Payments, and Student Profile contextual payment entry; the previous dashboard-only payment dialog was removed. Student Profile sections now follow Overview, Billing, Payments, and Follow-up. Statement presentation is shared between profile billing context and the report statement route. Follow-up and Notification Log are grouped as Reminders & Notifications, and Close-out plus history are grouped under Daily Close-out tabs.

## Validation

- `npx tsc -b --pretty false` passed.
- `npx vitest run src/test/operations.test.tsx src/test/dashboard.test.tsx` passed.
- `npm test` passed.
- `npm run build` passed.

## Follow-up

Backend concurrency, atomic receipt numbering, and durable duplicate-payment prevention remain backend dependencies; this frontend refactor only prevents duplicate submissions within the active shared form while saving.
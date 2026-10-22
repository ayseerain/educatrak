# Cashier Live Workflow Backend

**Timestamp:** Thursday, October 22, 2026 — 08:39:03 +08:00

- Added Laravel API endpoints for payment lookup and recording, payment history/detail/reprint, void requests and accounting decisions, and daily close-out submission/history/sign-off.
- Payment saves are transactional: they validate the balance, allocate oldest unpaid installments first, generate a server-assigned receipt, create the confirmation-email log, and record an audit entry. Void approval restores the allocation and account balance; close-out locks one cashier's day and requires a variance reason when needed.
- Removed all database demo records from the standard seeder. A migrated database now starts empty and must be populated through authorized system workflows. The frontend can opt into the live Laravel session/API with `VITE_USE_LIVE_API=true`; mock mode remains temporarily available only because student/account creation and dashboard read APIs are not yet implemented.

## Validation

- Passed: frontend `npm run build` and the frontend Vitest suite (60 tests).
- Passed: PHP syntax checks for the new actions/controllers and route registration inspection.
- Blocked by host PHP: `vendor/bin/pint` and `php artisan test` require the unavailable `mbstring` extension. Database migration/seed is also blocked because the PHP installation lacks the SQLite PDO driver. No database data was created on this machine.

# Accounting Add Fee Item Dialog

**Timestamp:** Thursday, October 22, 2026 — 17:48:46 +08:00

- Added the Accounting-only Add fee item dialog to Financial Policies (`/settings/fees`).
- The mock form captures school year, grade level, fee-item name, category, amount, and required or optional status. A submitted item appears as active in the selected fee schedule; the UI continues to state that it applies only to new accounts.
- Administrator and Auditor remain read-only because the dialog and its trigger render only for editable settings access.

## Validation

- Passed: `npx vitest run src/test/operations.test.tsx` (34 tests), including the Accounting add-fee flow.
- Passed: `npm test` (69 tests) and `npm run build` in `frontend/`.

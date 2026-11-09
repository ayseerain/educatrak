# Daily Close-out Reconciliation Layout

**Timestamp:** Thursday, October 22, 2026 — 20:32:59 +08:00

- Reworked the Daily close-out card into a responsive three-column reconciliation row for the system cash total, counted cash, and live variance state, making full use of the available desktop width.
- Added clear reconciliation states for waiting, balanced, over, and short counts. The counted-cash field receives initial focus for the cashier workflow.
- Made a non-zero variance explanation required before the close-out can be reviewed, and repeated the explanation in the confirmation dialog. The locked state disables further close-out review.
- Added focused regression coverage for the cash-count, variance-reason, and confirmation flow.

## Validation

- Passed: frontend `npm test` (76 tests).
- Passed: frontend `npm run build`.
- Passed: `git diff --check`.

# GCash Payment Method Removal

Timestamp: Tuesday, September 29, 2026 — 09:48:47 +08:00

## What Changed

- Removed GCash from the supported payment method type, payment dialog options, and validation schema.
- Removed GCash from mock dashboard transactions and replaced sample transaction/report entries with bank transfer.
- Added regression assertions that GCash is not offered in either payment selector.

## Why

GCash is not planned for implementation and should not be offered as a transaction method.

## Validation

- `npm test -- src/test/dashboard.test.tsx src/test/operations.test.tsx` passed (28 tests).
- `npm run build` passed. Vite reported the large-chunk warning.
- `get_errors` reported no errors in the changed source and test files.

## Follow-Up

- None.
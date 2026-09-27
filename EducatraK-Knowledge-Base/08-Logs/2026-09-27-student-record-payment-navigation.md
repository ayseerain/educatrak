# Student Record Payment Navigation

Timestamp: Sunday, September 27, 2026 — 12:30:21 +08:00

## Summary

- Updated the record payment page to read `/payments/new?student=:id`.
- When opened from a student profile, the page now pre-fills the student search field and shows the selected student's grade, section, and balance.
- Added a regression test that clicks the student profile "Record payment" action and verifies navigation to the exact student payment URL.

## Validation

- `npm test -- operations.test.tsx` from `frontend/` passed.
- `npm test` from `frontend/` passed.

## Follow-up

- None.

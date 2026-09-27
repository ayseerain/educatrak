# Student Activity Due Record Context

Timestamp: Sunday, September 27, 2026 — 12:57:17 +08:00

## Summary

- Added sample due-record data for each student profile.
- Cleaned up the student profile Follow-up reminder panel so it shows the student, guardian email, total due, and a due-record table.
- The table identifies what each amount is for by billing account, installment, due date, status, and amount due.
- Added the next due record and amount due to the inline Record payment panel.

## Validation

- `npm.cmd run test -- operations.test.tsx` from `frontend/` passed.
- `npm.cmd run build` from `frontend/` passed. Vite reported the existing large chunk warning.

## Follow-up

- None.

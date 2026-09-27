# Student Profile Follow-up Action

Timestamp: Sunday, September 27, 2026 — 12:38:17 +08:00

## Summary

- Changed the student profile "Student activity" action from "Create billing record" to "Follow-up".
- The action now opens the existing `/followup` page and uses the `followup.view` capability.
- Added a regression test that confirms the old action is absent and the new Follow-up action opens the overdue follow-up page.

## Validation

- `npm.cmd run test -- operations.test.tsx` from `frontend/` passed.
- `npm.cmd run build` from `frontend/` passed.
- `npm.cmd run test` from `frontend/` passed.

## Follow-up

- None.

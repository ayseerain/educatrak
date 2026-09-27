# Student Row Navigation Update

Timestamp: Sunday, September 27, 2026 — 12:15:44 +08:00

## Summary

- Updated the students table so each student row opens the student profile when clicked.
- Removed the inline linked student name and adjacent arrow icon from the student list.
- Preserved keyboard access by making rows focusable and activating them with Enter or Space.
- Added a focused frontend test that clicks the grade cell and confirms navigation to the student profile.

## Validation

- `npm test` from `frontend/` passed.
- Initial `npm test -- --runInBand` did not run because Vitest does not support the Jest `--runInBand` option.

## Follow-up

- None.

# Login Password Toggle Highlight

Timestamp: Thursday, October 22, 2026 — 17:10:42 +08:00

## What Changed

- Changed the password visibility button highlight from a rounded rectangle to a circle.
- Inset the keyboard focus outline so it stays visually balanced within the password field.
- Added regression coverage for the toggle's focus/hover shape.

## Why

The eye icon's rectangular hover and focus box looked visually unbalanced beside the password field.

## Validation

- `frontend: npm run test -- src/test/login.test.tsx` passed: 12 tests.
- `frontend: npm run build` passed.
- `git diff --check` passed for the changed login files.

## Follow-Up

- None.

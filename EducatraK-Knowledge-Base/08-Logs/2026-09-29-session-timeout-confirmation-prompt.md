# Session Timeout Confirmation Prompt

**Timestamp:** Tuesday, September 29, 2026 — 10:05:38 +08:00

## What changed

- Added an explicit "Would you like to stay signed in?" confirmation prompt to the session-expiration dialog.
- Added a regression assertion for the prompt in the login/session test.

## Why

- Make the existing timeout popup read clearly as a confirmation while preserving its current countdown, actions, and session behavior.

## Validation

- `npm --prefix frontend test -- login.test.tsx` passed (10 tests).
- `npm --prefix frontend run build` passed; Vite reported the existing large-chunk advisory.

## Follow-up

- None.
# Session Timeout Warning Activity Fix

**Timestamp:** Tuesday, September 29, 2026 — 10:02:58 +08:00

## What changed

- Kept normal activity listeners active while the session-expiration warning is open.
- Prevented focus events from child elements, such as the warning dialog's automatic focus, from counting as user activity.
- Renewed the inactivity deadline and dismissed the warning after genuine activity.
- Added a regression test for scrolling during the warning window.

## Why

The activity listeners were removed when the warning opened, so interacting during the warning could not prevent logout. Captured focus events also treated the warning dialog's own focus as activity.

## Validation

- `npm --prefix frontend test -- login.test.tsx` passed.
- `npm --prefix frontend run build` passed; Vite reported the existing large-chunk advisory.

## Follow-up

- The active frontend still uses an in-memory mock session. Align warning behavior with the Laravel cookie session when backend authentication is integrated.
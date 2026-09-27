# Session Timeout Activity Fix

**Timestamp:** Sunday, September 27, 2026 — 11:18:21 +08:00

## What changed

- Updated `frontend/src/auth/session.tsx` so the inactivity timer renews on a broader set of normal workstation activity, including scrolling, wheel activity, input, pointer, mouse, keyboard, touch, and focus events.
- Added captured passive activity listeners so activity inside nested controls is still seen by the session provider.
- Kept the existing inactivity timeout, one-minute warning, explicit "Stay signed in" renewal, and automatic logout behavior.
- Added a regression test in `frontend/src/test/login.test.tsx` confirming that scrolling before the original timeout keeps the signed-in user on the dashboard.

## Why

Users were being logged out intermittently while still using the app. The session provider only renewed on a small set of events, so normal reading or scrolling could still let the fixed expiry elapse.

## Validation

- `npm test -- login.test.tsx` passed.
- `npm test` passed.
- `npm run build` passed.

## Follow-up

- The current frontend still uses a mock in-memory session. When the Laravel backend is added, align this client-side warning with the real cookie session and `/auth/me` behavior.

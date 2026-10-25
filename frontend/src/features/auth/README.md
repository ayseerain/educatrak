# Authentication flow

The `/login` route uses the Laravel cookie-session API in production builds.
On startup the frontend requests `/api/auth/me` to restore the cookie-backed
session after refresh. It shows a restoring state while that request is pending,
returns to login on an unauthenticated response, and offers retry on a network or
server error. The identity and role are not cached in browser storage.
Local development may use the in-memory mock session in `src/auth/session.tsx`
when `VITE_USE_LIVE_API` is not set to `true`. Production builds always use the
backend and never fall back to mock credentials. Mock credentials are fictional
and remain development-only. Credentials are not stored in `localStorage`.

The header's role preview control is also limited to local mock development; it
is hidden when using the live API and is not included in production builds.

The sign-in page includes a "Forgot password?" control that directs staff to
contact an administrator. It does not provide self-service password recovery.

Accounts marked `mustChangePassword` are routed to `/first-login`. The page
verifies the temporary/current password and sends the new password to the
authenticated `/api/auth/change-password` endpoint; navigation to other
protected pages remains blocked until the server confirms the change.

The mock session expires after 30 minutes of inactivity and shows the required
warning 1 minute before expiry. The warning lets the user stay signed in or
sign out immediately; expired sessions return to `/login`.

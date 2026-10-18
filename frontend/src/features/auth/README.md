# Authentication flow

The `/login` route is mounted in the active application for the B01 build
phase. It uses the in-memory mock session in `src/auth/session.tsx` so the
frontend can run without the Laravel backend. Credentials are not stored in
`localStorage`; the signed-in user exists only in React state for this mock.

The real backend will replace this with the documented cookie-session API.

The sign-in page includes a "Forgot password?" control that directs staff to
contact an administrator. It does not provide self-service password recovery.

The mock session expires after 30 minutes of inactivity and shows the required
warning 1 minute before expiry. The warning lets the user stay signed in or
sign out immediately; expired sessions return to `/login`.

# Authentication flow

The `/login` route is mounted in the active application for the B01 build
phase. It uses the in-memory mock session in `src/auth/session.tsx` so the
frontend can run without the Laravel backend. Credentials are not stored in
`localStorage`; the signed-in user exists only in React state for this mock.

The real backend will replace this with the documented cookie-session API.

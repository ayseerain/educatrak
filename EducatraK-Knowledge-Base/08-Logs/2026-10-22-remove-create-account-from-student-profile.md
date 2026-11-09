# Remove Create Account from Student Profile

Timestamp: Thursday, October 22, 2026 — 18:29:13 +08:00

## What Changed

- Removed the Create account action from the student billing profile.
- Kept account creation available from the Billing accounts page.
- Added regression coverage for the profile action while retaining the existing authorized-role checks.

## Validation

- Targeted operations test passed.
- `frontend: npm run build` passed.
- `git diff --check` passed for the changed frontend files.

## Follow-Up

- None.

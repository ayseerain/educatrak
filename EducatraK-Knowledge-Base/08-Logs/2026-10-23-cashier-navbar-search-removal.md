# Cashier Navbar Search Removal

**Timestamp:** Friday, October 23, 2026 — 12:54:25 +08:00

## Changed

- Removed the global student search from the shared header, including for Cashier accounts.
- Standardized the header controls so the role selector, profile, and sign-out action stay grouped at the right.
- Updated regression coverage to verify the search is absent and account controls remain right-aligned for all roles.

## Validation

- `frontend: npm.cmd run test -- src/test/operations.test.tsx` passed: 42 tests.
- `frontend: npm.cmd run build` passed.
- `git diff --check` passed for the implementation and test changes.

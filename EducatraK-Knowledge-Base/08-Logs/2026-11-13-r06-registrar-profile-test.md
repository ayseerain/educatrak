# R06 - Registrar Profile Baseline-Test Reconciliation

- **Timestamp:** Friday, November 13, 2026 — 13:14:25 +08:00
- **State:** Awaiting owner acceptance; validated in the frontend test environment.
- **Scope:** Correct stale MockDB Registrar-profile test assertions so they enforce the approved profile contract. No application behavior change is included.

## Evidence and change

The approved November 7 MockDB decision requires the Registrar profile to show LRN, academic information, personal information, and guardian details while excluding billing content. `frontend/src/test/liveStudents.test.tsx` still expected LRN, grade level, and section to be absent and used stale labels from the non-Registrar profile branch.

R06 changes only that test. It now verifies LRN, grade level, section, enrollment status, personal information, and guardian details, and confirms account balance and billing status are absent.

## Validation

- Focused `liveStudents.test.tsx` passed: **11 tests**.
- Complete frontend Vitest passed: **36 test files / 250 tests**.

## Boundary

No UI, API, data, permission, database, provider, scheduler/worker, infrastructure, backup/restore, commit, push, or deployment operation ran. R06 does not resolve any A06/B13 or matching-MySQL blocker, and it does not approve release.

Owner acceptance would accept this narrow test-contract correction only. It would not authorize database, provider, infrastructure, recovery, or deployment work.

## Owner disposition - Friday, November 13, 2026 — 13:16:57 +08:00

- **Decision:** The owner accepted R06.
- **Resolved:** The stale MockDB Registrar-profile baseline assertion is resolved in frontend test evidence.
- **Boundary:** All A06/B13 and matching-MySQL release blockers remain open. Acceptance does not authorize database, provider, infrastructure, recovery, or deployment work.

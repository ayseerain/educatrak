# Recent Activity Filter Alignment

Timestamp: Wednesday, September 30, 2026 — 14:11:08 +08:00

## What Changed

- Moved the Recent Activity heading into the shared activity component beside the row-count filter.
- Kept the heading and filter visible when the activity list is empty.
- Removed the duplicate headings from the Cashier, Accounting, and Auditor dashboard sections.

## Validation

- Ran `npm test -- --run src/test/dashboard.test.tsx` from `frontend/`; all 21 tests passed.
- Checked touched files for diagnostics; none were reported.
- Existing React Router future-flag and Recharts zero-dimension warnings remain non-failing.

## Follow-Up

- No unresolved implementation items. The formal frontend Cross-Check & Audit phase remains pending as tracked in the operating manual.
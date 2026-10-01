# Webpage Consistency and Redundancy Fixes

Timestamp: Wednesday, September 30, 2026 — 15:03:03 +08:00

## What Changed

- Added `payment.void.view` so Administrator, Accounting, and Auditor can open the void queue, while only Accounting can approve or reject voids.
- Updated the `/voids` route, sidebar entry, capability types, permission matrix, and requirements documentation to use the read-only void-view capability.
- Reworked shared operational mock pages that were too generic:
  - report detail pages now show report-specific filters, table headers, and sample rows;
  - settings pages now show section-specific rows for fees, plans, clearance rules, school lists, receipt settings, and email settings;
  - payment detail and receipt print views now include allocation, recorder/audit context, reprint/print distinctions, and void/reprint notes.
- Standardized manual payment-method wording to Cash, Check, and Bank deposit, and removed current GCash references from the canonical requirements and open-decision notes.
- Updated the affected frontend test expectation from Bank transfer to Bank deposit.

## Why

The frontend audit found mismatches between documented access rules and route guards, duplicated report/settings content across distinct pages, and conflicting payment-method wording between the code and knowledge base.

## Validation

- `npm test -- --run` passed: 43 tests.
- `npm run build` passed.

## Follow-Up

- A larger i18n cleanup remains useful because many operational-page strings are still local to `OperationalPages.tsx`.

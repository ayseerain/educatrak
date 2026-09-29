# Notification Status Filter and Student Separator Fix

Timestamp: Tuesday, September 29, 2026 — 09:39:55 +08:00

Updated: Tuesday, September 29, 2026 — 09:40:41 +08:00

## What Changed

- Replaced the broken grade/section separator in the student profile payment widget with a plain hyphen separator.
- Updated failed-email dashboard widget links to open `/notifications?status=failed`.
- Added a Status column filter dropdown on the notification log using an arrow up/down icon button.
- Connected the notification status filter to the `status` URL query parameter.
- Added tests for failed-email dashboard navigation and notification status filtering.
- Replaced the archived prototype header's broken notification emoji with a Lucide icon.

## Why

The student payment widget displayed a replacement character in the Grade & section field. The dashboard failed-email action opened the notification log but did not pre-filter failed notifications.

## Validation

- Ran a replacement-character and emoji-range scan over `frontend\src`; no matches found.
- Ran `npm test -- --run src/test/operations.test.tsx src/test/dashboard.test.tsx`.
- Ran `npm test`.
- Ran `npm run build`.
- Ran repository-level emoji/replacement-character scan excluding generated dependencies and build output.

## Follow-Up

- Existing test output still includes React Router future-flag warnings and Recharts zero-dimension warnings in dashboard tests. These were pre-existing warnings and did not fail validation.

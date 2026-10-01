# Close-out Sidebar Nesting

Timestamp: Wednesday, September 30, 2026 — 13:11:02 +08:00

## What Changed

- Updated the frontend sidebar so Close-out history can render as a nested item under Close-out when both links are visible for the signed-in role.
- Made the `/closeout` sidebar link use exact route matching so it no longer remains highlighted on `/closeout/history`.
- Kept Close-out history flat for roles that can view history but cannot access the Close-out submit route.

## Why

The Close-out and Close-out history links were visually presented as sibling items, and route prefix matching caused both links to appear active on the history route.

## Validation

- Ran `npm run build`.
- Ran `npm test`.

## Follow-Up

- Existing test output still includes React Router future-flag warnings and Recharts zero-dimension warnings in dashboard tests. These warnings did not fail validation.

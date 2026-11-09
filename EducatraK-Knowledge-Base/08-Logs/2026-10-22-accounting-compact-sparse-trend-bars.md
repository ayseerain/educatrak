# Accounting Compact Sparse Trend Bars

**Timestamp:** Thursday, October 22, 2026 — 18:29:41 +08:00

- Capped the Accounting collection-trend bars at 24 pixels for the Today and Last 7 days filters.
- The chart container, axes, data, and later-range rendering remain unchanged; sparse ranges now use the same compact visual density as data-rich ranges.

## Validation

- Passed: `npm test -- --run src/test/dashboard.test.tsx` (21 tests).
- Passed: `npm run build`.

# Cash-Only Payment Method Update

**Timestamp:** Thursday, October 01, 2026 — 17:40:32 +08:00

## Summary

Updated the frontend and current requirements to make transactions cash-only. Removed bank deposit and check as active payment methods from the typed payment model, mock dashboard activity, payment dialogs, operational mock pages, report samples, and settings samples.

## Changes

- Narrowed the frontend `PaymentMethod` type to `cash`.
- Made dashboard recent activity and newly recorded mock payments use Cash only.
- Removed non-cash method options and reference-number entry from payment recording flows.
- Updated transaction history, daily report samples, and school settings samples to show Cash only.
- Updated tests to assert Bank deposit, Check, and GCash are not available as payment methods.
- Updated canonical project/requirements text that previously listed Cash, Check, and Bank deposit.

## Validation

- `npm run test -- --run` passed in `frontend/`.
- `npm run build` passed in `frontend/`.

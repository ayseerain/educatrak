# Role Page Visibility

**Timestamp:** Sunday, October 18, 2026 — 15:31:08 +08:00

## Changed

- Updated related-page tabs so each signed-in role sees only routes backed by one of its capabilities:
  - Cashiers no longer see the notification-log tab or close-out-history tab.
  - Accounting sees close-out history without the cashier-only close-out tab.
- Passed the authenticated user through the close-out and notification page tab controls.
- Extended navigation regression coverage to assert the exact primary navigation for all five mock account roles and to cover permission-filtered related tabs.

## Validation

- `frontend: npm test -- --run src/test/operations.test.tsx` passed: 25 tests.
- `frontend: npm test -- --run` passed: 58 tests.
- `frontend: npm run build` passed.

## Remaining Work

- Route guards and backend authorization remain the security boundary; these changes prevent inaccessible pages from appearing in the frontend navigation.

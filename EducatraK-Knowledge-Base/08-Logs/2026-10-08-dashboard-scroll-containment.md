# Dashboard Scroll Containment

**Timestamp:** Thursday, October 08, 2026 — 20:26:14 +08:00

## Summary

Contained the authenticated shell to the viewport so long dashboard content scrolls within the main content region instead of also creating a document-level scrollbar.

## Changes

- Anchored the shared shell to the viewport and constrained its overflow.
- Set explicit minimum-height constraints on the content column and main scroll region.

## Validation

- `npm test -- --run src/test/dashboard.test.tsx` passed (21 tests).
- `npm run build` passed.
- Browser verification on the Cashier dashboard confirmed the document no longer overflows vertically while the main region remains scrollable.

## Notes

No dashboard content, navigation, or role-specific behavior changed.

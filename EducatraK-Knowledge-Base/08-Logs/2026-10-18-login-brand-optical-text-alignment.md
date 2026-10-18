# Login Brand Optical Text Alignment

Timestamp: Sunday, October 18, 2026 — 16:38:58 +08:00

## What Changed

- Added a 2px left inset to the login tagline in desktop and compact lockups.

## Why

The wordmark and tagline had a shared box edge but their glyphs appeared misaligned. The small optical adjustment aligns their visible left edges.

## Validation

- Rendered the login page at a 1440 by 900 desktop viewport and visually confirmed the lockup alignment.
- Ran `npm test -- --run src/test/login.test.tsx` successfully (12 tests).
- Ran `npm run build` successfully.

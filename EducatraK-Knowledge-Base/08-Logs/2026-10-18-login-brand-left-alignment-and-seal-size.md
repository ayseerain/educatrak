# Login Brand Left Alignment and Seal Size

Timestamp: Sunday, October 18, 2026 — 16:36:29 +08:00

## What Changed

- Made the desktop login lockup's left text alignment explicit so the EducaTrak wordmark and its tagline share the same starting edge.
- Increased the Mendez Christian Academy seal from 72px to 80px in desktop and compact login headers.

## Why

The brand lockup needed a clearly shared left edge for its two text lines and a slightly more prominent academy seal.

## Validation

- Ran `npm test -- --run src/test/login.test.tsx` successfully (12 tests).
- Ran `npm run build` successfully.

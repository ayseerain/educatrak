# Testing and Definition of Done

> Source-derived testing, build-order, and completion requirements extracted from the canonical Project Specification.

## 29. Testing Requirements and Definition of Done

### 29.1 Build order
1. **Foundation:** project setup, Tailwind tokens, Shell layout, routing, auth + `can()`, i18n file, API types, mock adapter with seed data, `money.ts` / `dates.ts` / `schedule.ts` with unit tests.
2. **Must, part 1:** M1 (auth, users), M2 (students), M9 (settings), M3 (accounts).
3. **Must, part 2:** M4 + M5 (payments, receipts, voids), M6 (notifications), M7 (reports), M8 (audit, backup).
4. **Should:** M11 (installments follow-up), M12 (import).
5. **Could:** M13 (close-out), M14 (PDF receipt).
6. **Hardening:** accessibility pass, print styles check, performance check on a throttled CPU, E2E suite for F1–F8, README.

### 29.2 A screen is done when
- It matches its row in Section 23 (route, roles, contents) and uses `can()` for guards and actions.
- Loading, empty, error, and permission-denied states exist.
- Forms use React Hook Form + Zod with messages that follow Section 4.
- It works at 1366×768 without horizontal scrolling of the page.
- Keyboard-only use works; focus is visible; contrast is AA.
- Print views print cleanly (checked with the browser's print preview).
- No hard-coded school policy, no external network requests, no `console` errors.
- Pure logic (money, allocation, and billing status in the mock) has unit tests; the relevant flow in Section 23.3 has a Playwright test.

### 29.3 Deliverables
- Working app in `mock` mode with `npm run dev`; `npm run build`, `npm run test`, `npm run e2e` all pass.
- `README.md` (setup, modes, seed logins, folder guide), `DECISIONS.md` (every assumption), and a short `HANDOFF-TO-BACKEND.md` listing any API needs the UI discovered that are not in Section 28.2.

---

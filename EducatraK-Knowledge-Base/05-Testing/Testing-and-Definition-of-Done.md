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

### 29.4 Local performance benchmark (SRS v3.0, proposed targets)

Source: `06-Decisions/2026-11-22-srs-v3-policy-confirmations.md`, owner answer 6. These are proposed local-deployment targets, not service-level guarantees. **No measurement has been run yet.**

| Operation | Proposed p95 | Measured p95 | Samples | Result |
| --- | ---: | ---: | ---: | --- |
| Page navigation, student search, account retrieval | ≤ 2 s | — | — | Not measured |
| Payment confirmation and committed receipt creation | ≤ 3 s | — | — | Not measured |
| Login and initial application navigation | ≤ 5 s | — | — | Not measured |
| Daily, outstanding-balance and statement reports | ≤ 5 s | — | — | Not measured |
| Monthly financial report | ≤ 10 s | — | — | Not implemented |

Method:
- Use a disposable MySQL database and synthetic data only. Never benchmark the live database or real records.
- Fixture: about 1,000 fictional students with realistic accounts, installments and payments, plus six fictional staff accounts. Record the exact counts.
- Record CPU, RAM, storage, OS, PHP and MySQL versions, browser, dataset size, sample count, cold and warm runs, p50/p95, errors and outliers.
- Measure API/server time separately from the user-visible workflow.
- Report unimplemented operations as unavailable, not as zero.
- Never weaken locking, validation, authorization or audit logging to meet a target.
- Revisit the targets after measuring on the actual office computer.

### 29.5 User acceptance testing (SRS v3.0)

Source: owner answer 7. UAT is role-based and evidence-backed. Automated tests, MockDB screens and API tests never substitute for it. Keep MockDB, API, MySQL integration and human UAT results separate.

**Participants:** school-designated Administrator, Cashier, Accounting Officer, Registrar and school-management representatives; Project Supervisor Coleen Creus; project team representatives for facilitation, technical support and defect recording. Representative names, dates and the sign-off instrument are pending.

**Scenarios:**

1. Super Admin creates or promotes an Accounting Officer; Administrator is denied.
2. Registrar manages student and guardian records, including the shared-contact confirmation and primary-replacement safeguards.
3. Cashier creates an account, records a payment, prints and reprints the Acknowledgment Receipt, and records an adjustment.
4. Accounting manages fees and plans, approves or rejects voids, reviews reports and signs off a close-out.
5. Cashier uploads and maps an opening-balance CSV and submits it; a different Accounting user reviews row findings, rejects it or records the eligible rows. Recording is blocked while the cutover date is pending and is storage-only until the posting mapping is approved.
6. Administrator runs a manual backup and checks backup history; an isolated restore test is witnessed separately.
7. Auditor reviews allowed audit evidence only.
8. Negative cases: denied roles, invalid amounts, duplicate payment protection, failed imports, unavailable features, no data leakage.
9. Privacy, recovery, printing, responsiveness and performance checks.

**Record per row:** scenario, tester role, expected result, actual result, evidence reference, defect/retest number, pass/fail, evaluator name, date, signature/approval.

| # | Scenario | Tester role | Expected | Actual | Evidence | Defect/retest | Pass/fail | Evaluator | Date | Signature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | | | |

---

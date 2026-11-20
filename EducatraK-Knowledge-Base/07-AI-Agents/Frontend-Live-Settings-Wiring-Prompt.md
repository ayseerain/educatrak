# Frontend live settings wiring — agent prompt

**Status:** Prepared, not run. Saved Friday, November 20, 2026 — 14:12:14 +08:00. Target agent: Claude Code. Owner choices: phased with an owner gate after each workstream; reuse existing components and skills only; mock mode unchanged.

Paste everything below the line into a new session.

---

**Task: connect the live frontend to the W1a–W2 backend routes (settings + account creation).**

**Branch.** Start from `main` after `feature/mysql-validation` is merged. Create `feature/frontend-live-settings`. Do not push.

**Read first, in order.** Do not open files you don't need.
1. `CLAUDE.md` (root) and `frontend/AGENTS.md` if present.
2. `EducatraK-Knowledge-Base/07-AI-Agents/Frontend-Build-and-Audit-Manual.md`, plus any active frontend ledger's Build/Audit checkboxes and Resume Notes.
3. `EducatraK-Knowledge-Base/02-Architecture/Backend-API-Contract.md` rows 52–72. This is the source of truth for request and response shapes; verify each one against the controller before coding.
4. `EducatraK-Knowledge-Base/06-Decisions/Open-Decisions.md` §31.10 (owner decisions 1–4 and follow-up answers).
5. `EducatraK-Knowledge-Base/03-Design/UX-and-Design-System.md`.
6. `.agents/skills/`: read only names and descriptions, then the `SKILL.md` of each skill the screen needs (likely modal, input, table, date-range, dropdown, page-header, interactive-states).
7. The latest entries in `08-Logs/Agent Sessions/changelogs.md` and `Issues-and-TODOs.md`.

**Existing pattern to follow. Do not invent a new one.**
- Live/mock switch: `isLiveCashierApiEnabled()` (`frontend/src/api/cashierApi.ts`). Add a live branch at the top of the existing page component, like `AccountDetailPage` → `LiveBillingAccountDetail` and `SettingsPage` → `LiveFinanceSettingsPage` in `frontend/src/features/operations/OperationalPages.tsx`.
- HTTP: the `request()` helper from `@/api/cashierApi`, called from a typed feature API module (model it on `frontend/src/api/financeSettingsApi.ts`). Use React Query with keys like `["finance-settings", "plans"]` and invalidate after mutations.
- Live page components live under `frontend/src/features/<area>/Live*.tsx`. Tests go in `frontend/src/test/live*.test.tsx`; model them on `liveFinanceSettings.test.tsx` and `liveBillingAccounts.test.tsx`.
- Permissions: `can(user, ...)` from `frontend/src/lib/permissions.ts`. These checks are UX only; the backend enforces access. Write controls follow `settings.system.manage`, `settings.finance.manage` and `accounts.manage`. Read-only roles see data with no dead controls.

**Hard constraints.**
- Mock mode is unchanged: no edits to `frontend/src/api/mock/*`, `mock-db.json` or mock page behavior.
- No backend changes. If a contract gap blocks a screen, stop that item, record it in `Issues-and-TODOs.md`, and ask.
- Money is integer centavos end to end. Format only at display, with the existing formatter. Percent down payments are basis points (10000 = 100%).
- Dates are `Asia/Manila`, sent as `Y-m-d`.
- Show the server's 422 field errors inline. Show 409s (for example "already inactive", "no current year", "dates locked") as clear messages. Never swallow an error.
- Build each new interaction from existing shared components and `educatrak-*` skills. Add no new visual rules. If a skill doesn't cover something, flag it and ask; don't improvise.
- Never build these unapproved items: send-test-email, payment-method management, deleting school years or plans.
- Use fictional data only in tests.

**Workstreams.** Do them in this order, one at a time. Each needs owner acceptance before the next.

**F1. Receipt and Email tabs → `GET/PATCH /api/settings/system` (rows 69–70).**
- Administrator edits: school name/address, receipt title (enum), paper size, sender name/address, daily limit. Accounting gets a read-only view.
- The next receipt number is display only.
- The School tab's name/address fields come from the same endpoint. Keep the remaining School-tab rows for F2.
- Send a partial PATCH with only the changed fields.

**F2. School tab → school structure (rows 52–64).**
- School years: list, create, edit label. Start/end dates show read-only with a reason when `datesLocked`.
- Make current: a modal with a required 10–1000 character reason. Show the 409 message when the server refuses.
- Terms and exam periods per year. Grade levels and sections, with active/inactive.
- No delete controls anywhere.

**F3. Plans tab → create/revise/deactivate/preview (rows 65–68).**
- Extend `LiveFinanceSettingsPage` "plans" for `settings.finance.manage`.
- Create form: name, down payment type (amount in centavos, or percent in basis points), installment rows with `due_day_offset` and `percent_of_remaining_basis_points`.
- Revise: explain that saving creates version N+1 for new accounts only, and that existing accounts keep their version. Show the version number and lineage.
- Deactivate: confirm first; show the 409.
- Preview: enter a total, render the returned schedule rows.

**F4. Cashier account wizard `/accounts/new` → `POST /api/billing-accounts/preview` and `POST /api/billing-accounts` (rows 71–72).**
- Add a live branch to `AccountWizardPage`. Use the current school year only, the student's grade-level fee schedule, optional-fee removal only, and a chosen active plan.
- Preview before create, then create.
- Show the 422s inline: duplicate account for the student/year, no single active fee schedule, required fee removed.
- On success, navigate to `/accounts/:id`.
- Leave the wizard's mock path and its renewal mode alone. If live renewal is unspecified, record it as a question.

**Per-workstream gate.** Do every step; skip none.
1. Write a short plan (files, components reused, test cases) before coding.
2. Add focused tests in `frontend/src/test/live*.test.tsx`:
   - The happy path.
   - A 422 and a 409.
   - Read-only roles see no write controls.
   - Mock mode still renders the old page.
3. Run from `frontend/`: `npm test -- --run <focused files>`, then `npm test -- --run`, then `npm run build`. Report the exact counts.
4. Check the rendered UI against the live backend with fictional data:
   - Set up an isolated SQLite DB or the disposable MySQL from `Target-MySQL-Validation-Runbook.md`, with fictional data only.
   - Set `VITE_DATA_SOURCE=live`.
   - Check light and dark themes, desktop and phone widths, keyboard use, focus, and empty/loading/error states.
   - If you cannot run the UI, say so. Don't claim it.
5. Run `git diff --check` and confirm there is no `backend/` or `src/api/mock/` diff.
6. Records:
   - Add an entry to `changelogs.md` and a session log under `08-Logs/`. Update `Issues-and-TODOs.md`.
   - Add a Resume block to the frontend manual or ledger.
   - If a skill changed, state old → new rule.
   - Real system-clock timestamps for every entry (`date '+%A, %B %d, %Y — %H:%M:%S %:z'`).
7. Commit locally, then stop and report: what was built, test and build counts, what you verified in the browser and what you couldn't, and open questions. Wait for acceptance.

**Out of scope:** backend changes, mock parity, student/ledger import, payment methods, test email, B13 deployment, Pint or format sweeps.

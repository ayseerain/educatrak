# Frontend live settings — F2 School tab (school structure)

**Logged:** Friday, November 20, 2026 — 15:49:17 +08:00
**Agent:** Claude Code
**Branch:** `feature/frontend-live-settings` after F1 commit `114348c`. The owner accepted F1 at the start of this session.
**Prompt:** `07-AI-Agents/Frontend-Live-Settings-Wiring-Prompt.md`, workstream F2.

## What changed

- `frontend/src/api/schoolStructureApi.ts` (new): typed list calls for school years and grade levels, plus create/update calls for years, make-current, terms, exam periods, grade levels and sections (API contract rows 52–64).
- `frontend/src/features/operations/LiveSchoolStructurePage.tsx` (new): the live School tab.
  - **School years:** one card per year with its dates and a Current badge. Admin actions: Edit, Add term and Make current. Each card has a terms table listing its exam periods, with Edit and Add exam period actions.
  - **Grade levels:** a table of grade levels and their sections. Admin actions: Edit and Add section; each section has its own Edit.
  - One shared Radix form dialog handles every create and edit. Edits send only changed fields. Disabled (locked) dates are never sent. 422s show under the field and focus it; 409s and other errors show as an alert in the dialog.
  - Make current needs a reason of 10–1000 characters, with a live character count.
  - Activating and deactivating happen through the Active checkbox in the edit dialog. There is no delete control.
- `LiveSystemSettingsPage.tsx`: the tab strip is extracted as an exported `SystemSettingsTabs` and reused on the School tab.
- `OperationalPages.tsx`: `SettingsPage` live mode now handles all five sections, so the unused `titles` map is removed. Mock mode is unchanged.
- `frontend/src/test/liveSchoolStructure.test.tsx` (new, 8 tests):
  - read-only view with no write or delete controls
  - add school year, with the list refetched
  - locked dates, with only the label PATCHed
  - make-current reason and the 409 message
  - a term added to a locked year sends no dates
  - grade-level 422 inline with focus
  - section deactivation sends `{active:false}`
  - mock mode unchanged

## Decisions within scope

- The mock School tab lists a "Payment method: Cash only" row. Live mode omits it because payment-method management is BLOCKED.
- Term and exam-period dates are not checked against the school-year range. This follows the backend; the [QUESTION] in the tracker is still open.
- Deactivating a grade or section has no separate confirmation step. It is a reversible checkbox inside the edit dialog, and the modal skill reserves confirmations for irreversible actions.

## Validation

- Focused: `npx vitest run src/test/liveSchoolStructure.test.tsx src/test/liveSystemSettings.test.tsx` passed 15/15.
- Full: `npx vitest run`: 39 files, 268 tests, 267 passed, 1 failed. The failure is the pre-existing `liveBillingAccounts.test.tsx:68`, already tracked.
- `npx tsc -b` was clean, and `npm run build` passed.
- **Live API shape check:** with the local SQLite backend and fictional seed data, logged in as `sample.accounting`. `GET /api/settings/school-years` and `GET /api/settings/grade-levels` returned the exact fields `schoolStructureApi.ts` expects. Reads only; the temporary server on port 8011 was stopped.
- **Not done:** the browser check, because no browser tool was available.
- No `backend/` or `src/api/mock/` diff.

## Next

Owner acceptance of F2, then F3 (Plans: create/revise/deactivate/preview).

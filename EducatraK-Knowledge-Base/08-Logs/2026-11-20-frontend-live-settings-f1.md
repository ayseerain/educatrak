# Frontend live settings — F1 Receipt and Email settings

**Logged:** Friday, November 20, 2026 — 15:17:20 +08:00
**Agent:** Claude Code
**Branch:** `feature/frontend-live-settings` from `main` at `4c9aeb4`.
**Prompt:** `07-AI-Agents/Frontend-Live-Settings-Wiring-Prompt.md`, workstream F1.

## What changed

- `frontend/src/api/systemSettingsApi.ts` (new): typed `getSystemSettings` and partial `updateSystemSettings` for API contract rows 69–70.
- `frontend/src/features/operations/LiveSystemSettingsPage.tsx` (new): the live Receipt and Email tabs. `PageHeader` + `ViewTabs` + a settings table, plus a Radix dialog form for `settings.system.manage`.
  - Only changed fields are sent. Blank optional text sends `null`.
  - 422 messages show under the matching field, with `aria-invalid`, and the first invalid field gets focus.
  - "No changes to save." shows when nothing changed.
  - Read-only roles see no edit control.
  - The next receipt number is display-only.
- `frontend/src/api/cashierApi.ts`: `CashierApiError` gains optional `fieldErrors` (the Laravel `errors` map). Existing callers are unaffected.
- `frontend/src/features/operations/OperationalPages.tsx`: `SettingsPage` live branch for `receipt` and `email`. The School tab stays unavailable until F2. Mock mode is unchanged.
- `frontend/src/test/liveSystemSettings.test.tsx` (new, 7 tests): read-only view, changed-fields PATCH, no-change guard, 422 inline + focus, no test-email/SMS rows, load error, mock mode unchanged.

## Decisions within scope

- School name/address sit on the **Receipt** tab, not the School tab. The frontend manual's B35 build scope assigns "School identity" to Receipt Settings, and the mock Receipt description says "Set school header". This differs from the prompt's F1 line, which placed them on the School tab.
- The mock Email tab lists SMS delivery, SMS load fee and test email. The live tab shows only the three API-backed fields. Test email is BLOCKED; SMS settings are not in the API.
- The prompt asks for a 409 test. These routes have no 409 response, so none was added.

## Validation

- Focused: `npx vitest run src/test/liveSystemSettings.test.tsx` passed 7/7.
- Full: `npx vitest run`: 38 files, 260 tests, 259 passed, 1 failed. The failure is `liveBillingAccounts.test.tsx:68`, which also fails with the F1 changes stashed (pre-existing; tracked).
- `npm run build` (`tsc -b && vite build`) passed after fixing two strict index-type errors in the new page.
- No `backend/` or `src/api/mock/` diff.
- **Not done:** browser check against a running backend. No browser tool was available (Playwright and Chrome DevTools MCP failed to connect). Tracked as [VERIFY].

## Next

Owner acceptance of F1, then F2 (School tab: school years, terms, exam periods, grade levels, sections).

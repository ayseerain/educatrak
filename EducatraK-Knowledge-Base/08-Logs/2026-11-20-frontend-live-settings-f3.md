# Frontend live settings — F3 Plans tab

**Logged:** Friday, November 20, 2026 — 15:57:31 +08:00
**Agent:** Claude Code
**Branch:** `feature/frontend-live-settings` after F2 commit `dde1f47`. The owner accepted F2 at the start of this session.
**Prompt:** `07-AI-Agents/Frontend-Live-Settings-Wiring-Prompt.md`, workstream F3.

## What changed

- `frontend/src/api/financeSettingsApi.ts`:
  - `FinancePaymentPlan` gains `version` and `previousVersionId`.
  - Adds `createFinancePaymentPlan`, `reviseFinancePaymentPlan`, `deactivateFinancePaymentPlan` and `previewFinancePaymentPlan` (API contract rows 65–68).
- `frontend/src/features/operations/LivePaymentPlans.tsx` (new):
  - **Plan cards** show the version, "replaces version N" / "superseded by version N+1", the down payment (pesos, or % of total) and the installments (due after N days, % share).
  - **Actions:** Preview for every viewer. Revise and Deactivate only on the active latest version.
  - **Plan form:** name; down payment type and value (pesos to centavos, or percent to basis points); installment rows with label, due days and share %. A running total checks that shares make exactly 100% before sending. Server 422 keys such as `installments.1.label` land on the matching row field and focus it. Revise explains that it creates version N+1 for new accounts and that existing accounts keep their version; the button reads "Save as version N+1".
  - **Deactivate:** a Radix confirmation ("Keep active" / destructive "Deactivate plan"), showing the 409 message.
  - **Preview:** a peso total sent as `total_cents`, with a schedule table and total.
- `LiveFinanceSettingsPage.tsx`: the old read-only plan cards are replaced by `LivePaymentPlans`, and the manager copy no longer says plan changes are unavailable.
- Tests:
  - `liveFinancePlans.test.tsx` (new, 9 tests).
  - `liveFinanceSettings.test.tsx`: one test updated from the old "not available yet" copy to the versioning copy.

## Decisions within scope

- Percent inputs are entered as percents (25, 33.33) and converted to basis points with Math.round(value x 100). The values shown are basis points divided by 100.
- Deactivation uses a Radix dialog, per the modal skill. The fee-item Deactivate on the same page still uses window.confirm; that is pre-existing and was not changed.

## Validation

- Focused: `npx vitest run src/test/liveFinancePlans.test.tsx src/test/liveFinanceSettings.test.tsx` passed 14/14.
- Full: 40 files, 277 tests, 276 passed, 1 failed. The failure is the pre-existing `liveBillingAccounts.test.tsx:68`.
- `npx tsc -b` was clean, and `npm run build` passed.
- **Live check:** against the local SQLite backend as `sample.accounting`. `GET /api/settings/finance/plans` matched the type. `POST .../plans/1/preview` returned a 422 `total_cents` message because the demo plan has no installment steps; the dialog shows that message. Logged as [DATA]. The temporary server was stopped.
- **Not done:** the browser check. No `backend/` or `src/api/mock/` diff.

## Next

Owner acceptance of F3, then F4 (Cashier account wizard).

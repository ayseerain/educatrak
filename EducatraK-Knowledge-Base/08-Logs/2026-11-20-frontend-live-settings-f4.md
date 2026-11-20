# Frontend live settings — F4 Cashier account wizard

**Logged:** Friday, November 20, 2026 — 22:41:58 +08:00
**Agent:** Claude Code
**Branch:** `feature/frontend-live-settings` after F3 commit `8872b2c`. The owner accepted F3 at the start of this session.
**Prompt:** `07-AI-Agents/Frontend-Live-Settings-Wiring-Prompt.md`, workstream F4.

## Contract gap and owner decision

- **Gap.** The Cashier has `accounts.manage` but neither `settings.finance.view` nor `settings.system.view`. No Cashier-readable route returned active plans or the current school year, so a live wizard could not fill its plan choice or school year.
- **Decision.** The prompt forbids backend changes, so the work stopped and the owner was asked. The owner chose a narrow read-only endpoint over granting broader settings capabilities.
- **Backend commit `79b1ffb`:** `GET /api/billing-accounts/creation-options` (`accounts.manage`).
  - It returns `currentSchoolYear` (null unless exactly one year is current) and the active `paymentPlans` with their installments.
  - Test: `BillingAccountCreationTest::test_creation_options_list_the_current_year_and_only_active_plans`. The role-denial test also covers the new route.
  - API contract row 73 was added. 73 API routes.

## Frontend changes

- `frontend/src/api/accountCreationApi.ts` (new): `getAccountCreationOptions`, `previewBillingAccount`, `createBillingAccount`.
- `frontend/src/features/billing/LiveAccountWizardPage.tsx` (new). One page in four numbered sections:
  1. **School year and student.** The current school year is shown read-only, or a blocking message appears when none is current. The student is found by searching name or LRN through `/api/payment-students`.
  2. **Plan.** Chosen from the active plans, shown with name, version and down payment.
  3. **Fees and schedule.** The unfiltered preview lists every active fee. Required fees are locked; optional fees can be unticked, which re-runs the preview with `excluded_fee_item_ids`. The schedule table shows the total due.
  4. **Review.** A confirmation checkbox repeats the student, year and total. "Create account" posts, then opens `/accounts/:id`. Server 422s from preview or create show as alerts.
- `OperationalPages.tsx`: `AccountWizardPage` renders `LiveAccountWizardPage` in live mode. The mock wizard moved, unchanged, into `MockAccountWizardPage`.
- `frontend/src/test/liveAccountWizard.test.tsx` (new, 6 tests):
  - preview, remove an optional fee, re-preview, confirm, create and navigate
  - duplicate-account 422
  - missing fee schedule 422
  - no current year
  - create rejected
  - mock mode unchanged

## Decisions within scope

- The wizard is a single page with numbered sections, not the mock's four-step stepper. Server preview drives every number shown.
- The prompt asks for a 409 test. Account creation has no 409 response; the duplicate case is a 422 and is tested.
- Live renewal mode and `?student=` prefill are not built. Logged as a [QUESTION].
- Student search reuses the live payment page's pattern because `StudentSearchField` is mock-bound. Logged as a [UX] gap against `educatrak-combobox-patterns`.

## Validation

- Backend:
  - `php artisan test --compact` (isolated SQLite `:memory:`): 201 tests, 199 passed, 2 skipped, 1,673 assertions.
  - Focused `BillingAccountCreationTest`: 9/9.
  - Pint passed on the changed files.
- Frontend:
  - Focused `liveAccountWizard`: 6/6. With the mock wizard suites: 75/75.
  - Full: 41 files, 283 tests, 282 passed, 1 failed. The failure is the pre-existing `liveBillingAccounts.test.tsx:68`.
  - `npm run build` passed after removing two unused test imports.
- **Live check:** against the local SQLite backend as `sample.cashier`. Creation options returned the current year and the demo plan. Student search returned the fictional student. Preview for a student who already has an account returned the expected 422. Reads and preview only; nothing was created. The temporary server was stopped.
- **Not done:** the browser check.

## Next

Owner acceptance of F4. That completes the four workstreams in the prompt.

# Live settings browser QA (F1-F4) - incomplete environment-gated pass

**Logged:** Saturday, November 21, 2026 — 16:20:45 +08:00

**Branch:** `feature/live-settings-browser-qa`, created from `feature/frontend-live-settings` at `28f24cc`.

## Environment and evidence

- Live frontend started with `VITE_DATA_SOURCE=live` at `http://localhost:5173`.
- Chrome 158.0.8127.37 rendered the reachable error state without a backend at desktop and 375px phone widths. The phone DOM reported `scrollWidth: 375` and `clientWidth: 375`; no page-level horizontal scroll was observed in that state.
- Temporary, fictional-data-free screenshot evidence is held locally only at `C:\Temp\educatrak-live-settings-desktop-login.png` and `C:\Temp\educatrak-live-settings-mobile-login.png`.
- This checkout has no `php` or `composer` executable, and `backend/vendor/autoload.php` is absent. Laravel could not be installed, migrated, seeded, or served. No login is possible; do not treat this as live F1-F4 acceptance.

## Checks

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| F1 Receipt and Email authenticated light/dark, desktop/phone, keyboard, read-only, partial PATCH, loading/empty/error | Not run | Laravel unavailable. |
| F2 School authenticated happy path, roles, validation focus, responsive states | Not run | Laravel unavailable. |
| F3 Plans authenticated happy path, roles, preview/version/deactivate, responsive states | Not run | Laravel unavailable. |
| F4 New account UI-created fictional setup and create flow | Not run | Laravel unavailable. |
| Reachable live-frontend error state at 375px | Pass | Chrome screenshot and DOM width measurement; it is not an F1-F4 workflow check. |
| Pagination test diagnosis | Fail - page defect | `LiveBillingAccounts` passes `currentPage` as `lastPage`, disabling Next when more server pages exist. Tracked in `Issues-and-TODOs.md`; no fix made pending owner direction. |

## Validation performed

- `npm test -- --run src/test/liveSystemSettings.test.tsx src/test/liveSchoolStructure.test.tsx src/test/liveFinanceSettings.test.tsx src/test/liveFinancePlans.test.tsx src/test/liveAccountWizard.test.tsx`: passed - 5 files, 35 tests.
- Backend validation: not run; PHP/Composer and `vendor/` are unavailable.
- Full frontend suite and build: not run because the task gate directs a stop-and-ask when the page (rather than its test) is stale.
- Updated: Saturday, November 21, 2026 — 16:21:53 +08:00. `git diff --check` passed; the working-tree file list has no `frontend/src/api/mock/` path.

## Follow-up

Provide a PHP/Composer-enabled local environment or authorize installation of that tooling, then rerun the complete authenticated F1-F4 browser matrix. Separately authorize the smallest fix for `LiveBillingAccounts` pagination before changing the page or its test.

## Updated blocker

**Saturday, November 21, 2026 — 16:43:12 +08:00.** PHP, Composer, dependencies, migrations, and the fictional demo seed are now available. A real Chrome sign-in as `sample.admin` sets the local session and CSRF cookies, but `/api/auth/me` still returns 401. The cause is confirmed: `bootstrap/app.php` enables Sanctum's `statefulApi()` middleware, while there is no `config/sanctum.php`; Sanctum's stateful-domain list is consequently empty and it does not activate session authentication for `localhost:5173`. The required fix is a backend configuration change, which is outside the task's existing backend-change authorization. No application code was changed.

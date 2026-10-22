# EducatraK — Interaction-Based UI/UX Audit

**Audit date:** Friday, October 09, 2026 — 05:52:13 UTC+08:00  
**Target:** local Vite frontend at `http://127.0.0.1:5173`  
**Method:** Playwright with Chromium and `@axe-core/playwright`; browser scripts and screenshots are deliberately outside the repository in `D:\school\SEII\development\audit-tools`.

## Coverage

- Exercised the 36 authenticated routes in the documented inventory through the five mock roles: Administrator, Cashier, Accounting Officer, Auditor, and Registrar. Each route/role combination was traversed in the live frontend; allowed screens were checked at 1440px, 1280×720, 1024px, and 375px.
- Rechecked protected-route behavior in a separate 180-visit role/route matrix. All tested denials rendered the in-place **Access denied** screen; no protected route was exposed to a disallowed mock role. Registrar student and clearance screens showed no currency, balance reason, or guardian-contact text in this pass.
- Checked `/login`, `/403`, and `/404` at the four widths. `/first-login` correctly requires an authenticated, forced-password-change session, which the current mock login flow does not provide.
- Ran axe on the role dashboard, Students, Record Payment, Clearance, Reports, and User Administration surfaces. The audit also exercised the documented payment, account-creation, void, follow-up, close-out, import, and user-creation flows.

The original Frontend Build-and-Audit manual's audit checkboxes were already unchecked and remain so. This audit does not mark its formal phase complete.

## Findings

### IUX-01 — Mobile shell clips application content

- **Severity:** Broken
- **Screen / role / width:** Every authenticated-shell screen; Cashier evidence on `/students` at 375px.
- **Steps:** Sign in as any role, set the viewport to 375px, and open any shell route such as `/students`.
- **Observed:** The fixed shell enforces a `min-w-[1024px]`; at a 375px viewport the rendered main area measured 800px wide and is clipped by the shell. The sidebar is not replaced by mobile navigation, so content and navigation are not usable on the requested mobile width.
- **Expected:** Mobile has navigation and no clipped content; controls must remain usable at small widths. See the supplied audit scope's mobile checks and `03-Design/UX-and-Design-System.md` §5.8/§5.10.
- **Evidence:** `audit-tools/evidence-mobile-shell-375.png` (outside the repository).

### IUX-02 — Payment confirmation is not a dialog

- **Severity:** Broken
- **Screen / role / width:** `/payments/new?student=sample-1001`; Cashier; 1440px.
- **Steps:** Sign in as Cashier, open the preselected payment route, and click **Review payment**.
- **Observed:** **Confirm payment** renders inline with `role="status"`; no dialog is present. Focus cannot be trapped or returned, and Escape cannot dismiss it as a confirmation dialog.
- **Expected:** Payment submission opens a confirmation dialog that repeats the student, amount, method, and resulting balance. See F1 step 6 in `01-Requirements/Screens-Routes-and-Flows.md` and `03-Design/UX-and-Design-System.md` §4/§5.12.
- **Evidence:** `audit-tools/evidence-payment-inline-confirmation.png` (outside the repository).

### IUX-03 — Billing-account creation ends without creating or navigating

- **Severity:** Broken
- **Screen / role / width:** `/accounts/new`; Cashier; 1440px.
- **Steps:** Sign in as Cashier, open **Create billing account**, continue to step 4, then click **Create account**.
- **Observed:** No visible state or URL changes; the user remains on `/accounts/new`.
- **Expected:** The account is created after review and the user reaches account detail with **Record down payment**. See F2 in `01-Requirements/Screens-Routes-and-Flows.md`.

### IUX-04 — Accounting cannot approve or reject void requests

- **Severity:** Broken
- **Screen / role / width:** `/voids`; Accounting Officer; 1440px.
- **Steps:** Sign in as Accounting Officer and open the void queue.
- **Observed:** The row says **Approve or reject**, but the page contains no action control for either outcome.
- **Expected:** Accounting can approve or reject with a note; approval updates the payment/balance and creates an audit entry. See F3 in `01-Requirements/Screens-Routes-and-Flows.md` and M5 in `01-Requirements/Modules-and-Features.md`.
- **Evidence:** `audit-tools/evidence-void-queue-no-actions.png` (outside the repository).

### IUX-05 — Follow-up send flow has no review, completion feedback, or print list

- **Severity:** Broken
- **Screen / role / width:** `/followup`; Cashier; 1440px.
- **Steps:** Sign in as Cashier, select all listed accounts, click **Send reminder emails**.
- **Observed:** No review dialog, recipient/missing-email warning, message preview, success feedback, or changed row state appears. The documented **Print list** action is absent.
- **Expected:** A permitted batch follows review → confirm → “Reminder sent today,” with print list available. See F5 in `01-Requirements/Screens-Routes-and-Flows.md`.

### IUX-06 — Close-out cannot be reviewed, confirmed, locked, or printed

- **Severity:** Broken
- **Screen / role / width:** `/closeout`; Cashier; 1440px.
- **Steps:** Sign in as Cashier, enter `1250` in **Counted cash**, then click **Review close-out**.
- **Observed:** The button produces no visible change. No confirmation dialog, lock state, or printable summary is available.
- **Expected:** A cashier can review and confirm close-out, after which the day locks and a printable summary opens. See F6 in `01-Requirements/Screens-Routes-and-Flows.md`.
- **Evidence:** `audit-tools/evidence-closeout-inert.png` (outside the repository).

### IUX-07 — Import commit lacks confirmation and the error report does not download

- **Severity:** Broken
- **Screen / role / width:** `/import`; Cashier; 1440px.
- **Steps:** Sign in as Cashier; continue through upload, mapping, and preview; click **Confirm valid rows**; then click **Download error report**.
- **Observed:** There is no final confirmation dialog or acknowledgement before the result state. Clicking **Download error report** emits no browser download.
- **Expected:** A final confirmation precedes saving, then the result contains a downloadable error report. See F7 in `01-Requirements/Screens-Routes-and-Flows.md`.

### IUX-08 — User administration cannot start user creation

- **Severity:** Broken
- **Screen / role / width:** `/admin/users`; Administrator; 1440px.
- **Steps:** Sign in as Administrator and click **Create user**.
- **Observed:** The page does not change and no creation flow opens.
- **Expected:** F8 begins with an administrator creating a user and issuing a temporary password. See F8 in `01-Requirements/Screens-Routes-and-Flows.md` and M1 in `01-Requirements/Modules-and-Features.md`.

### IUX-09 — Header targets do not meet the 44px minimum

- **Severity:** Inconsistent
- **Screen / role / width:** All authenticated-shell screens; all roles; most visible at 375px.
- **Steps:** Sign in and inspect the global search input and **Preview role** selector.
- **Observed:** Both controls render at 36px tall. Some table/status filter controls are also 32px tall.
- **Expected:** Buttons and controls are at least 44px tall. See `03-Design/UX-and-Design-System.md` §4 and §5.6.

### IUX-10 — Rendered color contrast fails axe checks

- **Severity:** Inconsistent
- **Screen / role / width:** Dashboard, Students, Record Payment, Clearance, Reports, and User Administration; tested roles; 1440px.
- **Steps:** Run axe against the rendered screens.
- **Observed:** axe reports serious `color-contrast` violations: white `EK` branding on `#039935` (3.74:1), warning/error amounts and status badge text on light fills (4.21–4.33:1).
- **Expected:** WCAG AA contrast; the design system specifically restricts white text on `brand-green` and requires semantic-state readability. See `03-Design/UX-and-Design-System.md` §5.3–§5.5.

### IUX-11 — Payment heading level skips from page h1 to h3

- **Severity:** Inconsistent
- **Screen / role / width:** `/payments/new`; Cashier; 1440px.
- **Steps:** Run axe after opening Record Payment.
- **Observed:** `Record payment` is an `h3` with no preceding `h2`; axe reports `heading-order` (moderate impact).
- **Expected:** Logical heading order. See the supplied audit scope's accessibility checks and `03-Design/UX-and-Design-System.md` §4.

## Verified non-findings

- The five-role protected-route matrix produced no authorization mismatch under the mock session model: disallowed pages rendered **Access denied** rather than their protected content.
- In the tested Registrar list, profile, and clearance pages, no currency amounts, balance reasons, or guardian contact text was exposed.
- No horizontal document scroll was detected at 1440px, 1280px, 1024px, or 375px. This does not clear the mobile shell: its fixed overflow clips the 800px main content rather than creating document scroll.

## Outcome and decisions

- **Issues by severity:** 8 Broken, 3 Inconsistent, 0 Redundant, 0 Cosmetic, 0 Judgment call.
- **Fixed:** 0. **Logged:** 11. No application files were changed because the frontend already had uncommitted implementation changes outside this audit scope.
- **Owner decisions needed:** None. All findings above are direct violations of existing documented requirements; no product or visual judgment call was made.

## Changelog

- 2026-10-09: Added live-browser interaction audit findings, evidence locations, role/privacy verification, and validation outcome.

## Re-verification — Monday, October 19, 2026

**Method:** Fresh Chromium/Playwright runs against `http://localhost:5173`, with `@axe-core/playwright`. Audit scripts and their result JSON remain outside the repository in `D:\school\SEII\development\audit-tools`.

**Coverage:** Revisited all 45 currently reachable authenticated route/role combinations at 1440px, 1280×720, 1024px, and 375px; checked public routes at the same widths; tested direct URLs across all five mock roles; and rechecked Registrar privacy. The direct-URL matrix and Registrar privacy checks passed. No mobile shell clipping remained after remediation.

### Disposition of prior findings

- **Fixed and browser-retested:** IUX-01 through IUX-06, IUX-08 through IUX-11. Payment, void, reminder, close-out, and user-creation actions now present keyboard-dismissible confirmation dialogs or visible completion feedback; account creation navigates to its mock account detail; responsive navigation renders without the former 1024px mobile shell; controls meet the 44px floor; payment headings are sequential; and the post-fix targeted axe scans have no violations.
- **Still unresolved — IUX-07 / IUX-12:** The canonical route inventory assigns `/import` to Cashier (`import.run`), but the current exclusive-role capability matrix denies that route to every mock role. The October 18 exclusive-role audit explicitly says Cashier import access was removed. This conflicts with `01-Requirements/Screens-Routes-and-Flows.md` and blocks a truthful re-test or frontend-only repair of the import confirmation/download flow. Per the source hierarchy, this needs an approved requirements reconciliation before implementation.

### Decision required

1. Reconcile the canonical `import.run` route/role requirement with the exclusive-role access model, then either restore an authorized import workflow or formally remove the route and its F7 flow from the inventory.

**Re-verification outcome:** 10 findings fixed, 1 logged for a source conflict, no new privacy or direct-route authorization exposure found.

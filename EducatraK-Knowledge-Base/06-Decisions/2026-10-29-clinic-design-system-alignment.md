# Implementation Decision — Align EducatraK's UI with CLINIQ's Design System

Recorded: Thursday, October 29, 2026 — 03:03:41 +08:00

## Decision

EducatraK's signed-in interface follows the design system of CLINIQ (the clinic system built for the same client, Mendez Christian Academy), so the school's two systems look like one family. Only design and shared components change; content, wording, routes, roles, business rules, and data stay the same. The work lives on branch `revamp/frontend-ui-design-system`.

Choices made by the project owner when the work was scoped:

1. **Sizing (hybrid).** Body text follows CLINIQ: 14px (`text-sm`) on `<body>`. Buttons, inputs, and dropdown triggers keep EducatraK's **44px minimum** (`min-h-control` / `h-11`). This replaces Section 4's "base font 16px; body text never smaller than 14px" with "body text 14px; never smaller than 12px for supporting text; controls at least 44px tall".
2. **Font.** EducatraK keeps `"Segoe UI", system-ui, sans-serif`. CLINIQ's Inter is not adopted, so no font dependency is added.
3. **Top bar.** The shell gets CLINIQ's top bar with the live date and time. **Revised Thursday, October 29, 2026 — 03:36:06 +08:00:** the project owner asked that the signed-in account stay in the sidebar, not the top bar, so the user chip (opens the profile) and the sign-out icon live in the sidebar footer with the development role preview.
4. **Loading.** Page loads show skeletons shaped like the loaded screen (CLINIQ pattern) instead of a spinner.
5. **Sign-in screens excluded.** Login, First Login, and the session-expiry warning keep their independent design. Because the shared tokens changed, Login and First Login are wrapped in `data-auth-screen` (`frontend/src/App.tsx`), which pins the pre-alignment token values in `frontend/src/index.css`.
6. **Printouts excluded.** Receipts, reports, and permits keep their print styles.

Token changes (`frontend/tailwind.config.ts`): `surface` `#FAFAFA` → `#F5F5F5` (the value the design spec already stated); radius `sm` 6px / `md` 8px / `lg` 12px; `shadow-card` and a new `shadow-raised` (CLINIQ values); type scale `xl` 22px and `2xl` 28px, with line heights. Brand and semantic colors were already identical and are unchanged; light tints now use token opacity (`bg-status-success/10`) instead of raw hex.

Follow-up (Thursday, October 29, 2026 — 03:36:06 +08:00): dashboard widgets moved to CLINIQ's stat card, card header and list rows (status badges instead of tinted icon tiles, plain amounts with no background, no accent stripes or tinted panels); view switchers became one shared `ViewTabs` strip; dropdown panels are never narrower than their trigger; sidebar spacing follows CLINIQ's values; page content padding is CLINIQ's `px-8 py-6`.

Follow-up (Thursday, October 29, 2026 — 11:38:35 +08:00): search and filters sit inside each table's card; every data column is sortable; screen and role switches show a short skeleton and fade in; view tabs slide and fade (CLINIQ list cards, sortable `DataTable`, and route skeletons).

Component conventions adopted from CLINIQ: primary button `brand-green-dark` with `hover:brightness-125` and `shadow-raised`; secondary outline `brand-green`; cards are white with a soft shadow and no outline; soft status badges (10% tint, `text-primary` label, colored icon); compact tables with sentence-case semibold headers and no header fill; icon-free dropdown selection (`bg-surface` + weight + `brand-green-dark`); a quiet text Back control above a white page-header card; Previous/Next pagination; one modal surface.

## Rationale

Both systems serve the same school and staff on the same network. A consistent look reduces relearning and makes the two products recognizably the school's. The project owner asked for the UI and design to match CLINIQ without changing EducatraK's content.

## Canonical documents to update

`03-Design/UX-and-Design-System.md` is updated in the same change. The canonical Project Specification / Frontend Context Brief (Sections 4–5) still states the 16px base size and a `brand-green` primary button fill; it needs the same update by its owner.

## Evidence

- `frontend/tailwind.config.ts`, `frontend/src/index.css`, `frontend/src/components/ui/*`, `frontend/src/components/layout/*`.
- Project skills: `.agents/skills/educatrak-*` (adapted from CLINIQ's `.claude/skills/cliniq-*`).
- Session log: `08-Logs/2026-10-29-clinic-design-system-alignment.md`.

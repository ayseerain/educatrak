# CLINIQ Design Alignment — Owner Feedback Pass

**Timestamp:** Thursday, October 29, 2026 — 03:36:06 +08:00
**Agent:** Claude Code (Opus 5.5)
**Branch:** `revamp/frontend-ui-design-system` (not committed; the project owner commits)
**Follows:** `2026-10-29-clinic-design-system-alignment.md`

## Request

The project owner reviewed the first pass:

- "the widgets, it still implements its own design system";
- the close-out widget looked off;
- "Accounts needing attention": the icon styling, and the background color behind the amount (Cora Navarro);
- the dropdown panel "is shorter from the actual length of the drop down";
- on Follow-up, "the follow up button and notification log looks independent button … It should look related to each other since it's a tab switcher", and the same on Close-out;
- "the user login or user account should stay on sidebar, not on top bar";
- the sidebar spacing, "between the logo or the system name", should follow CLINIQ.

## What changed

- **Widgets.**
  - `DashboardStatCard` is now CLINIQ's stat card: semibold label, 32px tinted icon chip, 32px bold figure, and an underlined link at rest. The green top stripe and hover shadow are gone.
  - New `CardHeader` / `CardBody` in `Card.tsx`.
  - `AccountStatusOverview` is a CLINIQ list card: icon and title with a count badge, the name as the link with a chevron, a status badge, and a plain amount. The tinted icon tiles and the amount background are gone.
  - The Close-out widget is a plain card: header, status badge, help text, and a secondary "Review close-out" button. The tinted panel and left stripe are gone.
  - `DashboardWorkPanel`, `CollectionTrend`, and the Admin, Registrar, Staff-account and Audit preview widgets now use the CLINIQ card-header spacing and 16px titles, with plain icons instead of tiles.
  - Report links and `Metric` cards lost their accent stripes.
  - `Badge` now shows a tone icon by default; neutral badges stay text-only.
- **View tabs.** New `components/ui/ViewTabs.tsx` uses CLINIQ's tab strip (ARIA tabs, Arrow/Home/End). It now drives Follow-up / Notification log, Cashier close-out (live and mock), and Current / Archived users (live and mock).
- **Dropdowns.** `DropdownSelect` panels are now at least as wide as their trigger. The narrower `contentClassName` overrides were removed.
- **Sidebar.**
  - The account chip (opens the profile) and the red sign-out icon are back in the sidebar footer, with the role preview.
  - The top bar keeps only the live clock.
  - Spacing now uses CLINIQ's values: `pt-5 pb-2 px-4`, `gap-6` brand-to-nav, `pl-2` brand row, `gap-2.5` seal-to-wordmark, `gap-4` groups, `gap-1.5` links.
- **Spacing and type.**
  - Page content uses CLINIQ's `px-8 py-6` (`px-4` on phones).
  - In-card section titles are 16px semibold.
  - Inline links are underlined at rest.
  - The Close-out page's three inner boxes now share one bordered style.
  - The Registrar dashboard has a gap between its header and its search card.
- **Skills and docs.**
  - Updated skills: `educatrak-sidebar-patterns`, `educatrak-interactive-states` (links, list rows, widgets, view tabs), and `educatrak-dropdown-patterns` (panel width).
  - Updated `03-Design/UX-and-Design-System.md` 5.8a and the decision record (item 3 revised).
- **Tests.**
  - Follow-up and close-out view switches are now queried as `tab` with `aria-selected`, not `button` with `aria-pressed`.
  - The sidebar profile and sign-out assertions were restored.

## Validation performed

- `npx tsc --noEmit -p .` passed; `npm run build` passed.
- `npx vitest run`: 205 of 207 passed. The 2 failures are the pre-existing tracked ₱8,500.00 vs ₱12,500.00 fixture assertions in `operations.test.tsx`.
- Playwright-core with local Chromium (no Edge) at 1440px. Screens checked:
  - Cashier: dashboard, Follow-up, Close-out, Add student with the role-preview dropdown open.
  - Accounting dashboard.
  - Administrator: dashboard and Users.
  - Registrar dashboard.
  - Screenshots were kept outside the repository.

## Known issues / next steps

- Page content is still full-width. CLINIQ caps lists at 1200px and forms at 720px, centered. Not applied because it changes layout; it needs the owner's decision.
- Open tracker items from the first pass still apply: session-expiry dialog tokens, native date inputs, and the canonical spec update.

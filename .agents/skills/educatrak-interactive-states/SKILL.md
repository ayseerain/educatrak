---
name: educatrak-interactive-states
description: Apply whenever building or reviewing any EducatraK button, link, dropdown/select, icon action, or navigable list row/card. Ensures cursor states, hover feedback, focus rings, and dropdown styling are never left as unstyled defaults. Adapted from CLINIQ's cliniq-interactive-states (same school, shared design system).
---

# EducatraK Interactive States

EducatraK follows CLINIQ's design system for look and feel (see `EducatraK-Knowledge-Base/06-Decisions/2026-10-29-clinic-design-system-alignment.md`). This skill is the checkable version of that rule for anything a user can click.

## The rule, per element type

**Anything clickable gets `cursor-pointer`. Anything not clickable keeps the default cursor.** Disabled controls use `cursor-not-allowed` and `opacity-50`, never `pointer-events-none` (that hides their tooltip).

**Every interactive element needs a real hover color, not just a cursor change:**
- Primary buttons (`brand-green-dark` fill, white label) lighten slightly on hover (`hover:brightness-125`). Never put a white label on a `brand-green` fill: button labels are small text and that pairing is only 3.74:1.
- Secondary (outlined) buttons and neutral buttons pick up a `surface` background on hover.
- Destructive buttons (`status-error` fill) darken (`hover:brightness-90`).
- Icon-only actions change the icon's own color on hover. A red sign-out icon darkens (`hover:brightness-75`).
- Rows and cards that navigate get a subtle `surface` tint on hover, and the identifying text is a visible link at rest (touch users have no hover).
- Links get a color shift; do not underline them.

Use the shared `Button` (`frontend/src/components/ui/Button.tsx`) for buttons, and `buttonVariants({ variant })` from the same file for a router `<Link>` that must look like a button. Do not hand-write button class strings or raw hex hover colors on a page.

## Links, list rows, and widgets

- A link reads as a link at rest: `font-semibold text-brand-green-dark`, turning `brand-green` on hover. Don't rely on hover alone (touch users have none).
- In a list card, link only the identifying text (the student name) and add a small `ChevronRight`; amounts and dates stay static. Amounts are plain `text-sm font-semibold tabular-nums` text, never a tinted pill.
- Status inside a row or card is a `StatusBadge` / `Badge` (soft tint, colored icon, `text-primary` label), never a tinted icon tile.
- Dashboard widgets use the shared pieces: `DashboardStatCard` (semibold label, 32px tinted icon chip, 32px bold figure), `CardHeader` from `Card.tsx` (icon + 16px semibold title), and divided rows `px-5 py-3`. No accent stripes (`border-l-4`, `border-t-2`), no tinted panel backgrounds, no hover shadows.

## Selectable rows

A row with a selection checkbox toggles on a click anywhere in the row, not only on the box (`ListCard`'s `onRowClick` / `isRowSelected`; `isRowControlClick` in `features/followup/reminderChannels.ts` skips the row's own links and controls). Selected rows get a soft `brand-green-light/15` tint. "Select all" is the shared `SelectAllCheckbox` (`components/ui/SelectAllCheckbox.tsx`) at the **left** of the toolbar, above the row checkboxes, showing a partial (indeterminate) state when only some rows are selected. A choice between fixed options (Email / SMS / Email and SMS) is a `DropdownSelect`, not a row of checkboxes.

## View tabs

Switching a page between whole views (Follow-up / Notification log, Today's close-out / History, Current / Archived users) uses the shared `ViewTabs` (`frontend/src/components/ui/ViewTabs.tsx`): one `surface` track, the selected option a raised white chip with a green ring and heavier weight, ARIA tabs with Arrow/Home/End. Never two independent primary/secondary buttons.

## Size

Buttons and inputs keep EducatraK's **44px minimum** (`min-h-control`, `h-11`). The compact `size="sm"` button (36px) is only for dense rows and pagination. This is the one deliberate difference from CLINIQ (which uses 40px), recorded in the decision above.

## Focus

One focus ring for everything: 2px `brand-green-dark` outline, 2px offset, from `:focus-visible` in `frontend/src/index.css`. Never remove it with `outline-none` unless the control draws an equivalent ring, and never let a scrolling container clip it (keep 4px of padding inside the scroller).

## Dropdowns

Never leave a native `<select>` as OS chrome. Use the shared `DropdownSelect` or the `.dropdown-select` class (see `educatrak-dropdown-patterns`).

## Motion

Transitions are short (`duration-150`) color/filter changes, with `motion-reduce:transition-none`. Two deliberate exceptions (project owner, Thursday, October 29, 2026):

- **Screen switches** (a route, or a previewed role) go through `ScreenTransition` (`frontend/src/components/layout/ScreenTransition.tsx`): a 250ms skeleton shaped like the screen, then a 200ms fade-in. The new screen mounts underneath at once, so a one-frame loading flash never shows. Don't add page-level fades of your own.
- **View tabs**: the selected chip slides between tabs (200ms) and the panel fades in (`animate-screen-in`, keyed by the view). A route-backed tab passes `state={{ viewTab: true }}`, so `ScreenTransition` fades without the skeleton.

Both respect `prefers-reduced-motion`.

## When to apply

Every time you build or touch a button, link, dropdown, icon action, or navigable row. Check it before calling the work done.

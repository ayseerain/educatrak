# Tables, Sorting, and Screen Transitions

**Timestamp:** Thursday, October 29, 2026 — 11:38:35 +08:00
**Agent:** Claude Code (Opus 5.5)
**Branch:** `revamp/frontend-ui-design-system` (not committed; the project owner commits)
**Follows:** `2026-10-29-clinic-design-alignment-feedback.md`

## Request

> "Also fix the tables, the search bar should be integrated with it together with the filtering not like a separate div. Then also for the table there should also be sorting each column. Also, when switching job, it kind of flickers. The screen. So fix that. Then also, apply the skeleton loading. Each switch ng screen. Also, when switching tabs, not just abrupt transition."

"Switching job" was read as switching the previewed role (the sidebar role preview). Route switches were also checked.

## Cause of the flicker

A Playwright timeline showed that switching the previewed role rendered the dashboard skeleton for about 22ms before the data appeared. That one-frame flash is the flicker. Route switches swapped content in a single frame, with no transition.

## What changed

- **Built-in search and filter.** `TableFilters` has an `embedded` mode that renders only the toolbar row, and it is now placed inside each table's card.
  - `ListCard` takes it as `toolbar`, plus an `empty` slot, so the search stays when nothing matches.
  - Mock pages changed: Students, Accounts, Payments, Follow-up, reports, Notification log, Users, and Security events.
  - Live pages changed: Students, Billing accounts, Payments, Follow-up, Notification log, Audit log, Admin log, Outstanding report, and Users. Their loading skeleton renders bare inside the card.
  - The Audit overview and the daily report keep a standalone filter card, because one filter drives several tables there.
- **Sorting.**
  - New `lib/tableSort.ts`: stable sort, blanks last, peso/number/date-aware cell values.
  - New `SortableHeader` / `useTableSort` in `Table.tsx`.
  - `ListCard` sorts every data column and, with `paginate`, sorts before paging and returns to page 1.
  - The mock Students table and the Backup list are sortable too.
  - The Roles permission matrix is not sortable, because it is a matrix, not a record list.
  - Live tables wait on API sort parameters (tracker item).
- **Screen transitions.**
  - `ScreenTransition` wraps the routes, keyed by role + path.
  - It overlays a screen-shaped skeleton for 250ms (dashboard, detail, form, or table), with the new screen already mounted underneath, then fades in over 200ms.
  - It respects reduced motion.
- **Tabs.**
  - `ViewTabs` has one sliding selection indicator, which remembers its last position per strip, so a strip that remounts still slides.
  - Panels fade in, keyed by view.
  - Route-backed tabs pass `state.viewTab`, so they fade without the skeleton.
- **Skills and docs.**
  - Updated `educatrak-table-patterns`, `educatrak-sorting-patterns`, and `educatrak-interactive-states` (Motion).
  - Updated `UX-and-Design-System.md` and the decision record.

## Validation performed

- `npx tsc --noEmit -p .` passed.
- `npx vitest run`: 211 of 213 passed. The 2 failures are the pre-existing ₱8,500.00 vs ₱12,500.00 fixture assertions.
- New tests:
  - `tableSort.test.ts`: comparators and toggle.
  - `tableSorting.test.tsx`: Balance ascending then descending with `aria-sort`, the search inside the table card, and a sort on a paginated list returning to page 1.
- Playwright-core with local Chromium (no Edge) at 1440px, cashier and accounting:
  - Each route switch showed the overlay for about 250ms, then the content.
  - A tab switch showed no overlay.
  - A role switch showed the overlay and no one-frame skeleton flash.
  - Screenshots confirmed the integrated toolbar, the sorted header state, and the filter panel opening over the table.
  - Screenshots were kept outside the repository.

## Known issues / next steps

- Live-mode column sorting needs backend `sort`/`direction` parameters.
- Backup sizes sort as text ("10 MB" vs "9 KB"), since `ListCard` derives values from display text. This is acceptable for the short backup list.
- Page content is still full-width (the CLINIQ max-width question from the previous pass is still open).

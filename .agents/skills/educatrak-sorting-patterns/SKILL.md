---
name: educatrak-sorting-patterns
description: Apply when adding sortable columns to an EducatraK table. Keeps sort state accessible, deterministic, and coordinated with pagination. Adapted from CLINIQ's cliniq-sorting-patterns.
---

# EducatraK Sorting Patterns

Every list table is sortable by each data column (project owner, Thursday, October 29, 2026). The pieces are shared; never build a page-local header button:

- `SortableHeader` and `useTableSort` in `frontend/src/components/ui/Table.tsx` (the header button, `aria-sort`, the direction icon).
- `sortTableRows`, `toggleTableSort`, and `cellSortValue` in `frontend/src/lib/tableSort.ts`.
- `ListCard` (`features/operations/OperationalPages.tsx`) sorts every data column on its own, deriving each cell's value from its visible text: peso amounts and counts as numbers, display dates (`Oct 29, 2026`) by time, everything else as text. Its `paginate` prop sorts the whole list before paging.
- Live-mode tables are server-paginated, so a client sort would order one page only. They are not column-sortable until their APIs accept sort parameters (tracked in `Issues-and-TODOs.md`).

## Behavior

- The page owns the sort key and direction. Sort a copy of the full filtered result, then paginate.
- First click on a column sorts ascending; a second click reverses it; another column starts ascending.
- Until a header is clicked, rows keep the data's own order (most lists are already ordered meaningfully). Empty values (`—`) stay at the bottom in both directions.
- Use deterministic comparators (locale-aware, numeric for student numbers and receipt numbers; amounts compared as integers in centavos).
- Changing the sort returns to page 1.
- Leave action columns (no header, or "Action"/"Actions") unsorted.

## Accessibility

- The sort control is a real `<button>` inside the `th`, with `aria-sort` on the `th` and an accessible name such as "Sort by Paid on, currently descending".
- An up/down icon shows the direction; it is `aria-hidden`.
- Sorting changes row order only, never column widths, captions, or row actions.

## Verification

Test the default order, first and second clicks (label and `aria-sort`), and that sorting a paginated list returns to page 1.

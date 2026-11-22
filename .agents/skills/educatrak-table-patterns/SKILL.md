---
name: educatrak-table-patterns
description: Apply when building or changing an EducatraK data table, especially one whose rows change with search, filters, or pagination. Keeps every table on CLINIQ's compact look, columns stable, and table names accessible. Adapted from CLINIQ's cliniq-table-patterns.
---

# EducatraK Table Patterns

Use with `educatrak-interactive-states` and `educatrak-pagination-patterns`.

## Look (CLINIQ table)

- The table sits in a `Card` with `p-0` (white, soft shadow, no outline); the card's own horizontal scroller (`overflow-x-auto`) keeps the page from scrolling sideways.
- **Search and filters live inside the table's card**, as its top row (`border-b border-border px-5 py-3`), never as a separate card above it (project owner, Thursday, October 29, 2026). Use `<TableFilters embedded …/>`: pass it as `ListCard`'s `toolbar`, or put it in the card's first row. Loading (`LoadingState layout="table" bare`), empty, and error states render inside the same card under the toolbar, so the search stays usable when nothing matches (`ListCard`'s `empty` prop). Don't clip the card (`overflow-hidden`): the filter panel opens over the table. A filter bar that filters several tables at once (the Audit overview, the daily report) stays a standalone card.
- Every data column is sortable (see `educatrak-sorting-patterns`). Pagination sits inside the card, after sorting.
- Header row: no fill, no uppercase, no letter-spacing. `text-xs font-semibold text-text-secondary`, a single `border-b border-border` under it.
- Cells: compact `px-3 py-2`, `text-sm text-text-primary`; rows divided by `border-b border-border last:border-b-0`; money and counts right-aligned with `tabular-nums`.
- The shared `TABLE_SCROLL_CLASS`, `TABLE_CLASS`, `TABLE_HEADER_CELL_CLASS`, and `TABLE_BODY_CELL_CLASS` in `components/ui/Table.tsx` are the source-level table tokens. Reuse them in shared table code; `index.css` enforces the same edge and cell rhythm for every unprinted table in `#main-content`. Page code may add only semantic alignment or a responsive minimum width.
- Statuses in a table use `StatusBadge` (soft tint, icon + label), never color alone.
- `frontend/src/index.css` enforces the header and cell look for every on-screen table inside `#main-content`, so a table built with old classes still renders correctly. Still write the new classes; don't rely on the override.
- Printed tables keep their own print rules (receipts, reports); don't apply this look to `PrintDocumentTable`.

## Structure

- Prefer the shared `DataTable` (`frontend/src/components/ui/Table.tsx`) for new tables. Don't create a page-local wrapper for the same behavior.
- Give every table an accessible name (`caption`, visually hidden when the card already titles it).
- Use `th scope="col"` for headers and `th scope="row"` for the identifying cell when there is one.
- Give a table whose rows change with filters a `min-w-[…]` so columns don't jump; size short, known-length columns (dates, amounts, statuses, action buttons) to their content and let the name/description column take the rest.
- Status badges never break inside. Ordinary Actions cells with several buttons may wrap (`flex flex-wrap gap-2`); `TableActionGroup` is the deliberate compact-action exception and stays on one line inside an action column sized for its longest expanded label.

## Empty, loading, error

- Empty: `EmptyState` inside the card. Loading: `LoadingState layout="table" columns={n}` with the real column count. Error: `ErrorState` with retry.

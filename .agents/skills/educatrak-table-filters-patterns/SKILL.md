---
name: educatrak-table-filters-patterns
description: Apply when building or changing an EducatraK multi-record table's search and filter controls. Keeps filters in the shared compact panel with clear application and clearing behavior.
---

# EducatraK Table Filter Patterns

Use with `educatrak-input-patterns`, `educatrak-dropdown-patterns`, and `educatrak-interactive-states`.

## Shared control

- Use `TableFilters` in `frontend/src/components/ui/TableFilters.tsx`; do not build page-local filter panels.
- Its Filter trigger uses the `SlidersHorizontal` icon, not the older funnel icon.
- The Filter button opens a compact panel over the table. It contains only the page's permitted fields, active-filter chips, **Apply filters**, and **Clear all**.
- **Apply filters** commits the draft values and closes the panel. **Clear all** restores every field to its page default, removes applied filters, and returns the list to page one. There is no Reset action.
- Escape and outside click dismiss the panel without applying draft values. Removing an active-filter chip clears that filter and returns the list to page one.
- The toolbar search remains 44px tall. Inputs and dropdowns inside the panel use the 40px compact exception defined in `educatrak-input-patterns`; keep the panel sized to its fields.

## Data and access

- Each page supplies only the filters its endpoint and role policy support. The backend remains authoritative for validation, permission checks, filtering, and pagination.
- Apply date and numeric validation before an API request. Keep each table's draft, applied values, page number, and page size independent through `useTableFilters`.

---
name: educatrak-pagination-patterns
description: Apply when building or changing an EducatraK operational list that can grow beyond a practical single page. Adapted from CLINIQ's cliniq-pagination-patterns.
---

# EducatraK Pagination Patterns

Reuse `frontend/src/components/ui/PaginationControls.tsx` (with `useClientPagination.tsx` for client-side lists). Don't render every row of a growing list at once.

## Behavior

- Show the visible range and total ("Showing 1–10 of 42 payments") and the current page as "Page X of Y".
- Previous and Next are labeled `secondary` `sm` buttons (accessible names "Previous page" / "Next page"), disabled at the first and last page.
- Rows per page (10, 25, 50) uses the shared `DropdownSelect`, never a native `<select>`. Changing it returns to page 1.
- Reset to page 1 when a filter or search changes, so a user never lands on an empty later page.
- A print or export action covers the full filtered result, not only the visible page.
- The pager never prints (`no-print`).
- Keep the pager at the bottom of its immediate list container. Reserve the compact ten-row table area so a short final page does not move the controls; 25- and 50-row pages may grow naturally.

Follow `educatrak-interactive-states` for cursor, hover, focus, and reduced motion.

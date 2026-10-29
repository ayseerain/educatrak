---
name: educatrak-date-range-patterns
description: Apply when building or changing an EducatraK date-range filter for a dashboard or a multi-record list. Keeps presets, defaults, and custom ranges consistent. Adapted from CLINIQ's cliniq-date-range-patterns.
---

# EducatraK Date-Range Patterns

Use with `educatrak-dropdown-patterns` and `educatrak-interactive-states`.

## Current shared control

- Dashboard ranges use `DashboardRangeFilter` (`frontend/src/features/dashboard/components/DashboardRangeFilter.tsx`), a `DropdownSelect` of presets with a visible "Filter range" label. Reuse it for any other summary view; don't build a second preset menu.
- List filters with From/To dates live in the `TableFilters` panel (`frontend/src/components/ui/TableFilters.tsx`).

## Rules (CLINIQ reference)

- Presets read in order from widest to narrowest or the reverse, never mixed. A summary view may open on Today; a record list opens on its widest scope so history isn't hidden behind an arbitrary window.
- A custom range is a draft until applied. Invalid or incomplete dates explain the problem without changing the applied range, and a range can't end after today.
- A custom-range panel overlays content below its trigger; it never reflows the filters, table, or page.
- The trigger is the standard 44px dropdown trigger on every screen.
- Keep keyboard navigation, focus return, and outside-click dismissal.

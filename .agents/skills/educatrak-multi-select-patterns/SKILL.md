---
name: educatrak-multi-select-patterns
description: Apply when building or changing an EducatraK filter that deliberately accepts multiple values. Adapted from CLINIQ's cliniq-multi-select-patterns.
---

# EducatraK Multi-Select Patterns

Use only when a requirement calls for several selected values at once. EducatraK has no shared multi-select yet; the filter panel in `frontend/src/components/ui/TableFilters.tsx` is the place to add one, so every list gets the same control.

## Behavior (CLINIQ reference)

- The trigger says whether all values apply or how many are selected ("All statuses", "2 statuses"). It uses the shared dropdown trigger look (`educatrak-dropdown-patterns`); only the option rows differ, because they are checkboxes.
- The first option is the all-values checkbox, selected by default when nothing narrower is chosen; selecting it clears the narrower choices.
- The remaining options are labeled checkboxes, so several can be chosen without reopening the control.
- The panel overlays content below the trigger, closes on outside click or Escape, and returns focus to the trigger on Escape.
- Each active value also shows as a removable chip in the filter summary (the existing `TableFilters` chips).

Follow `educatrak-interactive-states` for cursor, hover, focus, and reduced motion.

---
name: educatrak-empty-state-patterns
description: Apply when building or changing an EducatraK empty state in a dashboard widget, list, table, or card. Keeps the shared empty reminder centered and preserves the surrounding screen's header and context.
---

# EducatraK Empty-State Patterns

## One shared empty reminder

- Use `EmptyState` from `frontend/src/components/ui/EmptyState.tsx` for a calm no-data/reminder state. Do not duplicate its icon-and-message layout.
- The shared component fills the available inline width and centers its icon and message. In a fixed-height dashboard widget, its parent must also center it on the block axis.
- Preserve the containing card or widget header, including its title, description, filters, and available actions. An empty result is not an error and must not remove its context.
- Keep the supplied message specific to the current data scope (for example, the selected time range or filtered list). Do not add an action unless that action already exists and is permitted.
- A short inline unavailable note that describes a known configuration limitation is not a dashboard empty state; keep it in its established contextual position.

## Scope

This rule applies to no-data states in cards, dashboards, and operational lists. It does not replace `ErrorState` or `LoadingState`, and it does not alter permission-denied or unavailable states.

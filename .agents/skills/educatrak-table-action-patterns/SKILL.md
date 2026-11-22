---
name: educatrak-table-action-patterns
description: Apply when building or changing an EducatraK action control inside a data-table row. Keeps actions compact without hiding their function, and expands the selected action's label on hover or keyboard focus.
---

# EducatraK Table Action Patterns

Use with `educatrak-table-patterns` and `educatrak-interactive-states`.

## One compact action pattern

- Use `TableActionButton` from `frontend/src/components/ui/TableActionButton.tsx` for row-level table actions.
- Every action starts as a Lucide vector icon in a compact 36px control. Its existing text label expands only for the hovered or keyboard-focused control, then collapses when neither state applies.
- Pass a specific `label`; it is the permanent accessible name and the expanded visible text. The icon is `aria-hidden`.
- Keep actions as real buttons. Do not reveal the only way to identify or operate an action on hover: keyboard focus must expand the same label, and the accessible name must remain available while collapsed.
- Keep destructive actions on the existing destructive `Button` variant and preserve their existing confirmation behavior.
- Group several row actions with `TableActionGroup`. It anchors a single horizontal row at the start of the cell, stays constrained to the action cell (rather than exposing a changing intrinsic width), and prevents rewrapping or recentering while one label expands. Size the action column for its longest expanded label so the table scroller never changes width.

## Scope

This rule is for actions in a table body, not page-header actions, form actions, dialog actions, or a table's primary identifying link.

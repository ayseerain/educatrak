---
name: educatrak-dropdown-patterns
description: Apply when building or changing an EducatraK dropdown, select, listbox, or menu of mutually exclusive options. Keeps every dropdown on CLINIQ's one look, with icon-free selection feedback sized to its content. Adapted from CLINIQ's cliniq-dropdown-patterns.
---

# EducatraK Dropdown Patterns

Use with `educatrak-interactive-states`.

## One look

The look lives in `frontend/src/index.css` (`.dropdown-trigger`, `.dropdown-menu-item`, `.dropdown-select`). Change it there, never on one page.

- **Trigger:** 44px tall (`h-11`, EducatraK's control minimum), `text-sm font-semibold`, `border-border`, `shadow-card`, hover `border-brand-green` + `bg-surface`, and a small `brand-green-dark` chevron that flips while open.
- **Panel:** white, `rounded-md`, `border-border`, `shadow-raised`, `p-1`.
- **Selected option:** `bg-surface`, `font-semibold`, `text-brand-green-dark`. **No checkmark**, radio glyph, or icon spacer.
- Other options: `text-text-primary` with `hover:bg-surface`.

## Which component

- One choice from a list: `DropdownSelect` (`frontend/src/components/ui/DropdownSelect.tsx`, Radix dropdown menu with a radio group). It keeps keyboard support, focus return, and `aria-label`.
- A plain form field that must submit as a native value: `<select className="dropdown-select">`. Its closed state matches; its open menu is OS chrome, so prefer `DropdownSelect` for new work.
- Don't build a page-local dropdown.

## Placeholder

- A prompt ("Select grade") shows on the trigger only, not as an option.
- A real "clear" choice ("All statuses") is the first option.

## Sizing

- The panel is at least as wide as its trigger (`min-w-[var(--radix-dropdown-menu-trigger-width)]`, set once in `DropdownSelect`) and grows to fit its longest label (`whitespace-nowrap`), capped to the viewport (`max-w-[calc(100vw-2rem)]`). Don't pass a smaller `min-w-*` through `contentClassName`: a panel narrower than its trigger reads as broken.

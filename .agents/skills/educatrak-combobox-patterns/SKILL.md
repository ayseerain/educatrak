---
name: educatrak-combobox-patterns
description: Apply when building or changing an EducatraK text field with a suggestion list (a combobox), such as the student search by name or LRN. Keeps every combobox keyboard-usable and in the shared dropdown look. Adapted from CLINIQ's cliniq-combobox-patterns.
---

# EducatraK Combobox Patterns

Use with `educatrak-dropdown-patterns` (panel and option look), `educatrak-input-patterns` (field look), and `educatrak-interactive-states`.

## Shared field

- Student lookup uses `StudentSearchField` (`frontend/src/features/students/StudentSearchField.tsx`). Build any new student lookup on it; don't write another. The Registrar dashboard's large search (`LiveRegistrarStudentSearch.tsx`) is the one deliberate hero-sized variant.
- The field takes the `form-control` look (pass `inputClassName`), with a decorative leading search icon (`aria-hidden`). A visible label or an `aria-label` names it.

## ARIA and keyboard

- ARIA 1.2 combobox: the input has `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, and `aria-activedescendant`; results are `role="listbox"` with `role="option"` rows. Focus stays in the field.
- Down/Up move through results, Enter picks the highlighted one, Escape closes the list, Tab moves on. Enter never submits the surrounding form.

## Results

- Results appear after typing, never on an empty field, and are capped so the list never reads as a roster.
- Each result shows the name and the full LRN (and grade/section when it helps tell similar names apart). Do not mask the LRN.
- Panel and rows use the dropdown look: white, `shadow-raised`, highlighted row `bg-surface`.
- No match: say so under the field.
- After a pick, show the chosen student with a way to change it.

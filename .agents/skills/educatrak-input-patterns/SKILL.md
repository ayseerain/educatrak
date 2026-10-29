---
name: educatrak-input-patterns
description: Apply when building or changing an EducatraK text, search, number, date, or password input outside the sign-in screens. Keeps every input visually and dimensionally aligned with the dropdown trigger beside it. Adapted from CLINIQ's cliniq-input-patterns.
---

# EducatraK Input Patterns

Use with `educatrak-interactive-states`.

## One control look

- Every input uses the `form-control` class from `frontend/src/index.css`: 44px tall (`h-11`), `rounded-md`, `border-border`, `shadow-card`, semibold 14px value, normal-weight `text-muted-readable` placeholder, `hover:border-brand-green`, and the global focus ring only (the border does not also darken on focus; border + offset outline read as a heavy double ring). It matches `.dropdown-trigger`, so an input and a select side by side line up.
- **Filter panel exception (project owner, Thursday, October 29, 2026 â€” 12:48:18 +08:00):** inside the `TableFilters` popover, fields are compact: 40px (`h-10`) inputs and dropdowns, 12px semibold `text-secondary` labels, `size="sm"` action buttons above a hairline, and a panel sized to its fields (one field: single column, `19.5rem`; more: two columns, `26rem`). The toolbar's own search keeps 44px.
- Add spacing with utilities next to it (`form-control mt-1`); don't copy its border/height classes onto a page.
- A textarea uses `form-control` too (height becomes auto).
- Login and First Login keep their own independent field design; don't apply this there.

## Labels and errors

- A real visible label above every field; never placeholder-only.
- Mark required fields; put hint and error text right under the field, the error in `text-status-error` with `role="alert"` or linked by `aria-describedby`; set `aria-invalid` on the field.
- On a failed submit, focus the first invalid field.
- Money fields say what to enter in plain words ("Amount received") and keep the peso sign outside the value.

## Date fields

- EducatraK still uses native `type="date"` inputs (styled with `form-control`). CLINIQ replaces these with a themed date picker because the native calendar is OS chrome. Don't add a second picker pattern; when a themed picker is approved, add one shared component and move every date field to it.

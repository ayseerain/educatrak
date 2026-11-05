---
name: educatrak-modal-patterns
description: Apply when building or changing an EducatraK confirmation dialog or any other modal. Decides which actions need a confirmation and keeps every dialog on CLINIQ's one modal look. Adapted from CLINIQ's cliniq-modal-patterns.
---

# EducatraK Modal Patterns

Use with `educatrak-interactive-states`.

## When to confirm

- Confirm actions that are irreversible or hard to undo: submitting a payment, requesting or approving a void, locking a close-out, committing an import, archiving or deactivating an account.
- The dialog repeats the key numbers so the user can check them: the student, the amount, the receipt total, the date.
- Don't confirm harmless or reversible actions.

## What the dialog says

- Name the record it affects and state plainly what will happen.
- The confirming button repeats the action ("Confirm and lock", "Archive account"); the safe choice is "Cancel" or names what is kept.
- Red `destructive` only for genuinely destructive actions (void, deactivate, delete). Routine confirmations use `primary`.

## One look

- Dialogs are Radix `Dialog` (`@radix-ui/react-dialog`), which gives focus trap, Escape to close, and focus return.
- Standard overlay: `fixed inset-0 bg-text-primary/40`, no blur. Archive confirmations are the exception: use `bg-text-primary/55 backdrop-blur-sm` and a `border-status-error/40` surface with a stronger shadow, so the irreversible action is clearly foregrounded.
- Surface: `rounded-md bg-white shadow-raised`, no outline, `p-5` or `p-6`, centered, `max-h-[90vh] overflow-y-auto`, width capped with a 16px viewport gutter (`w-[min(32rem,calc(100vw-2rem))]`).
- Title `text-lg font-semibold text-text-primary`; description `text-sm text-text-secondary`; actions right-aligned (`flex justify-end gap-2`).
- A dialog opened from another dialog stacks above it with a higher z-index; it keeps the same surface.
- In the MockDB pages, reuse `MockDialog` in `OperationalPages.tsx` instead of hand-building a dialog.

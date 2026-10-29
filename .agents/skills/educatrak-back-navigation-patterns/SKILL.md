---
name: educatrak-back-navigation-patterns
description: Apply when adding or changing an EducatraK screen, route, form, or dead-end state (not found, load error). Decides whether the screen gets a Back control, where it goes, what it says, and keeps every Back on the one shared BackButton. Adapted from CLINIQ's cliniq-back-navigation-patterns.
---

# EducatraK Back Navigation Patterns

Use with `educatrak-interactive-states`.

## When a screen gets Back

- **Yes:** child, detail, form, and flow-step screens (anything reached from another screen), and dead ends (Not Found, "not available", load errors).
- **No:** top-level screens the sidebar reaches, the role dashboards, and the sign-in screens (Login, First Login keep their own design).

## Where it goes

- **History by default:** `<BackButton fallback="/students" />` goes back in history when the user came from another in-app screen, and to `fallback` when the screen was opened directly (bookmark, refresh). The fallback must be a screen the viewer's role can open.
- **Fixed target:** `<BackButton to="/reports" label="Back to reports" />` always goes to that screen; only then may the label name it.
- On a form, Back must not save or submit.

`PageHeader` renders Back for you when you pass `backTo` (and optionally `backLabel`). Don't add a second Back on that page.

## Label

- History target: plain **"Back"**. Fixed target: "Back to <screen>".
- The visible text is the accessible name. Never put a student's name, a receipt number, or an amount in it.

## Look and placement

- First in the page content, **above the page header card**, never inside it and never in the top bar.
- Quiet text control: left chevron, `text-text-secondary`, turning `brand-green-dark` on hover with one underline under chevron and label together. It must not compete with the page's primary action.
- 44px tall hit area (`min-h-control`), `-mb-2` so it sits close to the header card in a `gap-4` column. Outside such a column pass `className="mb-2"`.
- Never prints (`no-print`).

## Shared implementation

`frontend/src/components/ui/BackButton.tsx`. Don't hand-roll a "Back" link or an outlined arrow button on a page.

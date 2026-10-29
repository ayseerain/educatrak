---
name: educatrak-page-header-patterns
description: Apply when building or changing an EducatraK screen's top-of-page heading and its actions, including role dashboards. Keeps every heading on CLINIQ's white header card and keeps page context concise. Adapted from CLINIQ's cliniq-page-header-patterns.
---

# EducatraK Page Header Patterns

Use with `educatrak-interactive-states` for actions and `educatrak-back-navigation-patterns` for Back.

## The header card

- Every page heading sits in a white header card: `rounded-md bg-white shadow-card p-5`, no outline. Title is `h1` `text-2xl font-bold tracking-tight text-text-primary`; the one-line purpose is `mt-1 text-sm text-text-secondary`; actions sit on the right and wrap below on narrow screens.
- Standard pages use `PageHeader` (`frontend/src/components/layout/PageHeader.tsx`). Role dashboards use `DashboardHeader` (`frontend/src/features/dashboard/components/DashboardHeader.tsx`), which adds the workspace name above the title in `text-sm font-semibold text-brand-green-dark`.
- A page that builds its own heading uses `CARD_SURFACE` from `Card.tsx`, or the `.page-header-card` class in `index.css`, so the surface never drifts.
- Back sits **above** the card (see the back-navigation skill).

## Context, filters, and badges

- Don't add a passive badge that only repeats the page title or an unbounded scope ("All payments").
- Keep real filter controls visible; they are the source of truth for the selected scope.
- Keep a status badge only when it says something the title and controls don't (voided receipt, locked close-out, archived account).
- Keep the title, purpose line, and primary action in the header. One primary button per screen.

## Status badge and actions

- A record's status badge sits in the title row, beside the title block. When the header also has actions, put the actions on their own row below (`mt-4 flex flex-wrap gap-2`) so the badge never moves when buttons wrap.

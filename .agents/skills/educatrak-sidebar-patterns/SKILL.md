---
name: educatrak-sidebar-patterns
description: Apply when building or changing EducatraK's application shell — the sidebar, its brand lockup, or the top bar. Keeps the shell matching CLINIQ's layout. Adapted from CLINIQ's cliniq-sidebar-patterns.
---

# EducatraK Sidebar and Shell Patterns

Use with `educatrak-interactive-states`.

## Sidebar (`frontend/src/components/layout/Sidebar.tsx`)

- Brand lockup: the Mendez Christian Academy seal (`/mendez-christian-academy-seal.png`, 44px) beside `EducaTrak` (`text-xl font-bold tracking-tight text-brand-green-dark`) over `Mendez Christian Academy` (`text-xs font-medium text-text-secondary`). The collapse control (panel icon, 44px hit area) sits on the same row, right-aligned.
- Expanded width `17rem`; collapsed `md:w-16` with icon-only links that keep `aria-label` and `title`. The collapsed state is remembered in `localStorage` (`educatrak.sidebar.collapsed`).
- Group labels: `text-xs font-medium uppercase text-text-secondary`.
- Nav links: 44px tall, `rounded-md`, 18px icon + label, `font-medium text-text-primary`, `hover:bg-surface`. The active link is a solid `brand-green-dark` fill with white `font-semibold` text and `shadow-raised` (never a pale tint).
- The sidebar shows only what the signed-in role can use (`can(user, capability)`).
- Spacing follows CLINIQ: the sidebar has `pt-5 pb-2 px-4` with a 24px gap (`gap-6`) between the brand row and the nav (collapsed: `px-3`, `gap-5`); the brand row is indented `pl-2`; seal and wordmark are 10px apart (`gap-2.5`); nav groups are 16px apart (`gap-4`), each with a `px-1.5 pb-1` label; links are 6px apart (`gap-1.5`) with `px-3.5` and a 12px icon gap. Links stay 44px tall (EducatraK's control minimum).
- **Footer (the signed-in account stays here, not in the top bar — project owner, Thursday, October 29, 2026):** separated by `border-t`, holding the development role preview (mock development mode only) and the account row: the user chip (sage `brand-green-light` avatar circle, name, role) as a button that opens the profile, and the red sign-out icon (`text-status-error`, darkens on hover, accessible name "Sign out"). Collapsed, both stay as 44px icon targets.

## Top bar (`frontend/src/components/layout/Shell.tsx`)

- 64px tall (`h-16`), white, `border-b border-border`, never printed.
- The live date and time in Philippine time (`text-sm font-semibold text-text-secondary`, hidden on phones).
- Nothing else: the account and sign-out live in the sidebar footer.
- No search box or notification bell unless the feature exists; a dead control misleads.

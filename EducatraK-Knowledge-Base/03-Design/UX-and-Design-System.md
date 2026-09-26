# UX and Design System

> Source-derived UX, branding, typography, component, interaction, and consistency rules extracted from the canonical Project Specification.

## 4. UX Principles

These are the floor requirements for every screen, written for low-experience cashier staff. Section 5 (Design System) builds the full visual language on top of these; where the two overlap, this section's rules win.

- **Type size floor:** base font 16px; body text never smaller than 14px; buttons at least 44px tall.
- **One main task per screen; one primary button per screen.** The primary action sits bottom-right of its form, consistently.
- **Plain-language labels** — say "Amount received," not "Remit"; "Balance left," not "Outstanding principal."
- **Status is never shown by color alone** — always icon + text (`Current`, `Due soon`, `Overdue`, `Cleared`, `Not cleared`).
- **Confirm dialogs for irreversible actions** (submit payment, void request, close-out, import commit) that repeat the key numbers (student, amount, receipt total).
- **Actionable errors** — say what happened and what to do next (e.g., "Amount is more than the balance of ₱2,500.00. Enter ₱2,500.00 or less.").
- **Every screen implements loading, empty, error, and permission-denied states.**
- **Keyboard-first for cashier screens:** auto-focus the first field, Enter submits, Esc closes dialogs, logical tab order, visible focus ring. Meet WCAG AA contrast (see Section 27).
- **Session timeout:** warn 1 minute before expiry with a "Stay signed in" button; on expiry, redirect to `/login` and never keep unsaved form data in storage.

---
---

## 5. Design System and UI Guidelines

### 5.1 Design Direction

Modern, minimalist, clean, professional, approachable, consistent, easy to scan, smooth and responsive, and usable by non-technical stakeholders without feeling childish or oversimplified.

**Overall goal:** modern, minimalist, clean, readable, approachable, consistent, and effortless — compact but not cramped, readable but not oversized, rounded but not overly rounded, colorful but not noisy, modern but not trendy for its own sake, professional but not intimidating, simple but not lacking functionality, polished but not needlessly complex.

### 5.2 Typography

**Font family.** Because the application runs on a school intranet with no external network access:

```text
Primary: "Segoe UI", system-ui, sans-serif
```

Do not use Google Fonts, external font CDNs, or remote font resources. If a self-hosted font is introduced later, it must remain compatible with the offline environment.

**Typography principles.** Typography should be clean, modern, professional, highly readable, compact but not cramped, appropriate for non-technical school staff, consistent across every module, and accessible at the application's minimum supported screen size. Do not use oversized headings simply for visual impact.

Hierarchy should come primarily from **font weight, spacing, and placement first — reach for a bigger font size last.** Never rely on size alone to create hierarchy.

**Type scale** (baseline, unless a specific requirement elsewhere overrides it):

| Token | Size | Suggested weight | Usage |
|---|---:|---:|---|
| `text-xs` | 12px | 400–500 | Timestamps, compact metadata, table helper text |
| `text-sm` | 14px | 400–500 | Secondary text, helper text, compact labels |
| `text-base` | 16px | 400 | Default body text |
| `text-lg` | 18px | 500–600 | Emphasized body text, section labels |
| `text-xl` | 20px | 600 | Subsection headings |
| `text-2xl` | 24px | 600 | Page headings |
| `text-3xl` | 30px | 600–700 | Major dashboard/page headings, used sparingly |

**Minimum readability rules:**
- Base font size: **16px**. Normal body text must not be smaller than **14px**.
- Avoid 12px text for important information. Important user actions must remain clearly readable.
- Labels must not depend on placeholders to communicate meaning.
- Supporting text may be smaller but must remain readable and accessible.
- Headings should not consume excessive vertical space.

**Font weights** (restrained system):

```text
400 — Regular / body
500 — Medium / labels / controls
600 — Semibold / headings / important values
700 — Bold / major emphasis only
```

Do not make entire interfaces bold.

**Typography hierarchy** — maintain clear distinctions between: page title, section heading, subsection heading, field label, body text, supporting/helper text, table text, status text, button labels, important financial values, and error/warning messages. Financial values, balances, totals, and important statuses may use stronger weight but should not become excessively large.

### 5.3 Color System

Restrained, cohesive palette; strong text/background contrast; limited use of highly saturated color; one consistent accent. No decorative-only color.

**Brand colors** — exact tokens and hex values; do not modify, approximate, rename, or replace them unless a future specification explicitly changes them.

| Token | Hex | Usage |
|---|---|---|
| `brand-green` | `#039935` | Primary buttons, active navigation, headers, primary UI |
| `brand-green-dark` | `#035419` | High-contrast green, especially for white text |
| `brand-green-light` | `#8CCC7E` | Surface/accent backgrounds only |
| `brand-yellow` | `#EAEA09` | Secondary accent, highlights, badges |
| `brand-yellow-dark` | `#AFAF07` | Hover/active yellow state; use with dark text |
| `text-primary` | `#1A1A1A` | Main body text and headings |
| `text-secondary` | `#616161` | Supporting text |
| `text-muted` | `#9E9E9E` | Placeholder, disabled, timestamp text |
| `background` | `#FFFFFF` | Main page background |
| `surface` | `#F5F5F5` | Cards and panels |
| `border` | `#E0E0E0` | Dividers, borders, input outlines |

**Design tokens (implementation-ready):**

```text
Primary:
brand-green: #039935
brand-green-dark: #035419
brand-green-light: #8CCC7E

Accent:
brand-yellow: #EAEA09
brand-yellow-dark: #AFAF07

Text:
text-primary: #1A1A1A
text-secondary: #616161
text-muted: #9E9E9E

Surface:
background: #FFFFFF
surface: #F5F5F5
border: #E0E0E0

Semantic:
success: #20753A
warning: #A85F00
error: #D32F2F
info: #1976D2

Typography:
font-family: "Segoe UI", system-ui, sans-serif
base-size: 16px
minimum-body-size: 14px
```

### 5.4 Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `success` | `#20753A` | Confirmations, success states, success buttons/badges |
| `warning` | `#A85F00` | Warning states, low-stock/nearing-expiration/frequent-visitor-style flags where applicable |
| `error` / `destructive` | `#D32F2F` | Delete/irreversible actions and validation errors |
| `info` | `#1976D2` | Neutral informational/system messages |

If a lighter semantic variant is needed for an icon or a light badge background, it must use dark text, never white text. Do not introduce arbitrary additional semantic colors without documenting them here.

### 5.5 Contrast and Accessibility

**White text.** Small white text may only be placed on `brand-green-dark`, `success`, `warning`, `error`, or `info`. Do **not** use small white text on `brand-green`, `brand-yellow`, `brand-yellow-dark`, `brand-green-light`, or any light semantic variant.

**Brand green.** `brand-green` may carry white text only when the text qualifies as large/UI text under the stated contrast requirements; for normal body text, use a darker color when necessary.

**Yellow.** Never use white text on `brand-yellow` or `brand-yellow-dark`. Use `text-primary` or `brand-green-dark` instead.

**Light green.** `brand-green-light` is for accent surfaces, light badges, backgrounds, and decorative supporting surfaces — always with dark text, never white text.

**Semantic meaning.** Never communicate meaning through color alone. Every semantic state uses an appropriate combination of color, icon, text label, and position/context:

```text
✓ Cleared
! Due soon
⚠ Overdue
× Error
i Information
```

This reinforces, and does not replace, the "status never by color alone" floor rule in Section 4.

### 5.6 Buttons and Controls

Small-to-medium in visual size, comfortable to click, at least **44px tall** (per Section 4), slightly rounded, easy to distinguish by purpose, consistent across modules. Avoid sharp square buttons, excessively rounded buttons, pill-shaped buttons by default, oversized CTA buttons, and giving every button equal visual emphasis.

**Button hierarchy:**

| Role | Treatment |
|---|---|
| **Primary** | `brand-green` background, white text. The one action you probably want. |
| **Secondary** | Outlined or surface-filled treatment, `brand-green` text. Visually quieter than primary. |
| **Cancel / Neutral** | Plain text, quiet gray outline, or neutral surface treatment. Never competes visually with the primary action. |
| **Destructive** | `error`/`destructive` styling, reserved for genuinely irreversible or destructive actions only — never for ordinary Cancel, Back, Close, Return, or Clear. |

Never rely on color alone for meaning — pair it with labels, icons, or position.

### 5.7 Shape Language

One consistent, subtle radius scale reused across buttons, inputs, cards, dialogs, and containers:

```text
sm  — small controls
md  — standard buttons, inputs, cards
lg  — larger containers/dialogs
```

Exact pixel values may follow the project's Tailwind configuration, but the visual principle is: **slightly rounded, modern, and softened — never sharp, excessively rounded, or playful.** No pill-shaped components as the default; no fully sharp corners; no excessive rounding.

### 5.8 Layout and Spacing

Clean, organized, compact, comfortable, uncluttered — avoid both cramped crowding and excessive whitespace that makes the system feel inefficient. Consistent spacing and alignment show relationships; group related information and separate unrelated information.

### 5.9 Forms

Clear labels (never placeholder-only text), grouped related fields, required fields clearly marked, confusing fields briefly explained, and validation messages a non-technical user understands (never a raw technical/API error — consistent with Section 4's error-wording rule). Preserve entered data when validation fails. Each form should answer, in order: *What do I enter? → Why am I entering it? → What happens next?*

### 5.10 Navigation

Predictable and simple: familiar terminology, no unneeded jargon, current location always clear, recurring controls in a consistent place, and structure organized around the user's tasks (e.g., "Record a payment") rather than the app's internal architecture. The sidebar shows only the modules a signed-in role can use (Section 6).

### 5.11 Feedback and System States

Every relevant component defines loading, saving, success, error, warning, empty, disabled, hover, focus, and completed states, with concise, actionable messages (e.g., "Unable to save changes. Please check the required fields." rather than a raw error). This extends the loading/empty/error/permission-denied floor set in Section 4.

### 5.12 Modals and Confirmation

Use dialogs only where they add real value — don't interrupt for harmless actions. For destructive/irreversible actions (payment void, close-out lock, import commit — see Section 4), clearly state what will happen, visually distinguish the destructive action from the safe one, and always give an obvious way to cancel.

### 5.13 Animation and Microinteractions

Subtle only, and only to communicate state changes, feedback, transitions, loading, or interaction response. No bouncing, no decorative motion, nothing excessive — the app should feel smooth and responsive, not flashy.

### 5.14 Visual Hierarchy

Every screen should let a user quickly tell: where they are, what the page is for, what information matters, what actions are available, which action is most relevant, and what happened after they acted. Achieve this with size, weight, spacing, position, and contrast — not by making everything large, bold, or colorful.

### 5.15 Consistency Rules

Reuse the established type scale, weights, spacing, colors, button/input styles, radii, shadows, icons, and status indicators everywhere; extend an existing component rather than creating a visually different duplicate that solves the same problem.

The branding and typography guidelines in this section **extend** the existing UX and access-control requirements — they do not replace or weaken any of the following, all of which remain in force: the type-size floor and one-task-per-screen rule (Section 4); status never communicated by color alone (Sections 4, 5.5); confirmation dialogs for irreversible actions (Sections 4, 5.12); actionable error messages (Section 4); loading/empty/error/permission-denied states on every screen (Sections 4, 5.11); keyboard-first cashier workflows, visible focus states, and logical tab order (Section 4); WCAG AA contrast (Sections 4, 27); the session-timeout warning (Section 4); no unnecessary animation (Section 5.13); consistent navigation (Section 5.10); accessibility as part of normal design, not an add-on (Section 27); and consistent component reuse (this section).

Where a requirement doesn't spell out a specific behavior, decide using standard usability practice — empty states, tooltips where genuinely needed, icon+text pairing, hover/focus/disabled/loading states, error recovery, success feedback, logical grouping, keyboard accessibility, and guarding against accidental destructive actions — and record the decision in `DECISIONS.md`. Don't add an element just because it looks appealing; every element needs a usability reason.

### 5.16 Priority When Guidelines Conflict

**Usability → Clarity → Accessibility → Consistency → Efficiency → Visual polish.**

Never trade away usability or accessibility for aesthetics.

---

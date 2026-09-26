# EducatraK — Dashboard

Student billing and payment-monitoring dashboard for Mendez Christian
Academy. Built to `EducatraK_Frontend_Context_Brief.md` — see
`DECISIONS.md` for the small number of UI decisions the brief left
open.

## Stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS · React Router ·
TanStack Query · TanStack Table · React Hook Form · Zod · Radix UI /
shadcn-style primitives · Recharts (one chart, Accounting dashboard
only) · Vitest + Testing Library.

No external CDNs, no Google Fonts, no remote images. Designed to run
entirely on the school's local intranet.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks (tsc -b) then builds to dist/
npm run test      # runs the Vitest suite once
npm run test:watch
```

Verified in this environment: `npm run build` completes with zero
TypeScript errors, and all tests in `src/test/dashboard.test.tsx` pass.

## Previewing a different role

`src/App.tsx` hard-codes `CURRENT_USER` (see `DECISIONS.md` #3) since
this task didn't include a real auth/session API. Change its `role`
field to `"cashier" | "accounting" | "administrator" | "auditor" |
"registrar"` to see that role's sidebar and dashboard.

## Project layout

```
src/
  i18n/en.ts               all user-visible strings
  lib/
    money.ts                integer-centavos money helper
    dates.ts                Asia/Manila date/time formatting
    permissions.ts          can(user, capability) + capability matrix
    types.ts                Role, AuthenticatedUser, Capability
  api/
    dashboardTypes.ts        per-role DashboardSummary types
    mockAdapter.ts            simulates GET /dashboard (fake data only)
  components/
    layout/                  Shell, Sidebar, Header
    ui/                      Button, Card, Badge, Table, Loading/Error/EmptyState
  features/dashboard/
    DashboardPage.tsx
    hooks/useDashboard.ts
    components/               one component per role + shared RecentActivity/CollectionTrend
  test/                      Vitest setup + dashboard tests
```

## Notes

- Money is always integer centavos; never floats. Display goes through
  `money.ts`'s `format()`, which uses `Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP' })`.
- All dates/times are formatted in the `Asia/Manila` timezone via
  `dates.ts`, regardless of the host machine's local timezone.
- The Sidebar and every dashboard variant are driven entirely by
  `can(user, capability)` — no `if (user.role === ...)` branching is
  scattered through the UI.
- Mock student data is clearly fake (`"(sample)"` suffix) — never real
  records.

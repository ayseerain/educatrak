# EducatraK

<p align="center">
  <strong>Student billing and payment monitoring for Mendez Christian Academy</strong><br>
  Local-network-first • Role-aware • Clearance-aware billing
</p>

<p align="center">
  <img alt="React 18" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-planned-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Laravel 13" src="https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white">
  <img alt="PHP 8.4.1" src="https://img.shields.io/badge/PHP-8.4.1-777BB4?logo=php&logoColor=white">
  <img alt="MySQL 8.4 LTS" src="https://img.shields.io/badge/MySQL-8.4_LTS-4479A1?logo=mysql&logoColor=white">
</p>

> [!IMPORTANT]
> This repository is at the **initial monorepo setup stage**. The presence of `frontend/` and `backend/` directories does **not** mean either application has been scaffolded or implemented yet.

## Overview

**EducatraK** is a web-based student billing and payment-monitoring system for **Mendez Christian Academy**, a small private K–12 school in Cavite, Philippines. It is designed to run on the school's local network rather than depend on external network access at runtime.

The intended workflow supports school staff who manage student billing, in-person payment recording, receipts, installment tracking, notifications, reports, auditability, and financial-clearance status. The product remains partially manual by design: authorized staff encode accounts and payments, while the system handles the defined validation and downstream monitoring workflows.

## Repository Status

| Area | Status | Notes |
|---|---|---|
| Monorepo root | **Initialized by this starter** | Root instructions, README, ignore rules, and canonical knowledge-base categories are defined. |
| `frontend/` | **Placeholder only** | React application has not been scaffolded by this starter. |
| `backend/` | **Placeholder only** | Laravel application has not been scaffolded by this starter. |
| Knowledge base | **Category structure initialized** | Category directories exist; their internal document design is intentionally deferred. |
| Product features | **Not claimed as implemented** | Requirements/specifications may describe intended features, but implementation status must be verified from code and tests. |

## Confirmed / Target Technology

### Frontend

The project specification currently fixes the frontend around **React 18 + TypeScript (strict) + Vite**, with Tailwind CSS, React Router, TanStack Query/Table, React Hook Form + Zod, Radix UI or shadcn/ui, Vitest + Testing Library, and Playwright. React remains on major version 18 unless the project specification is explicitly revised.

When the frontend is scaffolded, use the latest stable compatible releases within those constraints rather than assuming versions from this README are permanent dependency pins.

### Backend

The initial backend target is:

- **Laravel 13.x**
- **PHP 8.4.1+ (8.4.x only)**
- **MySQL 8.4 LTS**

MySQL 8.4 is intentionally selected as the LTS line for this school system. Exact patch versions should be resolved from supported stable releases when the backend is scaffolded.

## Project Structure

```text
EducatraK/
├── AGENTS.md                         # Repository-wide AI agent workflow and rules
├── CLAUDE.md                         # Exact duplicate of AGENTS.md
├── README.md                         # Repository overview and setup status
├── .gitignore                        # Combined frontend/backend ignore rules
│
├── frontend/                         # Frontend application root — placeholder for now
├── backend/                          # Backend application root — placeholder for now
│
└── EducatraK-Knowledge-Base/         # Canonical project documentation/knowledge base
    ├── 00-Project-Core/
    ├── 01-Requirements/
    ├── 02-Architecture/
    ├── 03-Design/
    ├── 04-Development/
    ├── 05-Testing/
    ├── 06-Decisions/
    ├── 07-AI-Agents/
    ├── 08-Logs/
    └── 09-References/
```

The numbered knowledge-base category paths are intended to remain stable. New categories should not trigger casual renumbering of existing paths because future documents and agent instructions may reference them exactly.

## Proposed Frontend Direction

The deep frontend structure is **not created by this starter**. When it is designed/scaffolded, use a modular feature-oriented direction similar to:

```text
frontend/
├── src/
│   ├── api/
│   ├── auth/
│   ├── components/          # Truly shared UI/layout only
│   ├── features/
│   │   ├── dashboard/
│   │   ├── students/
│   │   ├── accounts/
│   │   ├── payments/
│   │   ├── voids/
│   │   ├── notifications/
│   │   ├── reports/
│   │   ├── audit-backup/
│   │   ├── settings/
│   │   ├── clearance/
│   │   ├── followup/
│   │   ├── import/
│   │   ├── closeout/
│   │   └── receipts/
│   ├── i18n/
│   └── lib/
└── tests/
```

A feature-based structure keeps code that changes for the same business capability close together. For a system with multiple distinct billing, payment, clearance, reporting, and administration modules, this scales better than scattering every component into one folder, every hook into another, and every service into another. Shared primitives still belong in shared directories; feature-specific code should remain with its feature.

## Proposed Backend Direction

The deep backend structure is likewise **not created by this starter**. The intended direction is to mirror the product's feature/domain boundaries as closely as Laravel permits:

```text
backend/
├── app/
│   └── Modules/
│       ├── Dashboard/
│       ├── Users/
│       ├── Students/
│       ├── Billing/
│       ├── Payments/
│       ├── Voids/
│       ├── Notifications/
│       ├── Reports/
│       ├── Audit/
│       ├── Settings/
│       ├── Clearance/
│       ├── FollowUp/
│       ├── Imports/
│       ├── CloseOut/
│       └── Receipts/
├── database/
├── routes/
└── tests/
```

No external Laravel modularization package is required merely to obtain this organization. Standard PHP namespaces, Composer autoloading, Laravel conventions, and a disciplined folder structure should be preferred first. The detailed contents of each module should be decided in a dedicated backend-architecture task.

## Required vs. Recommended

### Required for the current repository foundation

- Keep `AGENTS.md` and `CLAUDE.md` word-for-word identical.
- Keep the canonical documentation root named exactly `EducatraK-Knowledge-Base/`.
- Preserve the numbered immediate knowledge-base category paths unless an explicit architectural decision changes them.
- Keep `frontend/` and `backend/` as the two application roots.
- Treat requirements/specifications as requirements, not proof that functionality is already implemented.
- Keep real student/personal data and secrets out of the repository.

### Recommended, but intentionally deferred

- Root workspace/package-manager configuration.
- Frontend and backend scaffolding.
- Deep module internals.
- `.editorconfig` and shared formatter/linter policy.
- `.env.example` files.
- CI/CD and GitHub Actions.
- Docker/container configuration.
- Contribution and commit conventions.

These should be added when their dedicated setup decisions are made rather than guessed during the repository-root initialization.

## AI-Assisted Development

Any coding agent entering this repository must begin with `AGENTS.md` or its identical `CLAUDE.md` counterpart. Those files define the required before/during/after workflow, source-of-truth hierarchy, documentation responsibilities, and mandatory real-clock timestamp policy for agent-written logs.

## Runtime Constraint

The deployed EducatraK application is intended to function without external network access at runtime. Do not introduce CDN-hosted scripts, fonts, remote application assets, analytics, or telemetry into the product unless the governing requirements are explicitly changed.

---

**Current phase:** repository foundation / pre-scaffold.

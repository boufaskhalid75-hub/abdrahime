# VOLAILLE MANAGER

Professional management application for a poultry distribution business in Morocco: purchases from suppliers,
inventory by kilogram, sales to butcher shops, deliveries, invoices, full-invoice collections, receivables,
expenses, cash and profitability — in **French** and **Arabic (RTL)**.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn-style components on Radix primitives, Lucide icons, Sonner toasts |
| Forms | React Hook Form + Zod (validated again on the server and in the database) |
| Charts | Recharts |
| Backend | Supabase: PostgreSQL, Auth, Row Level Security, PL/pgSQL business engine |
| Documents | `@react-pdf/renderer` (PDF), `exceljs` (Excel) |
| Tests | Vitest (unit + PostgreSQL integration), Playwright (browser) |
| Hosting | Vercel |

## Modules

Dashboard · Produits · Fournisseurs · Achats · Clients · Commandes & Ventes · Livraisons · Factures ·
Encaissements · Créances clients · Stock · Dépenses · Caisse (+ Clôture journalière) · Rapports & Statistiques ·
Paramètres · Profil.

## Project layout

```
supabase/migrations/   SQL schema, business engine, reports, security (apply in order)
supabase/tests/        test-only Supabase shim for plain PostgreSQL
src/app/(app)/         authenticated pages (one folder per module)
src/app/api/           PDF and Excel exports (authenticated route handlers)
src/app/login/         sign-in page
src/lib/actions/       server actions (validation → RPC)
src/lib/i18n/          fr.ts / ar.ts dictionaries, server & client helpers
src/lib/finance.ts     pure calculation helpers (UI previews, mirrors the DB engine)
src/lib/data/          report & statement builders shared by pages and exports
src/components/        UI primitives, shared components, forms, charts
tests/unit             finance, i18n, formatting, PDF rendering
tests/db               engine, inventory, invoices, payments, finance, RLS (real PostgreSQL)
tests/e2e              route protection, bilingual login, responsive layout (browser)
```

## Getting started

1. Create a Supabase project and apply the migrations — see [DEPLOYMENT.md](DEPLOYMENT.md).
2. `cp .env.example .env.local` and fill in the URL and publishable key.
3. `npm install` then `npm run dev` and open http://localhost:3000.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run test:unit` | Unit tests |
| `npm run test:db` | Database integration tests (needs `TEST_DATABASE_ADMIN_URL`) |
| `npm run test:e2e` | Browser tests against a running build (needs `E2E_BASE_URL`) |

## Documentation

- [BUSINESS_RULES.md](BUSINESS_RULES.md) — what the system enforces (stock, invoices, payments, finance).
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — tables, functions, security model.
- [DEPLOYMENT.md](DEPLOYMENT.md) — Supabase, Vercel, environment, backups and recovery.
- [PROJECT_STATUS.md](PROJECT_STATUS.md) — audit, what is done, test results, what remains.

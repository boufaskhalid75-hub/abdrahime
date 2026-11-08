# Project status — Volaille Manager

_Last update: 2026-11-08_

## Phase 0 — Initial audit

| # | Item | Finding |
|---|---|---|
| 1 | Architecture | Repository was **empty** (no commits). Greenfield build. |
| 2 | Technology stack | None. Chosen: Next.js 16.4 (App Router), React 19, TypeScript, Tailwind 4, Radix/shadcn-style UI, RHF + Zod, Recharts, Supabase. |
| 3 | Supabase configuration | No project configured for this app. The only Supabase project visible to the session belongs to another application ("EDUCENTER PRO") and was **deliberately not touched**. Migrations are ready to apply to a new dedicated project (DEPLOYMENT.md). |
| 4 | Existing tables | None. |
| 5 | Missing tables | All 21 required tables + `document_sequences`, `stock_lot_allocations`, `daily_closings` — **now created** (DATABASE_SCHEMA.md). |
| 6 | Existing UI components | None. |
| 7 | Missing modules | All — **now implemented** (see below). |
| 8 | Security issues | N/A at start. Design: RLS on all tables, deny-by-default grants, no service key, SECURITY DEFINER RPCs scoped to `auth.uid()`. |
| 9 | Technical risks | See "Known limitations & risks". |
| 10 | Plan | Phases 1–6 below, executed in order. |

## Delivered

### Phase 1 — Foundation ✅
- Next.js app, proxy-based session refresh + redirect, server-side `getUser()` on every page, security headers.
- 4 SQL migrations: schema, engine, reports, security (RLS + grants).
- Design system (palette, Inter + Noto Sans Arabic self-hosted, light theme), sidebar/header shell, mobile drawer.
- i18n: centralized `fr.ts` / `ar.ts` (type-checked identical keys), cookie-based switcher, LTR/RTL, Moroccan number/date/currency formatting.

### Phase 2 — Products, suppliers, purchases, inventory ✅
- Products CRUD + archive, price history, purchase & sales history, stock stats.
- Suppliers CRUD + archive, totals, unpaid balance, products bought.
- Purchases: multi-line form, live totals, pay now / later, lots, cancellation (if stock untouched), idempotency.
- Stock: per-product inventory & value, movements journal, losses/adjustments with reason, CUMP/FIFO (locked after first outflow).

### Phase 3 — Customers, sales, deliveries, invoices ✅
- Customers CRUD + archive, balances, history, customer-specific prices, statement (page + PDF).
- Fast sale entry (all products on one screen, prices pre-filled, editable), discount, deliver-now, stock warnings.
- Deliveries: pending / done / cancelled, confirm (stock once), controlled cancellation.
- Invoices: automatic per sale, immutable, sequential numbers, printable view, PDF, controlled cancellation.

### Phase 4 — Payments, receivables, expenses, cash ✅
- Encaissements: select customer → tick unpaid invoices → exact total → method → confirm. Full invoices only; reversal.
- Créances: totals, ageing filters (3/7/30 days), per customer, oldest invoice.
- Dépenses with categories, cancellation; Caisse with balances per account, manual/opening movements, daily summary.
- Clôture journalière: daily review, printable, PDF, saved snapshot.

### Phase 5 — Dashboard, reports, exports ✅
- Dashboard: 13 KPIs from `period_summary`, period filter (today/yesterday/7/30 days/month/custom), 5 charts, 6 recent-activity lists.
- Reports: sales (day/week/month), profitability, products, customers, suppliers, inventory, outstanding invoices, payments, expenses — PDF and Excel export from the same builder.
- Full data export (Excel, all tables) from Paramètres; audit log viewer.

### Phase 6 — Testing & deployment readiness ✅ (local)
- Production build OK, TypeScript OK, ESLint OK, no secrets committed, `.env.example` provided.

## Tests (last run: 2026-11-08)

| Suite | Command | Result |
|---|---|---|
| Unit — finance, rounding, payments, valuation, i18n, errors, dates, formatting, PDF rendering | `npm run test:unit` | **22 / 22 passed** |
| Database — products, purchases, inventory, CUMP, FIFO, sales, deliveries, invoices, payments, finance, RLS & privileges | `npm run test:db` | **37 / 37 passed** |
| Browser — route protection (20 routes), export auth, security headers, FR/AR login (LTR/RTL), sign-in error, no overflow on mobile/tablet/desktop in both languages | `npm run test:e2e` | **8 / 8 passed** |
| Type check | `npm run typecheck` | passed |
| Lint | `npm run lint` | passed |
| Build | `npm run build` | passed (38 routes) |

Coverage of the mandatory list (Part 25): products create/edit/archive ✓ · purchase creates stock, keeps historical prices ✓ ·
sale totals, invalid quantities, historical selling price ✓ · purchase +stock, delivery −stock, cancelled delivery reverses
exactly once, no negative stock ✓ · unique invoice, no duplicate invoice, historical data ✓ · pay one / several, reject partial,
reject duplicate (incl. concurrent), balance recalculated, reversal ✓ · revenue, COGS, gross margin, expenses, net result ✓ ·
RLS isolation, anonymous rejected, cross-owner RPC rejected, direct financial writes rejected, protected routes ✓ ·
responsive login (mobile/tablet/desktop) ✓.

DB tests run on PostgreSQL 16 with a minimal Supabase shim (`supabase/tests/supabase_shim.sql`) that reproduces
`auth.uid()` and the Supabase roles and default grants.

## Known limitations & risks

1. **Not yet connected to a live Supabase project.** The authenticated screens were type-checked and built but not
   exercised against a running PostgREST/Auth stack in this environment (running external server binaries was not
   permitted). The engine they call is fully tested. **First action after creating the project: click through each
   module once** (create product → supplier → purchase → customer → sale → payment → closing).
2. PDF documents are French-only (Helvetica has no Arabic glyphs); the interface itself is fully bilingual.
3. Valuation method change after go-live requires a controlled migration (by design).
4. Backups depend on the Supabase plan — not verified (DEPLOYMENT.md §5). Use the built-in Excel export meanwhile.
5. No VAT breakdown on invoices (to confirm with the owner).
6. Single-owner model: each account sees only its own data; disable public sign-ups in Supabase (DEPLOYMENT.md).

## Decisions awaiting the owner

See BUSINESS_RULES.md §13: valuation method (CUMP pre-selected), supplier payment practice, auto-invoicing,
legal mentions, VAT.

## Next steps

1. Create a dedicated Supabase project, apply migrations, create the owner user, disable sign-ups.
2. Deploy to Vercel with the two environment variables.
3. Manual acceptance pass on the live stack (list in limitation 1), in French and Arabic, on phone and desktop.
4. Configure backups according to the chosen Supabase plan.

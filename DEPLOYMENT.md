# Deployment — Volaille Manager

Stack: Next.js 16 (App Router) on **Vercel**, **Supabase** (PostgreSQL + Auth).

## Current production setup

| Item | Value |
|---|---|
| Production URL | https://volaille-manager.vercel.app |
| Vercel project | `volaille-manager` (team boufaskhalid75-hub's projects), linked to GitHub `boufaskhalid75-hub/abdrahime` |
| Production branch | `claude/eager-feynman-mg44e0` — every push to it redeploys production automatically |
| Runtime | Node 22.x, functions in `cdg1` (Paris), next to the database |
| Supabase project | `volaille-manager`, ref `jsiqfowvnrazcdygtjxq`, region eu-west-3 (Paris) |
| Env vars on Vercel | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public by design, no secret key) |
| Deployment protection | Vercel Authentication on preview / per-deployment URLs; the production domain is served publicly and protected by the app's own login + RLS |
| Migrations applied | 0001 → 0005 |
The application needs only the Supabase URL and the **publishable (anon) key**. No service-role key is used.

## 1. Create the Supabase project

1. Create a **new, dedicated** project at supabase.com (region close to Morocco, e.g. `eu-west`).
   Do not reuse a project that hosts another application.
2. **Authentication → Providers → Email**: enabled. **Authentication → Sign In / Providers → "Allow new users to sign up": OFF.**
   The app has no sign-up page; the owner account is created by hand (step 3).
3. **Authentication → Users → Add user**: create the owner (email + strong password, "Auto confirm").
4. Apply the migrations (choose one):
   - Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.
   - Or SQL editor: run the files of `supabase/migrations/` **in filename order** (0001 → 0005).
   - Never run `supabase/tests/supabase_shim.sql` on a real project (test-only).
5. **Project Settings → API**: copy the Project URL and the publishable key (`sb_publishable_…`, or the legacy anon key).
6. Run **Advisors → Security** and check there is no "RLS disabled" warning.

On first sign-in the app calls `ensure_owner_setup()` which creates the profile, the business settings and the
default expense categories. Then fill in **Paramètres** (business name, address, ICE/RC/IF if applicable).

## 2. Environment variables

| Variable | Where | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (Production + Preview) and `.env.local` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same | `sb_publishable_…` (or legacy anon key; `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted) |

See `.env.example`. `.env*` files are git-ignored (except `.env.example`). Never commit real values.

## 3. Deploy on Vercel

1. Import the GitHub repository in Vercel (framework preset: Next.js).
2. Add the two environment variables above.
3. Deploy. Build command `next build`, output handled by Vercel.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to the Vercel production URL.

Local development:

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

## 4. Quality gates before each deployment

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run test:unit
```

```bash
TEST_DATABASE_ADMIN_URL=postgresql://postgres@localhost:5432/postgres npm run test:db
```

```bash
npm run build
```

`test:db` needs a disposable local PostgreSQL ≥ 15 server (superuser). It creates and drops its own database.

## 5. Backups & data protection

**Status: not verified on a production project.** The application does not claim automatic backups.

- Supabase **Pro** plans and above include daily backups (7+ days retention); Point-in-Time Recovery is an add-on.
  The **Free** plan has no downloadable automated backups — check *Database → Backups* on your project and choose a
  plan accordingly.
- Built-in export: **Paramètres → Exporter toutes les données** downloads an Excel workbook with every table (owner data
  only, via RLS). Do this regularly (e.g. weekly) and store the file off-site.
- Logical backup with the Supabase CLI or `pg_dump` (connection string from *Project Settings → Database*):

```bash
pg_dump "$SUPABASE_DB_URL" --schema=public --schema=app_private --no-owner --format=custom --file=volaille-$(date +%F).dump
```

- Accidental deletion is prevented in the database (delete triggers, no DELETE grants, archive instead of delete).
- Audit trail: `audit_logs` (append-only), visible in Paramètres.

### Recovery procedure

1. Supabase backup available: *Database → Backups → Restore* (or PITR to a timestamp before the incident).
2. From a `pg_dump` file: create a new Supabase project, apply nothing, then
   `pg_restore --no-owner --dbname "$NEW_DB_URL" volaille-YYYY-MM-DD.dump`, recreate the owner user with the same
   UUID if needed (or update `owner_id` columns), and point the Vercel variables to the new project.
3. Verify after restore: stock invariant (`products.stock_kg` = Σ `stock_lots.remaining_kg`), invoice count, customer
   balances on the Créances page.

## 6. Changing the valuation method after go-live

The method is locked once a stock outflow is valued. Changing it later is a controlled migration: export data, decide
the cut-over date, recompute lot costs and outflow costs in a dedicated migration, verify margins, and record the
change in `audit_logs`. Do not edit `business_settings.valuation_method` directly.

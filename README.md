# Stock Portfolio Tracker

Open-source stock portfolio tracker for stocks, ETFs, and crypto. Real-time prices, capital gains, and tax reporting for South African investors.

## Features

- **Portfolio Dashboard** — total value, day/total gain, performance chart, asset allocation, S&P 500 benchmark
- **Holdings** — positions with avg cost, gain/loss, cost basis, expandable transaction history
- **Transactions** — buy/sell/dividend ledger, filters, CSV import/export, PDF export
- **Watchlist** — track symbols with live prices and day change
- **Multiple Accounts** — separate portfolios (taxable, tax-free, retirement)
- **Capital Gains** — FIFO calculation, SA tax year (1 Mar – 28 Feb), R40,000 annual exclusion
- **Tax Report** — per-sale FIFO breakdown, allowance usage, PDF export
- **Currency Toggle** — USD and ZAR
- **Dark Mode** — theme toggle with persistence
- **Auth** — Google SSO via Supabase
- **Charts** — per-holding price chart with 200-day SMA
- **SMA Alerts** — toggle per holding; fires when price crosses below 200-day SMA
- **In-App Notifications** — alerts card with unread badge
- **Email Alerts** — daily cron via Resend (optional)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- **Data**: React Query, Supabase (PostgreSQL, Auth, Edge Functions)
- **Charts**: Recharts
- **PDF**: @react-pdf/renderer
- **Prices**: Twelve Data API (1-hour cache; free tier ~8 calls/min)
- **Hosting**: Vercel

## Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account
- [Twelve Data](https://twelvedata.com) API key (free tier)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-username/stock-portfolio.git
cd stock-portfolio
npm install
```

### 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. In **Settings → API**, copy the project URL and anon key

### 3. Run migrations

Apply migrations in order via **SQL Editor** in the Supabase dashboard:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_alerts.sql`
3. `supabase/migrations/003_dividends.sql`
4. `supabase/migrations/004_watchlist.sql`
5. `supabase/migrations/005_accounts.sql`

Or, if the DB is empty and you use Supabase CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

If you hit "relation already exists" (DB was set up manually), run each migration file manually in the SQL editor, then repair the migration history:

```bash
supabase migration repair 001 --status applied
supabase migration repair 002 --status applied
# ... repeat for 003, 004, 005
```

### 4. Enable Google OAuth

In Supabase: **Authentication → Providers → Google** — enable and add your OAuth credentials.

### 5. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

| Variable                   | Description                                   |
| -------------------------- | --------------------------------------------- |
| `VITE_SUPABASE_URL`        | Supabase project URL                          |
| `VITE_SUPABASE_ANON_KEY`   | Supabase anon key                             |
| `VITE_TWELVE_DATA_API_KEY` | [Twelve Data](https://twelvedata.com) API key |

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), sign in with Google, and add your first transaction.

## Optional: Edge Functions

Edge functions run on Supabase and reduce client-side API usage. Deploy if you want:

- **fetch-prices** — server-side price fetch (avoids exposing API key in client)
- **search-symbol** — symbol search
- **backfill-snapshots** — portfolio value history
- **check-sma-alerts** — daily SMA crossover detection

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set TWELVE_DATA_API_KEY=your_key
supabase functions deploy fetch-prices
supabase functions deploy search-symbol
supabase functions deploy backfill-snapshots
supabase functions deploy check-sma-alerts
```

For email alerts, also set:

```bash
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set APP_URL=https://your-app.vercel.app
```

Then schedule the daily cron (see [original cron setup](#sma-alert-cron) below).

## Twelve Data API Limits

Free tier: ~8 API calls/min. Prices are cached for 1 hour. If you exceed limits, prices show as "—" until the cache refreshes. Consider:

- Upgrade to a paid Twelve Data plan
- Deploy the `fetch-prices` edge function (server-side calls use your key)

## Deploy to Vercel

```bash
vercel --prod
```

Add the same env vars in Vercel project settings.

## Project Structure

```
src/
  components/
    ui/           — shadcn/ui base components
    layout/       — Header, Layout
    dashboard/    — PortfolioValueCard, PerformanceChart, BenchmarkCard, etc.
    transactions/ — TransactionModal, CsvImportDialog, SymbolSearch
    holdings/     — HoldingChartModal
    pdf/          — StatementTemplate, TaxReportTemplate
  hooks/          — useAuth, useCurrency, useTransactions, usePrices, usePortfolio, useAccounts, etc.
  lib/            — supabase, validators, currency, tax utils, twelve-data
  pages/          — Dashboard, Holdings, Transactions, TaxReport, Watchlist, Login
  types/          — TypeScript types
supabase/
  migrations/     — 001–005
  functions/      — fetch-prices, search-symbol, backfill-snapshots, check-sma-alerts
```

## SMA Alert Cron

If using email alerts, enable `pg_cron` and `pg_net` in Supabase, then run:

```sql
select cron.schedule(
  'check-sma-daily',
  '0 21 * * 1-5',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-sma-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## License

MIT

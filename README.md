# Stock Portfolio Tracker

Track your stock, ETF, and crypto investments with real-time prices, capital gains tracking, and tax reporting for South African investors.

## Features

- **Portfolio Dashboard** — total value, day/total gain, performance chart, asset allocation pie chart
- **Holdings** — current positions with avg cost, gain/loss, expandable transaction history
- **Transactions** — full buy/sell ledger with filters, PDF export
- **Capital Gains** — FIFO calculation, SA tax year (1 Mar – 28 Feb), R40,000 annual exclusion tracker
- **Tax Report** — per-sale FIFO breakdown, allowance usage, PDF export
- **Currency Toggle** — switch between USD and ZAR display
- **Google SSO** — single sign-on via Supabase Auth
- **S&P 500 Benchmark** — compare portfolio performance (via snapshots)
- **Holding Price Charts** — per-holding modal with historical price chart + 200-day SMA overlay
- **SMA Alerts** — per-holding toggle; fires when price crosses below 200-day SMA
- **In-App Notifications** — alerts card on dashboard with unread badge
- **Email Alerts** — daily cron sends email via Resend when SMA crossover detected

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **Data**: React Query + Supabase (PostgreSQL + Auth + Edge Functions)
- **Charts**: Recharts
- **PDF**: @react-pdf/renderer (client-side)
- **Prices**: Twelve Data API (cached with 1-hour TTL)
- **Hosting**: Vercel

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql` via the SQL editor
3. Enable Google OAuth in Authentication → Providers
4. Run the alerts migration in `supabase/migrations/002_alerts.sql` via the SQL editor
5. Deploy edge functions (optional — client-side fallbacks exist for prices/search/backfill):
   ```bash
   supabase functions deploy fetch-prices
   supabase functions deploy search-symbol
   supabase functions deploy backfill-snapshots
   supabase functions deploy check-sma-alerts
   ```
6. Set edge function secrets:
   ```bash
   supabase secrets set TWELVE_DATA_API_KEY=your_key
   supabase secrets set RESEND_API_KEY=your_resend_key
   supabase secrets set APP_URL=https://your-app.vercel.app
   ```
7. Schedule the daily SMA alert cron (enable `pg_cron` and `pg_net` extensions first):
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

### 3. Environment variables

```bash
cp .env.example .env
```

Fill in:

- `VITE_SUPABASE_URL` — from Supabase project settings
- `VITE_SUPABASE_ANON_KEY` — from Supabase project settings
- `VITE_TWELVE_DATA_API_KEY` — from [twelvedata.com](https://twelvedata.com)

### 4. Run

```bash
npm run dev
```

### 5. Deploy to Vercel

```bash
vercel --prod
```

Set the same environment variables in Vercel project settings.

## Project Structure

```
src/
  components/
    ui/           — shadcn/ui base components
    layout/       — Header, Layout
    dashboard/    — PortfolioValueCard, PerformanceChart, AllocationPie, CapitalGainsCard
    transactions/ — TransactionModal
    pdf/          — StatementTemplate, TaxReportTemplate
  hooks/          — useAuth, useCurrency, useTransactions, usePrices, usePortfolio, useCapitalGains, useAlerts
  lib/            — supabase client, validators, currency utils, tax utils, capital gains engine, SMA calculation
  pages/          — Dashboard, Holdings, Transactions, TaxReport, Login
  types/          — TypeScript types and Supabase database types
supabase/
  migrations/     — SQL schema (001_initial_schema, 002_alerts)
  functions/      — Edge functions (fetch-prices, search-symbol, backfill-snapshots, check-sma-alerts)
```

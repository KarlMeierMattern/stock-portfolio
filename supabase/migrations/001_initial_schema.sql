-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Transactions ledger (source of truth for all buys/sells)
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text,
  asset_type text not null check (asset_type in ('stock', 'etf', 'crypto')),
  transaction_type text not null check (transaction_type in ('buy', 'sell')),
  quantity numeric not null check (quantity > 0),
  price_per_unit numeric not null check (price_per_unit > 0),
  currency text not null check (currency in ('USD', 'ZAR')),
  fees numeric not null default 0 check (fees >= 0),
  transaction_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_transactions_user on transactions(user_id);
create index idx_transactions_symbol on transactions(symbol);
create index idx_transactions_date on transactions(transaction_date);

-- Price cache with 1-hour TTL (enforced in application layer)
create table price_cache (
  symbol text primary key,
  price_usd numeric,
  price_zar numeric,
  previous_close_usd numeric,
  exchange_rate numeric,
  updated_at timestamptz not null default now()
);

-- Daily portfolio value snapshots for performance chart
create table portfolio_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  total_value_usd numeric not null default 0,
  total_value_zar numeric not null default 0,
  holdings_breakdown jsonb not null default '{}',
  unique(user_id, snapshot_date)
);

create index idx_snapshots_user_date on portfolio_snapshots(user_id, snapshot_date);

-- View: current holdings derived from transactions
create or replace view current_holdings as
select
  t.user_id,
  t.symbol,
  max(t.name) as name,
  max(t.asset_type) as asset_type,
  sum(case when t.transaction_type = 'buy' then t.quantity else -t.quantity end) as total_quantity,
  case
    when sum(case when t.transaction_type = 'buy' then t.quantity else 0 end) > 0
    then sum(case when t.transaction_type = 'buy' then t.quantity * t.price_per_unit else 0 end)
         / sum(case when t.transaction_type = 'buy' then t.quantity else 0 end)
    else 0
  end as avg_cost,
  sum(case when t.transaction_type = 'buy' then t.quantity * t.price_per_unit else 0 end) as total_invested
from transactions t
group by t.user_id, t.symbol
having sum(case when t.transaction_type = 'buy' then t.quantity else -t.quantity end) > 0.0001;

-- Row Level Security
alter table transactions enable row level security;
alter table portfolio_snapshots enable row level security;

create policy "Users can manage own transactions"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own snapshots"
  on portfolio_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Price cache is readable by all authenticated users, writable by service role
alter table price_cache enable row level security;

create policy "Authenticated users can read price cache"
  on price_cache for select
  to authenticated
  using (true);

create policy "Service role can manage price cache"
  on price_cache for all
  to service_role
  using (true)
  with check (true);

create table watchlist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text,
  asset_type text not null check (asset_type in ('stock', 'etf', 'crypto')),
  added_at timestamptz not null default now(),
  unique(user_id, symbol)
);

create index idx_watchlist_user on watchlist(user_id);

alter table watchlist enable row level security;

create policy "Users can manage own watchlist"
  on watchlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

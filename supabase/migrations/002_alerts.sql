-- Alert settings: per-holding toggle for SMA alerts
create table alert_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  alert_type text not null default '200_sma_cross_below',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, symbol, alert_type)
);

create index idx_alert_settings_user on alert_settings(user_id);

-- Alert log: fired alerts with price/SMA values
create table alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  alert_type text not null,
  message text not null,
  current_price numeric,
  sma_value numeric,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_alerts_user_read on alerts(user_id, read);
create index idx_alerts_created on alerts(created_at desc);

-- RLS
alter table alert_settings enable row level security;
alter table alerts enable row level security;

create policy "Users can manage own alert settings"
  on alert_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own alerts"
  on alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

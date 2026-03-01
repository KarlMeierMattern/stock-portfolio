-- Accounts table: user_id, name, type, currency
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Main',
  type text not null check (type in ('taxable', 'tax_free', 'retirement')) default 'taxable',
  currency text not null check (currency in ('USD', 'ZAR')) default 'USD',
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create index idx_accounts_user on accounts(user_id);
alter table accounts enable row level security;

create policy "Users can manage own accounts"
  on accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add account_id to transactions (nullable for migration)
alter table transactions add column account_id uuid references accounts(id) on delete cascade;
create index idx_transactions_account on transactions(account_id);

-- Add account_id to portfolio_snapshots (nullable for migration)
alter table portfolio_snapshots add column account_id uuid references accounts(id) on delete cascade;
create index idx_snapshots_account on portfolio_snapshots(account_id);

-- Create default "Main" account for each user with transactions or snapshots, then migrate data
do $$
declare
  r record;
  default_account_id uuid;
begin
  for r in (
    select distinct user_id from (
      select user_id from transactions
      union
      select user_id from portfolio_snapshots
    ) u
  ) loop
    insert into accounts (user_id, name, type, currency)
    values (r.user_id, 'Main', 'taxable', 'USD')
    on conflict (user_id, name) do nothing;

    select id into default_account_id from accounts where user_id = r.user_id and name = 'Main' limit 1;

    update transactions set account_id = default_account_id where user_id = r.user_id and account_id is null;
    update portfolio_snapshots set account_id = default_account_id where user_id = r.user_id and account_id is null;
  end loop;
end $$;

-- Make account_id required
alter table transactions alter column account_id set not null;
alter table portfolio_snapshots alter column account_id set not null;

-- Update portfolio_snapshots unique constraint: (account_id, snapshot_date)
alter table portfolio_snapshots drop constraint if exists portfolio_snapshots_user_id_snapshot_date_key;
alter table portfolio_snapshots add constraint portfolio_snapshots_account_date_key unique (account_id, snapshot_date);

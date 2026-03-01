-- Add dividend transaction type
alter table transactions drop constraint if exists transactions_transaction_type_check;
alter table transactions add constraint transactions_transaction_type_check
  check (transaction_type in ('buy', 'sell', 'dividend'));

-- Dividends use: quantity = shares held, price_per_unit = dividend per share
-- Total dividend amount = quantity * price_per_unit
-- current_holdings view already excludes non-buy/sell via the sum case expressions

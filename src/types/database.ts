export type AssetType = 'stock' | 'etf' | 'crypto'
export type TransactionType = 'buy' | 'sell' | 'dividend'
export type Currency = 'USD' | 'ZAR'
export type AccountType = 'taxable' | 'tax_free' | 'retirement'

export type Account = {
  id: string
  user_id: string
  name: string
  type: AccountType
  currency: Currency
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  account_id: string
  symbol: string
  name: string | null
  asset_type: AssetType
  transaction_type: TransactionType
  quantity: number
  price_per_unit: number
  currency: Currency
  fees: number
  transaction_date: string
  notes: string | null
  created_at: string
}

export type PriceCache = {
  symbol: string
  price_usd: number | null
  price_zar: number | null
  previous_close_usd: number | null
  exchange_rate: number | null
  updated_at: string
}

export type PortfolioSnapshot = {
  id: string
  user_id: string
  account_id: string
  snapshot_date: string
  total_value_usd: number
  total_value_zar: number
  holdings_breakdown: Record<string, { qty: number; value_usd: number; value_zar: number }>
}

export type Holding = {
  symbol: string
  name: string | null
  asset_type: AssetType
  total_quantity: number
  avg_cost_usd: number
  avg_cost_zar: number
  total_invested_usd: number
  total_invested_zar: number
}

export type AlertSetting = {
  id: string
  user_id: string
  symbol: string
  alert_type: string
  enabled: boolean
  created_at: string
}

export type WatchlistItem = {
  id: string
  user_id: string
  symbol: string
  name: string | null
  asset_type: AssetType
  added_at: string
}

export type Alert = {
  id: string
  user_id: string
  symbol: string
  alert_type: string
  message: string
  current_price: number | null
  sma_value: number | null
  read: boolean
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: Account
        Insert: Omit<Account, 'id' | 'created_at'>
        Update: Partial<Omit<Account, 'id' | 'created_at'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>
      }
      price_cache: {
        Row: PriceCache
        Insert: PriceCache
        Update: Partial<PriceCache>
      }
      portfolio_snapshots: {
        Row: PortfolioSnapshot
        Insert: Omit<PortfolioSnapshot, 'id'>
        Update: Partial<Omit<PortfolioSnapshot, 'id'>>
      }
      alert_settings: {
        Row: AlertSetting
        Insert: Omit<AlertSetting, 'id' | 'created_at'>
        Update: Partial<Omit<AlertSetting, 'id' | 'created_at'>>
      }
      alerts: {
        Row: Alert
        Insert: Omit<Alert, 'id' | 'created_at'>
        Update: Partial<Omit<Alert, 'id' | 'created_at'>>
      }
      watchlist: {
        Row: WatchlistItem
        Insert: Omit<WatchlistItem, 'id'>
        Update: Partial<Omit<WatchlistItem, 'id'>>
      }
    }
    Views: {
      current_holdings: {
        Row: Holding
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

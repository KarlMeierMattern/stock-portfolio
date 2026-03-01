import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useSelectedAccount } from './useAccounts'
import { fetchTimeSeries, fetchExchangeRate } from '@/lib/twelve-data'
import type { Transaction } from '@/types/database'

export async function runBackfill(userId: string, accountId: string) {
  try {
    const { error } = await supabase.functions.invoke('backfill-snapshots', {
      body: { user_id: userId, account_id: accountId },
    })
    if (!error) return
  } catch {
    // Fall back to client-side backfill
  }

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('transaction_date', { ascending: true })

  if (!transactions || transactions.length === 0) return

  const txs = transactions as Transaction[]
  const symbols = [...new Set(txs.map(t => t.symbol))]
  const startDate = txs[0].transaction_date

  const historicalPrices: Record<string, Record<string, number>> = {}
  for (const symbol of symbols) {
    const series = await fetchTimeSeries(symbol, startDate)
    historicalPrices[symbol] = {}
    for (const point of series) {
      historicalPrices[symbol][point.date] = point.close
    }
  }

  const exchangeRate = await fetchExchangeRate()

  const txPriceMap: Record<string, number> = {}
  for (const tx of txs) {
    txPriceMap[tx.symbol] = tx.price_per_unit
  }

  const holdings: Record<string, number> = {}
  let txIndex = 0
  let hasHadHoldings = false
  const snapshots: {
    user_id: string
    account_id: string
    snapshot_date: string
    total_value_usd: number
    total_value_zar: number
    holdings_breakdown: Record<string, { qty: number; value_usd: number; value_zar: number }>
  }[] = []

  const start = new Date(startDate)
  const end = new Date()

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]

    while (txIndex < txs.length && txs[txIndex].transaction_date <= dateStr) {
      const tx = txs[txIndex]
      if (tx.transaction_type === 'dividend') {
        txIndex++
        continue
      }
      if (!holdings[tx.symbol]) holdings[tx.symbol] = 0
      holdings[tx.symbol] += tx.transaction_type === 'buy' ? tx.quantity : -tx.quantity
      txPriceMap[tx.symbol] = tx.price_per_unit
      txIndex++
    }

    let totalValueUsd = 0
    const breakdown: Record<string, { qty: number; value_usd: number; value_zar: number }> = {}

    for (const [symbol, qty] of Object.entries(holdings)) {
      if (qty <= 0.0001) continue

      const prices = historicalPrices[symbol] || {}
      let price = prices[dateStr]
      if (!price) {
        const dates = Object.keys(prices).sort().reverse()
        const closest = dates.find(d => d <= dateStr)
        price = closest ? prices[closest] : txPriceMap[symbol] || 0
      }

      const valueUsd = qty * price
      totalValueUsd += valueUsd
      breakdown[symbol] = { qty, value_usd: valueUsd, value_zar: valueUsd * exchangeRate }
    }

    const hasActiveHoldings = Object.keys(breakdown).length > 0
    if (hasActiveHoldings) hasHadHoldings = true

    if (hasHadHoldings) {
      snapshots.push({
        user_id: userId,
        account_id: accountId,
        snapshot_date: dateStr,
        total_value_usd: totalValueUsd,
        total_value_zar: totalValueUsd * exchangeRate,
        holdings_breakdown: breakdown,
      })
    }
  }

  await supabase
    .from('portfolio_snapshots')
    .delete()
    .eq('account_id', accountId)

  for (let i = 0; i < snapshots.length; i += 100) {
    await supabase
      .from('portfolio_snapshots')
      .insert(snapshots.slice(i, i + 100) as never[])
  }
}

export function useBackfillSnapshots() {
  const { user } = useAuth()
  const { selectedAccountId } = useSelectedAccount()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      if (!selectedAccountId) throw new Error('No account selected')
      await runBackfill(user.id, selectedAccountId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] })
      toast.success('Prices synced')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to sync prices')
    },
  })
}

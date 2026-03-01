import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const TWELVE_DATA_BASE = 'https://api.twelvedata.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, account_id } = await req.json() as { user_id: string; account_id: string }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY')!

    // Get all transactions for the account
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', account_id)
      .order('transaction_date', { ascending: true })

    if (txError) throw txError
    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ message: 'No transactions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get unique symbols
    const symbols = [...new Set(transactions.map(t => t.symbol))]

    // Fetch historical data for each symbol
    const historicalPrices: Record<string, Record<string, number>> = {}
    const startDate = transactions[0].transaction_date

    for (const symbol of symbols) {
      try {
        const res = await fetch(
          `${TWELVE_DATA_BASE}/time_series?symbol=${symbol}&interval=1day&start_date=${startDate}&apikey=${apiKey}&outputsize=5000`
        )
        const data = await res.json()

        if (data.values) {
          historicalPrices[symbol] = {}
          for (const entry of data.values) {
            historicalPrices[symbol][entry.datetime] = parseFloat(entry.close)
          }
        }
      } catch (err) {
        console.error(`Failed to fetch history for ${symbol}:`, err)
      }
    }

    // Get exchange rate history
    let fxHistory: Record<string, number> = {}
    try {
      const fxRes = await fetch(
        `${TWELVE_DATA_BASE}/time_series?symbol=USD/ZAR&interval=1day&start_date=${startDate}&apikey=${apiKey}&outputsize=5000`
      )
      const fxData = await fxRes.json()
      if (fxData.values) {
        for (const entry of fxData.values) {
          fxHistory[entry.datetime] = parseFloat(entry.close)
        }
      }
    } catch (err) {
      console.error('Failed to fetch FX history:', err)
    }

    // Replay transactions day by day to build snapshots
    const start = new Date(startDate)
    const end = new Date()
    const holdings: Record<string, number> = {}
    let txIndex = 0

    const snapshots: any[] = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]

      // Apply transactions for this date
      while (txIndex < transactions.length && transactions[txIndex].transaction_date <= dateStr) {
        const tx = transactions[txIndex]
        if (tx.transaction_type === 'dividend') {
          txIndex++
          continue
        }
        if (!holdings[tx.symbol]) holdings[tx.symbol] = 0

        if (tx.transaction_type === 'buy') {
          holdings[tx.symbol] += tx.quantity
        } else {
          holdings[tx.symbol] -= tx.quantity
        }
        txIndex++
      }

      // Calculate portfolio value
      let totalValueUsd = 0
      const fx = fxHistory[dateStr] || 18.5
      const breakdown: Record<string, any> = {}

      for (const [symbol, qty] of Object.entries(holdings)) {
        if (qty <= 0.0001) continue

        const prices = historicalPrices[symbol] || {}
        // Find closest available price (look backwards)
        let price = prices[dateStr]
        if (!price) {
          const dates = Object.keys(prices).sort().reverse()
          const closest = dates.find(d => d <= dateStr)
          price = closest ? prices[closest] : 0
        }

        const valueUsd = qty * price
        totalValueUsd += valueUsd
        breakdown[symbol] = {
          qty,
          value_usd: valueUsd,
          value_zar: valueUsd * fx,
        }
      }

      if (Object.keys(breakdown).length > 0) {
        snapshots.push({
          user_id,
          account_id,
          snapshot_date: dateStr,
          total_value_usd: totalValueUsd,
          total_value_zar: totalValueUsd * fx,
          holdings_breakdown: breakdown,
        })
      }
    }

    // Delete existing snapshots for this account, then insert
    await supabase.from('portfolio_snapshots').delete().eq('account_id', account_id)

    const batchSize = 100
    for (let i = 0; i < snapshots.length; i += batchSize) {
      const batch = snapshots.slice(i, i + batchSize)
      const { error } = await supabase
        .from('portfolio_snapshots')
        .insert(batch)

      if (error) console.error('Snapshot upsert error:', error)
    }

    return new Response(JSON.stringify({
      message: `Created ${snapshots.length} snapshots`,
      snapshotCount: snapshots.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

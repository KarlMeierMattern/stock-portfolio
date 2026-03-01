import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchPricesDirect, fetchExchangeRate } from '@/lib/twelve-data'
import type { PriceCache } from '@/types/database'

const STALE_TIME = 60 * 60 * 1000 // 1 hour

export function usePrices(symbols: string[]) {
  return useQuery({
    queryKey: ['prices', symbols.sort().join(',')],
    queryFn: async (): Promise<Record<string, PriceCache>> => {
      if (symbols.length === 0) return {}

      // Check Supabase cache first
      const { data: cached } = await supabase
        .from('price_cache')
        .select('*')
        .in('symbol', symbols)

      const now = Date.now()
      const fresh: Record<string, PriceCache> = {}
      const stale: string[] = []
      const cachedItems = (cached ?? []) as PriceCache[]

      for (const symbol of symbols) {
        const hit = cachedItems.find(c => c.symbol === symbol)
        if (hit && now - new Date(hit.updated_at).getTime() < STALE_TIME) {
          fresh[symbol] = hit
        } else {
          stale.push(symbol)
        }
      }

      if (stale.length === 0) return fresh

      // Try edge function first, fall back to direct API
      let fetched = false
      try {
        const { data, error } = await supabase.functions.invoke('fetch-prices', {
          body: { symbols: stale },
        })
        if (!error && data?.prices) {
          for (const [symbol, price] of Object.entries(data.prices as Record<string, PriceCache>)) {
            fresh[symbol] = price
          }
          fetched = true
        }
      } catch {
        // Edge function not deployed, fall back
      }

      if (!fetched) {
        const exchangeRate = await fetchExchangeRate()
        const directPrices = await fetchPricesDirect(stale)

        for (const [symbol, p] of Object.entries(directPrices)) {
          const record: PriceCache = {
            symbol,
            price_usd: p.price,
            price_zar: p.price * exchangeRate,
            previous_close_usd: p.previousClose,
            exchange_rate: exchangeRate,
            updated_at: new Date().toISOString(),
          }
          fresh[symbol] = record

          // Best-effort cache write (will fail silently if RLS blocks it)
          supabase.from('price_cache').upsert(record, { onConflict: 'symbol' }).then(() => {})
        }
      }

      return fresh
    },
    enabled: symbols.length > 0,
    staleTime: STALE_TIME,
    refetchInterval: STALE_TIME,
  })
}

export function useExchangeRate() {
  return useQuery({
    queryKey: ['exchange-rate'],
    queryFn: async () => {
      // Check cache
      const { data: cached } = await supabase
        .from('price_cache')
        .select('exchange_rate, updated_at')
        .eq('symbol', 'USD/ZAR')
        .single()

      const row = cached as { exchange_rate: number | null; updated_at: string } | null
      if (row?.exchange_rate) {
        const age = Date.now() - new Date(row.updated_at).getTime()
        if (age < STALE_TIME) return row.exchange_rate
      }

      // Fetch fresh rate directly
      return await fetchExchangeRate()
    },
    staleTime: STALE_TIME,
  })
}

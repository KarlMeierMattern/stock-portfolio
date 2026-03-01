import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const TWELVE_DATA_BASE = 'https://api.twelvedata.com'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { symbols } = await req.json() as { symbols: string[] }

    if (!symbols || symbols.length === 0) {
      return new Response(JSON.stringify({ error: 'No symbols provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY')!

    // Fetch USD/ZAR exchange rate
    const fxRes = await fetch(
      `${TWELVE_DATA_BASE}/exchange_rate?symbol=USD/ZAR&apikey=${apiKey}`
    )
    const fxData = await fxRes.json()
    const exchangeRate = parseFloat(fxData.rate) || 18.5

    // Batch fetch prices (Twelve Data supports comma-separated symbols)
    const batchSize = 8
    const prices: Record<string, any> = {}

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      const symbolStr = batch.join(',')

      const [priceRes, quoteRes] = await Promise.all([
        fetch(`${TWELVE_DATA_BASE}/price?symbol=${symbolStr}&apikey=${apiKey}`),
        fetch(`${TWELVE_DATA_BASE}/quote?symbol=${symbolStr}&apikey=${apiKey}`),
      ])

      const priceData = await priceRes.json()
      const quoteData = await quoteRes.json()

      for (const symbol of batch) {
        const pData = batch.length === 1 ? priceData : priceData[symbol]
        const qData = batch.length === 1 ? quoteData : quoteData[symbol]

        const priceUsd = parseFloat(pData?.price) || null
        const previousClose = parseFloat(qData?.previous_close) || null

        if (priceUsd !== null) {
          const record = {
            symbol,
            price_usd: priceUsd,
            price_zar: priceUsd * exchangeRate,
            previous_close_usd: previousClose,
            exchange_rate: exchangeRate,
            updated_at: new Date().toISOString(),
          }

          prices[symbol] = record

          await supabase.from('price_cache').upsert(record, { onConflict: 'symbol' })
        }
      }
    }

    // Also cache the exchange rate itself
    await supabase.from('price_cache').upsert({
      symbol: 'USD/ZAR',
      price_usd: 1,
      price_zar: exchangeRate,
      previous_close_usd: null,
      exchange_rate: exchangeRate,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'symbol' })

    return new Response(JSON.stringify({ prices, exchangeRate }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

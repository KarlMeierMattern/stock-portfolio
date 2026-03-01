import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const TWELVE_DATA_BASE = 'https://api.twelvedata.com'
const SMA_PERIOD = 200

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL') || 'https://your-app.vercel.app'

    // Get all enabled alert settings
    const { data: settings, error: settingsErr } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('enabled', true)
      .eq('alert_type', '200_sma_cross_below')

    if (settingsErr) throw settingsErr
    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: 'No active alerts' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Dedupe symbols
    const symbolSet = new Set<string>(settings.map((s: { symbol: string }) => s.symbol))
    const symbols = [...symbolSet]

    // For each symbol: fetch current price + 200-day time series, compute SMA
    const triggered: { symbol: string; price: number; sma: number; userId: string; email: string }[] = []

    for (const symbol of symbols) {
      try {
        // Fetch time series (200+ days)
        const tsRes = await fetch(
          `${TWELVE_DATA_BASE}/time_series?symbol=${symbol}&interval=1day&outputsize=${SMA_PERIOD + 5}&apikey=${apiKey}`
        )
        const tsData = await tsRes.json()

        if (!tsData.values || tsData.values.length < SMA_PERIOD) continue

        const closes = tsData.values.map((v: { close: string }) => parseFloat(v.close))
        const currentPrice = closes[0] // newest first

        // Calculate SMA from the 200 most recent closes
        const smaSlice = closes.slice(0, SMA_PERIOD)
        const sma = smaSlice.reduce((sum: number, c: number) => sum + c, 0) / SMA_PERIOD

        if (currentPrice >= sma) continue

        // Check yesterday's close to avoid duplicate alerts (only fire on cross-below)
        const yesterdayPrice = closes[1]
        const yesterdaySma = closes.slice(1, SMA_PERIOD + 1).reduce((sum: number, c: number) => sum + c, 0) / SMA_PERIOD
        if (yesterdayPrice < yesterdaySma) continue // was already below yesterday

        // Find users with this symbol alert enabled
        const usersForSymbol = settings.filter((s: { symbol: string }) => s.symbol === symbol)
        for (const setting of usersForSymbol) {
          // Get user email
          const { data: userData } = await supabase.auth.admin.getUserById(setting.user_id)
          const email = userData?.user?.email

          triggered.push({
            symbol,
            price: currentPrice,
            sma: Math.round(sma * 100) / 100,
            userId: setting.user_id,
            email: email || '',
          })
        }
      } catch (err) {
        console.error(`Error checking ${symbol}:`, err)
      }
    }

    // Write alerts + send emails
    for (const alert of triggered) {
      const message = `${alert.symbol} crossed below 200-day SMA — Price: $${alert.price.toFixed(2)}, SMA: $${alert.sma.toFixed(2)}`

      // Check we haven't already fired this alert today
      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', alert.userId)
        .eq('symbol', alert.symbol)
        .eq('alert_type', '200_sma_cross_below')
        .gte('created_at', `${today}T00:00:00Z`)
        .limit(1)

      if (existing && existing.length > 0) continue

      // Insert alert
      await supabase.from('alerts').insert({
        user_id: alert.userId,
        symbol: alert.symbol,
        alert_type: '200_sma_cross_below',
        message,
        current_price: alert.price,
        sma_value: alert.sma,
        read: false,
      })

      // Send email via Resend
      if (resendApiKey && alert.email) {
        try {
          const pctBelow = (((alert.sma - alert.price) / alert.sma) * 100).toFixed(1)

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Portfolio Alerts <alerts@yourdomain.com>',
              to: alert.email,
              subject: `SMA Alert: ${alert.symbol} below 200-day SMA`,
              html: `
                <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
                  <h2 style="color: #dc2626;">⚠️ ${alert.symbol} SMA Alert</h2>
                  <p><strong>${alert.symbol}</strong> has crossed below its 200-day Simple Moving Average.</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">Current Price</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">$${alert.price.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">200-day SMA</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">$${alert.sma.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border: 1px solid #e5e7eb;">Below SMA by</td>
                      <td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${pctBelow}%</td>
                    </tr>
                  </table>
                  <a href="${appUrl}/holdings" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">View Portfolio</a>
                </div>
              `,
            }),
          })
        } catch (emailErr) {
          console.error(`Failed to send email for ${alert.symbol}:`, emailErr)
        }
      }
    }

    return new Response(
      JSON.stringify({
        checked: symbols.length,
        triggered: triggered.length,
        alerts: triggered.map(t => `${t.symbol}: $${t.price.toFixed(2)} < SMA $${t.sma.toFixed(2)}`),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

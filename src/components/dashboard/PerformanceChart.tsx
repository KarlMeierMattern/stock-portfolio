import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSelectedAccount } from '@/hooks/useAccounts'
import { useCurrency } from '@/hooks/useCurrency'
import { formatCurrency } from '@/lib/currency'
import type { PortfolioSnapshot } from '@/types/database'
import { format, subDays, subMonths, subYears } from 'date-fns'

const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '6M', days: 180 },
  { label: 'YTD', days: 0 },
  { label: '1Y', days: 365 },
  { label: 'MAX', days: -1 },
] as const

export function PerformanceChart() {
  const [range, setRange] = useState<string>('1M')
  const { user } = useAuth()
  const { selectedAccountId } = useSelectedAccount()
  const { currency } = useCurrency()

  const { data: snapshots = [] } = useQuery({
    queryKey: ['snapshots', user?.id, selectedAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('account_id', selectedAccountId!)
        .order('snapshot_date', { ascending: true })

      if (error) throw error
      return data as PortfolioSnapshot[]
    },
    enabled: !!user && !!selectedAccountId,
  })

  const chartData = useMemo(() => {
    if (snapshots.length === 0) return []

    const now = new Date()
    let startDate: Date

    switch (range) {
      case '1W': startDate = subDays(now, 7); break
      case '1M': startDate = subMonths(now, 1); break
      case '6M': startDate = subMonths(now, 6); break
      case 'YTD': startDate = new Date(now.getFullYear(), 0, 1); break
      case '1Y': startDate = subYears(now, 1); break
      default: startDate = new Date(0)
    }

    const dateFormat = range === '1W' || range === '1M' ? 'MMM dd' : "MMM dd ''yy"

    return snapshots
      .filter(s => new Date(s.snapshot_date) >= startDate)
      .map(s => ({
        date: format(new Date(s.snapshot_date), dateFormat),
        fullDate: s.snapshot_date,
        value: currency === 'USD' ? s.total_value_usd : s.total_value_zar,
      }))
  }, [snapshots, range, currency])

  const hasData = chartData.length > 0
  const portfolioStartDate = snapshots.length > 0 ? snapshots[0].snapshot_date : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Portfolio Value</CardTitle>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.label}
              variant={range === r.label ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setRange(r.label)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData && portfolioStartDate && (
          <p className="text-xs text-muted-foreground mb-2">
            Portfolio data available from {format(new Date(portfolioStartDate), 'MMM dd, yyyy')}. Select a shorter range or click "Sync Prices" to backfill.
          </p>
        )}
        {hasData ? (
          <ResponsiveContainer width="100%" height={300} style={{ outline: 'none' }}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="portfolioValueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.646 0.222 41.12)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.646 0.222 41.12)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => formatCurrency(v, currency)}
                width={90}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(value: number | undefined) => [formatCurrency(value ?? 0, currency), 'Portfolio Value']}
                labelFormatter={(_label, payload) => {
                  const item = payload?.[0]?.payload
                  return item?.fullDate
                    ? format(new Date(item.fullDate), 'MMM dd, yyyy')
                    : String(_label)
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="oklch(0.646 0.222 41.12)"
                strokeWidth={2}
                fill="url(#portfolioValueGradient)"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
            No performance data yet. Add transactions and click "Sync Prices" to generate snapshots.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

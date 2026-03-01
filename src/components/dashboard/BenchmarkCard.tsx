import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSelectedAccount } from '@/hooks/useAccounts'
import { useCurrency } from '@/hooks/useCurrency'
import { fetchTimeSeries } from '@/lib/twelve-data'
import type { PortfolioSnapshot } from '@/types/database'
import { format, subDays, subMonths, subYears } from 'date-fns'

const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '6M', days: 180 },
  { label: 'YTD', days: 0 },
  { label: '1Y', days: 365 },
] as const

export function BenchmarkCard() {
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

  const { data: sp500Data = [], isError: sp500Error } = useQuery({
    queryKey: ['sp500-benchmark-v2'],
    queryFn: async () => {
      const twoYearsAgo = format(subYears(new Date(), 2), 'yyyy-MM-dd')
      const data = await fetchTimeSeries('SPY', twoYearsAgo)
      if (data.length === 0) throw new Error('No SPY data returned')
      return data
    },
    staleTime: 60 * 60 * 1000,
    retry: 3,
    retryDelay: 5000,
  })

  const chartData = useMemo(() => {
    if (snapshots.length < 2 && sp500Data.length < 2) return []

    const now = new Date()
    let startDate: Date
    switch (range) {
      case '1W': startDate = subDays(now, 7); break
      case '1M': startDate = subMonths(now, 1); break
      case '6M': startDate = subMonths(now, 6); break
      case 'YTD': startDate = new Date(now.getFullYear(), 0, 1); break
      case '1Y': startDate = subYears(now, 1); break
      default: startDate = subMonths(now, 1)
    }

    const dateFormat = range === '1W' || range === '1M' ? 'MMM dd' : "MMM dd ''yy"

    const filteredSnapshots = snapshots.filter(s => new Date(s.snapshot_date) >= startDate)
    const basePortfolioValue = filteredSnapshots.length > 0
      ? (currency === 'USD' ? filteredSnapshots[0].total_value_usd : filteredSnapshots[0].total_value_zar)
      : null

    const sp500Sorted = [...sp500Data]
      .map(d => ({ ...d, date: d.date.split(' ')[0] }))
      .reverse()
    const filteredSp500 = sp500Sorted.filter(d => new Date(d.date) >= startDate)
    const baseSp500 = filteredSp500.length > 0 ? filteredSp500[0].close : null

    const sp500Map = new Map<string, number>()
    if (baseSp500 && baseSp500 > 0) {
      for (const d of filteredSp500) {
        sp500Map.set(d.date, ((d.close - baseSp500) / baseSp500) * 100)
      }
    }

    const sp500Dates = [...sp500Map.keys()].sort()

    function getClosestSp500(date: string): number | null {
      if (sp500Map.has(date)) return sp500Map.get(date)!
      let closest: string | null = null
      for (const d of sp500Dates) {
        if (d <= date) closest = d
        else break
      }
      return closest ? sp500Map.get(closest)! : null
    }

    return filteredSnapshots.map(s => {
      const val = currency === 'USD' ? s.total_value_usd : s.total_value_zar
      const portfolioReturn = basePortfolioValue && basePortfolioValue > 0
        ? ((val - basePortfolioValue) / basePortfolioValue) * 100
        : null
      const sp500Return = getClosestSp500(s.snapshot_date)

      return {
        date: format(new Date(s.snapshot_date), dateFormat),
        fullDate: s.snapshot_date,
        portfolio: portfolioReturn !== null ? Math.round(portfolioReturn * 100) / 100 : null,
        sp500: sp500Return !== null ? Math.round(sp500Return * 100) / 100 : null,
      }
    })
  }, [snapshots, sp500Data, range, currency])

  const hasData = chartData.length > 0

  if (!hasData) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          Portfolio vs S&P 500
          {sp500Error && <span className="text-xs text-muted-foreground font-normal ml-2">(S&P data loading...)</span>}
        </CardTitle>
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
        <ResponsiveContainer width="100%" height={300} style={{ outline: 'none' }}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="portfolioReturnGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.646 0.222 41.12)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.646 0.222 41.12)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
              width={60}
              domain={['auto', 'auto']}
            />
            <Tooltip
              formatter={(value: number | undefined, name: string) => [
                `${(value ?? 0) >= 0 ? '+' : ''}${(value ?? 0).toFixed(2)}%`,
                name === 'portfolio' ? 'Portfolio' : 'S&P 500',
              ]}
              labelFormatter={(_label, payload) => {
                const item = payload?.[0]?.payload
                return item?.fullDate
                  ? format(new Date(item.fullDate), 'MMM dd, yyyy')
                  : String(_label)
              }}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs">{value === 'portfolio' ? 'Portfolio' : 'S&P 500'}</span>
              )}
            />
            <Area
              type="monotone"
              dataKey="portfolio"
              stroke="oklch(0.646 0.222 41.12)"
              strokeWidth={2}
              fill="url(#portfolioReturnGradient)"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="sp500"
              stroke="oklch(0.6 0.118 184.71)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

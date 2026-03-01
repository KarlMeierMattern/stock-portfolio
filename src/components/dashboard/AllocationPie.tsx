import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useCurrency } from '@/hooks/useCurrency'
import { formatCurrency } from '@/lib/currency'
import { Link } from 'react-router-dom'
import type { AssetType } from '@/types/database'

const COLORS: Record<AssetType, string> = {
  stock: 'oklch(0.646 0.222 41.12)',
  etf: 'oklch(0.6 0.118 184.71)',
  crypto: 'oklch(0.828 0.189 84.43)',
}

const LABELS: Record<AssetType, string> = {
  stock: 'Stocks',
  etf: 'ETFs',
  crypto: 'Crypto',
}

type Props = {
  allocation: Record<AssetType, number>
}

export function AllocationPie({ allocation }: Props) {
  const { currency } = useCurrency()
  const total = Object.values(allocation).reduce((s, v) => s + v, 0)

  const data = (Object.entries(allocation) as [AssetType, number][])
    .filter(([, value]) => value > 0)
    .map(([type, value]) => ({
      name: LABELS[type],
      value,
      color: COLORS[type],
      percent: total > 0 ? (value / total) * 100 : 0,
    }))

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No holdings yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Asset Allocation</CardTitle>
        <Link to="/holdings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View holdings
        </Link>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value), currency)}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '12px',
                padding: '8px 12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-1.5">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
              </div>
              <div className="text-right">
                <span className="font-medium">{formatCurrency(item.value, currency)}</span>
                <span className="text-muted-foreground ml-2">{item.percent.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

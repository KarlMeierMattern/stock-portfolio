import { Card, CardContent } from '@/components/ui/card'
import { useCurrency } from '@/hooks/useCurrency'
import { formatCurrency, formatPercent } from '@/lib/currency'
import { TrendingUp, TrendingDown } from 'lucide-react'

type Props = {
  totalValueUsd: number
  totalValueZar: number
  totalGainUsd: number
  totalGainZar: number
  totalGainPercent: number
  dayGainUsd: number
  dayGainZar: number
  dayGainPercent: number
  totalDividendsUsd?: number
  totalDividendsZar?: number
}

export function PortfolioValueCard({
  totalValueUsd, totalValueZar,
  totalGainUsd, totalGainZar, totalGainPercent,
  dayGainUsd, dayGainZar, dayGainPercent,
  totalDividendsUsd = 0, totalDividendsZar = 0,
}: Props) {
  const { currency } = useCurrency()
  const totalValue = currency === 'USD' ? totalValueUsd : totalValueZar
  const totalGain = currency === 'USD' ? totalGainUsd : totalGainZar
  const dayGain = currency === 'USD' ? dayGainUsd : dayGainZar

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground mb-1">Portfolio Value</p>
        <p className="text-4xl font-bold tracking-tight">
          {formatCurrency(totalValue, currency)}
        </p>

        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Day Gain</p>
            <div className={`flex items-center gap-1 text-sm font-medium ${dayGain >= 0 ? 'text-success' : 'text-destructive'}`}>
              {dayGain >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatCurrency(Math.abs(dayGain), currency)} ({formatPercent(dayGainPercent)})
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Total Gain</p>
            <div className={`flex items-center gap-1 text-sm font-medium ${totalGain >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalGain >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatCurrency(Math.abs(totalGain), currency)} ({formatPercent(totalGainPercent)})
            </div>
          </div>

          {(totalDividendsUsd > 0 || totalDividendsZar > 0) && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Dividends</p>
              <div className="flex items-center gap-1 text-sm font-medium text-success">
                <TrendingUp className="h-3.5 w-3.5" />
                {formatCurrency(currency === 'USD' ? totalDividendsUsd : totalDividendsZar, currency)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

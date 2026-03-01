import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCapitalGains } from '@/hooks/useCapitalGains'
import { formatCurrency } from '@/lib/currency'
import { formatTaxYearLabel } from '@/lib/tax-utils'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

export function CapitalGainsCard() {
  const { summary, allowanceUsed, allowanceRemaining, exclusionAmount, currentTaxYear } = useCapitalGains()

  const usedPercent = Math.min((allowanceUsed / exclusionAmount) * 100, 100)
  const isNearLimit = allowanceRemaining < 10000
  const isOverLimit = allowanceRemaining <= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {isOverLimit ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-success" />
          )}
          Capital Gains Allowance
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {formatTaxYearLabel(currentTaxYear)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Used</span>
              <span className="font-medium">{formatCurrency(allowanceUsed, 'ZAR')}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverLimit ? 'bg-destructive' : isNearLimit ? 'bg-chart-4' : 'bg-success'
                }`}
                style={{ width: `${Math.min(usedPercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className={`font-semibold ${isOverLimit ? 'text-destructive' : isNearLimit ? 'text-chart-4' : 'text-success'}`}>
              {formatCurrency(allowanceRemaining, 'ZAR')}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Annual exclusion</span>
            <span>{formatCurrency(exclusionAmount, 'ZAR')}</span>
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Realized gains</span>
              <span className={summary.realizedGains >= 0 ? 'text-success' : 'text-destructive'}>
                {formatCurrency(summary.realizedGains, 'ZAR')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

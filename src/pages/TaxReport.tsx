import { useState, useMemo } from 'react'
import { useCapitalGains } from '@/hooks/useCapitalGains'
import { useTransactions } from '@/hooks/useTransactions'
import { useExchangeRate } from '@/hooks/usePrices'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency, formatNumber } from '@/lib/currency'
import { formatTaxYearLabel, getAllTaxYears, SA_CGT_ANNUAL_EXCLUSION, isInTaxYear } from '@/lib/tax-utils'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { downloadTaxReport } from '@/lib/pdf-generator'
import { FileDown, ShieldCheck, AlertTriangle, Plus } from 'lucide-react'

export default function TaxReport() {
  const [selectedYearLabel, setSelectedYearLabel] = useState<string>('')
  const { data: transactions = [], isLoading } = useTransactions()
  const { data: exchangeRate = 18.5 } = useExchangeRate()

  const taxYears = useMemo(() => getAllTaxYears(transactions), [transactions])

  const selectedTaxYear = selectedYearLabel
    ? taxYears.find(y => y.label === selectedYearLabel)
    : undefined

  const { summary, allowanceUsed, allowanceRemaining, currentTaxYear } = useCapitalGains(selectedTaxYear)

  const activeTaxYear = selectedTaxYear ?? currentTaxYear

  const isOverLimit = allowanceRemaining <= 0

  const dividendsInYear = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === 'dividend' && isInTaxYear(t.transaction_date, activeTaxYear))
      .reduce((sum, t) => sum + t.quantity * t.price_per_unit * (t.currency === 'ZAR' ? 1 : exchangeRate), 0)
  }, [transactions, activeTaxYear, exchangeRate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tax Report</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-16 text-center">
          <p className="text-lg font-medium text-foreground mb-2">No transactions yet</p>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Add buy and sell transactions to generate your capital gains tax report.
          </p>
          <Button asChild>
            <Link to="/transactions">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tax Report</h1>
        <div className="flex gap-2">
          <Select
            options={[
              { value: '', label: 'Current tax year' },
              ...taxYears.map(y => ({ value: y.label, label: y.label })),
            ]}
            value={selectedYearLabel}
            onChange={(e) => setSelectedYearLabel(e.target.value)}
            className="w-48"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTaxReport(
              summary, activeTaxYear, allowanceUsed, allowanceRemaining, SA_CGT_ANNUAL_EXCLUSION
            )}
          >
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Tax Year: {formatTaxYearLabel(activeTaxYear)}
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Proceeds</p>
            <p className="text-xl font-bold">{formatCurrency(summary.totalProceeds, 'ZAR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Cost Basis</p>
            <p className="text-xl font-bold">{formatCurrency(summary.totalCostBasis, 'ZAR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Realized Gains/Losses</p>
            <p className={`text-xl font-bold ${summary.realizedGains >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(summary.realizedGains, 'ZAR')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {isOverLimit ? <AlertTriangle className="h-3 w-3 text-destructive" /> : <ShieldCheck className="h-3 w-3 text-success" />}
              Allowance Remaining
            </p>
            <p className={`text-xl font-bold ${isOverLimit ? 'text-destructive' : 'text-success'}`}>
              {formatCurrency(allowanceRemaining, 'ZAR')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              of {formatCurrency(SA_CGT_ANNUAL_EXCLUSION, 'ZAR')} annual exclusion
            </p>
          </CardContent>
        </Card>
      </div>

      {dividendsInYear > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Dividend Income (Tax Year)</p>
            <p className="text-xl font-bold">{formatCurrency(dividendsInYear, 'ZAR')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              May be taxable as income. Consult a tax practitioner for SA rules.
            </p>
          </CardContent>
        </Card>
      )}

      {isOverLimit && (() => {
        const excess = summary.realizedGains - SA_CGT_ANNUAL_EXCLUSION
        const inclusion = excess * 0.4
        return (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Estimated Tax Liability
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Gain Exceeding Exclusion</p>
                  <p className="text-lg font-bold">{formatCurrency(excess, 'ZAR')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inclusion Rate (40%)</p>
                  <p className="text-lg font-bold">{formatCurrency(inclusion, 'ZAR')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Added to Taxable Income</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(inclusion, 'ZAR')}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Taxed at your marginal rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sale Breakdown (FIFO)</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.lots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No sales recorded in this tax year.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Buy Date</TableHead>
                  <TableHead>Sell Date</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost Basis</TableHead>
                  <TableHead className="text-right">Proceeds</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.lots.map((lot, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{lot.sellTransaction.symbol}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(lot.buyTransaction.transaction_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(lot.sellTransaction.transaction_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(lot.quantity, 4)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(lot.costBasis, 'ZAR')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(lot.proceeds, 'ZAR')}</TableCell>
                    <TableCell className={`text-right font-medium ${lot.gain >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(lot.gain, 'ZAR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

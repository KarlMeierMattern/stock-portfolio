import { useState } from 'react'
import { usePortfolio, type PortfolioHolding } from '@/hooks/usePortfolio'
import { useCurrency } from '@/hooks/useCurrency'
import { useExchangeRate } from '@/hooks/usePrices'
import { useTransactions } from '@/hooks/useTransactions'
import { useAlertSettings, useToggleAlert, useToggleAllAlerts } from '@/hooks/useAlerts'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { HoldingChartModal } from '@/components/holdings/HoldingChartModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/currency'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, TrendingDown, LineChart, Bell, BellOff, Plus } from 'lucide-react'

type SellPreset = {
  symbol: string
  name: string | null
  asset_type: string
  maxQuantity: number
}

export default function Holdings() {
  const { holdings, isLoading } = usePortfolio()
  const { currency } = useCurrency()
  const { data: exchangeRate = 18.5 } = useExchangeRate()
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null)
  const { data: transactions = [] } = useTransactions()
  const [sellModalOpen, setSellModalOpen] = useState(false)
  const [sellPreset, setSellPreset] = useState<SellPreset | null>(null)
  const [chartSymbol, setChartSymbol] = useState<{ symbol: string; name: string | null } | null>(null)
  const { data: alertSettings = [] } = useAlertSettings()
  const toggleAlert = useToggleAlert()
  const toggleAll = useToggleAllAlerts()

  const enabledSymbols = new Set(alertSettings.filter(a => a.enabled).map(a => a.symbol))
  const allEnabled = holdings.length > 0 && holdings.every(h => enabledSymbols.has(h.symbol))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const getValue = (h: PortfolioHolding, field: 'currentPrice' | 'avgCost' | 'currentValue' | 'totalInvested' | 'totalGain' | 'dayGain') => {
    switch (field) {
      case 'currentPrice': return currency === 'USD' ? h.currentPriceUsd : h.currentPriceZar
      case 'avgCost': return currency === 'USD' ? h.avgCostUsd : h.avgCostZar
      case 'currentValue': return currency === 'USD' ? h.currentValueUsd : h.currentValueZar
      case 'totalInvested': return currency === 'USD' ? h.totalInvestedUsd : h.totalInvestedZar
      case 'totalGain': return currency === 'USD' ? h.totalGainUsd : h.totalGainZar
      case 'dayGain': return h.dayGainUsd ? (currency === 'USD' ? h.dayGainUsd : h.dayGainUsd * exchangeRate) : null
    }
  }

  const handleSell = (h: PortfolioHolding, e: React.MouseEvent) => {
    e.stopPropagation()
    setSellPreset({
      symbol: h.symbol,
      name: h.name,
      asset_type: h.asset_type,
      maxQuantity: h.quantity,
    })
    setSellModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Holdings</h1>
        {holdings.length > 0 && (
          <Button
            variant={allEnabled ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => toggleAll.mutate({
              symbols: holdings.map(h => h.symbol),
              enabled: !allEnabled,
            })}
            disabled={toggleAll.isPending}
          >
            {allEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {allEnabled ? 'Alerts On' : 'Enable All Alerts'}
          </Button>
        )}
      </div>

      {holdings.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">No holdings yet. Add transactions to see your holdings.</p>
          <Button asChild>
            <Link to="/transactions">
              <Plus className="h-4 w-4" />
              Add your first transaction
            </Link>
          </Button>
        </div>
      ) : (
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Cost Basis</TableHead>
              <TableHead className="text-right">Day Gain</TableHead>
              <TableHead className="text-right">Total Gain</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h) => {
              const isExpanded = expandedSymbol === h.symbol
              const symbolTxs = transactions.filter(t => t.symbol === h.symbol)
              const dayGain = getValue(h, 'dayGain')
              const totalGain = getValue(h, 'totalGain')
              const value = getValue(h, 'currentValue') ?? getValue(h, 'totalInvested')

              return (
                <>
                  <TableRow
                    key={h.symbol}
                    className="cursor-pointer"
                    onClick={() => setExpandedSymbol(isExpanded ? null : h.symbol)}
                  >
                    <TableCell className="w-8">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{h.symbol}</span>
                        {h.name && <p className="text-xs text-muted-foreground">{h.name}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{h.asset_type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {getValue(h, 'currentPrice') != null
                        ? formatCurrency(getValue(h, 'currentPrice')!, currency)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(h.quantity, 4)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <span title="Avg cost per share vs current price">
                        {formatCurrency(getValue(h, 'avgCost')!, currency)} / share
                        {getValue(h, 'currentPrice') != null && (
                          <> vs {formatCurrency(getValue(h, 'currentPrice')!, currency)} now</>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right ${dayGain != null ? (dayGain >= 0 ? 'text-success' : 'text-destructive') : ''}`}>
                      {dayGain != null
                        ? `${formatCurrency(Math.abs(dayGain), currency)} (${formatPercent(h.dayGainPercent ?? 0)})`
                        : '—'}
                    </TableCell>
                    <TableCell className={`text-right ${totalGain != null ? (totalGain >= 0 ? 'text-success' : 'text-destructive') : ''}`}>
                      {totalGain != null
                        ? `${formatCurrency(Math.abs(totalGain), currency)} (${formatPercent(h.totalGainPercent ?? 0)})`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {value != null ? formatCurrency(value, currency) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {h.portfolioPercent.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 w-7 p-0 ${enabledSymbols.has(h.symbol) ? 'text-primary' : 'text-muted-foreground'}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleAlert.mutate({ symbol: h.symbol, enabled: !enabledSymbols.has(h.symbol) })
                          }}
                          title={enabledSymbols.has(h.symbol) ? 'Disable SMA alert' : 'Enable SMA alert'}
                        >
                          {enabledSymbols.has(h.symbol)
                            ? <Bell className="h-3.5 w-3.5" />
                            : <BellOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            setChartSymbol({ symbol: h.symbol, name: h.name })
                          }}
                        >
                          <LineChart className="h-3 w-3" />
                          Chart
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleSell(h, e)}
                        >
                          <TrendingDown className="h-3 w-3" />
                          Sell
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {isExpanded && symbolTxs.length > 0 && (
                    <TableRow key={`${h.symbol}-detail`}>
                      <TableCell colSpan={11} className="bg-muted/30 p-4">
                        <p className="text-sm font-medium mb-2">Transaction History — {h.symbol}</p>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-muted-foreground text-xs">
                              <th className="text-left pb-2">Date</th>
                              <th className="text-left pb-2">Type</th>
                              <th className="text-right pb-2">Qty</th>
                              <th className="text-right pb-2">Price</th>
                              <th className="text-right pb-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {symbolTxs.map((tx) => (
                              <tr key={tx.id} className="border-t border-border/50">
                                <td className="py-1.5">{format(new Date(tx.transaction_date), 'dd MMM yyyy')}</td>
                                <td>
                                  <Badge variant={tx.transaction_type === 'buy' ? 'default' : 'destructive'} className="text-[10px]">
                                    {tx.transaction_type.toUpperCase()}
                                  </Badge>
                                </td>
                                <td className="text-right">{formatNumber(tx.quantity, 4)}</td>
                                <td className="text-right">{formatCurrency(tx.price_per_unit, tx.currency)}</td>
                                <td className="text-right">{formatCurrency(tx.quantity * tx.price_per_unit, tx.currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      )}

      <TransactionModal
        open={sellModalOpen}
        onOpenChange={(open) => {
          setSellModalOpen(open)
          if (!open) setSellPreset(null)
        }}
        sellPreset={sellPreset}
      />

      {chartSymbol && (
        <HoldingChartModal
          open={!!chartSymbol}
          onOpenChange={(open) => { if (!open) setChartSymbol(null) }}
          symbol={chartSymbol.symbol}
          name={chartSymbol.name}
        />
      )}
    </div>
  )
}

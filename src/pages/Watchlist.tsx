import { useState, useMemo } from 'react'
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '@/hooks/useWatchlist'
import { useTransactions } from '@/hooks/useTransactions'
import { usePrices } from '@/hooks/usePrices'
import { useCurrency } from '@/hooks/useCurrency'
import { useExchangeRate } from '@/hooks/usePrices'
import { SymbolSearch } from '@/components/transactions/SymbolSearch'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { HoldingChartModal } from '@/components/holdings/HoldingChartModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency, formatPercent } from '@/lib/currency'
import { Plus, Trash2, LineChart, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

export default function Watchlist() {
  const { data: watchlist = [], isLoading } = useWatchlist()
  const { data: transactions = [] } = useTransactions()
  const symbols = useMemo(() => {
    const s = new Set(watchlist.map((w) => w.symbol))
    for (const tx of transactions) s.add(tx.symbol)
    return Array.from(s)
  }, [watchlist, transactions])
  const { data: prices = {} } = usePrices(symbols)
  const { currency } = useCurrency()
  const { data: exchangeRate = 18.5 } = useExchangeRate()
  const addToWatchlist = useAddToWatchlist()
  const removeFromWatchlist = useRemoveFromWatchlist()
  const [addOpen, setAddOpen] = useState(false)
  const [chartSymbol, setChartSymbol] = useState<{ symbol: string; name: string | null } | null>(null)
  const [buyPreset, setBuyPreset] = useState<{ symbol: string; name: string | null; asset_type: string } | null>(null)

  const handleAdd = (symbol: string, name: string | null, assetType: string) => {
    addToWatchlist.mutate(
      { symbol, name, asset_type: assetType as 'stock' | 'etf' | 'crypto' },
      {
        onSuccess: () => {
          setAddOpen(false)
          toast.success(`${symbol} added to watchlist`)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to add')
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Symbol
        </Button>
      </div>

      {addOpen && (
        <div className="rounded-lg border p-4 space-y-4">
          <p className="text-sm font-medium">Add symbol to watchlist</p>
          <SymbolSearch
            value=""
            onChange={(symbol, name, assetType) => {
              if (symbol) handleAdd(symbol, name, assetType)
            }}
          />
          <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
            Cancel
          </Button>
        </div>
      )}

      {watchlist.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Track symbols you're interested in. Add one to get started.
          </p>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Symbol
          </Button>
        </div>
      ) : (
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Day Change</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchlist.map((item) => {
              const price = prices[item.symbol]
              const priceVal = currency === 'USD' ? price?.price_usd : price?.price_zar
              const prevClose = price?.previous_close_usd
              const dayChange =
                priceVal && prevClose
                  ? ((priceVal - (currency === 'USD' ? prevClose : prevClose * exchangeRate)) /
                      (currency === 'USD' ? prevClose : prevClose * exchangeRate)) *
                    100
                  : null

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{item.symbol}</span>
                      {item.name && (
                        <p className="text-xs text-muted-foreground">{item.name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.asset_type.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {priceVal != null
                      ? formatCurrency(priceVal, currency)
                      : '—'}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      dayChange != null
                        ? dayChange >= 0
                          ? 'text-success'
                          : 'text-destructive'
                        : ''
                    }`}
                  >
                    {dayChange != null ? formatPercent(dayChange) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setChartSymbol({ symbol: item.symbol, name: item.name })
                        }
                      >
                        <LineChart className="h-3 w-3" />
                        Chart
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setBuyPreset({
                            symbol: item.symbol,
                            name: item.name,
                            asset_type: item.asset_type,
                          })
                        }}
                      >
                        <TrendingUp className="h-3 w-3" />
                        Buy
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromWatchlist.mutate(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <TransactionModal
        open={!!buyPreset}
        onOpenChange={(open) => {
          if (!open) setBuyPreset(null)
        }}
        buyPreset={buyPreset}
      />

      {chartSymbol && (
        <HoldingChartModal
          open={!!chartSymbol}
          onOpenChange={(open) => {
            if (!open) setChartSymbol(null)
          }}
          symbol={chartSymbol.symbol}
          name={chartSymbol.name}
        />
      )}
    </div>
  )
}

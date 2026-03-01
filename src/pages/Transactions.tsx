import { useState, useMemo } from 'react'
import { useTransactions, useDeleteTransaction, useBulkImportTransactions } from '@/hooks/useTransactions'
import { useSelectedAccount } from '@/hooks/useAccounts'
import { useCurrency } from '@/hooks/useCurrency'
import { useExchangeRate } from '@/hooks/usePrices'
import { convertCurrency } from '@/lib/currency'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency, formatNumber } from '@/lib/currency'
import { getAllTaxYears, isInTaxYear } from '@/lib/tax-utils'
import { format } from 'date-fns'
import { downloadTransactionStatement } from '@/lib/pdf-generator'
import { downloadTransactionsCsv } from '@/lib/csv-export'
import { CsvImportDialog } from '@/components/transactions/CsvImportDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Transaction } from '@/types/database'
import { Plus, Trash2, FileDown, FileUp, Pencil, AlertTriangle } from 'lucide-react'

export default function Transactions() {
  const { selectedAccountId } = useSelectedAccount()
  const { data: transactions = [], isLoading, isError, error } = useTransactions()
  const deleteTransaction = useDeleteTransaction()
  const { currency: displayCurrency } = useCurrency()
  const { data: exchangeRate = 18.5 } = useExchangeRate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [symbolFilter, setSymbolFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [assetTypeFilter, setAssetTypeFilter] = useState('')
  const [taxYearFilter, setTaxYearFilter] = useState('')
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const bulkImport = useBulkImportTransactions()

  const taxYears = useMemo(() => getAllTaxYears(transactions), [transactions])

  const filtered = useMemo(() => {
    let result = transactions

    if (symbolFilter) {
      result = result.filter(t => t.symbol.toLowerCase().includes(symbolFilter.toLowerCase()))
    }
    if (typeFilter) {
      result = result.filter(t => t.transaction_type === typeFilter)
    }
    if (assetTypeFilter) {
      result = result.filter(t => t.asset_type === assetTypeFilter)
    }
    if (taxYearFilter) {
      const year = taxYears.find(y => y.label === taxYearFilter)
      if (year) {
        result = result.filter(t => isInTaxYear(t.transaction_date, year))
      }
    }

    return result
  }, [transactions, symbolFilter, typeFilter, assetTypeFilter, taxYearFilter, taxYears])

  if (!selectedAccountId || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-destructive font-medium mb-2">Failed to load transactions</p>
        <p className="text-muted-foreground text-sm mb-4 max-w-md">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Refresh page
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTransactionsCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const year = taxYearFilter ? taxYears.find(y => y.label === taxYearFilter) : undefined
              downloadTransactionStatement(filtered, 'Transaction Statement', year)
            }}
            disabled={filtered.length === 0}
          >
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <FileUp className="h-4 w-4" />
            Import
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Transaction
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Filter by symbol..."
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          className="w-40"
        />
        <Select
          options={[
            { value: '', label: 'All types' },
            { value: 'buy', label: 'Buy' },
            { value: 'sell', label: 'Sell' },
            { value: 'dividend', label: 'Dividend' },
          ]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-32"
        />
        <Select
          options={[
            { value: '', label: 'All assets' },
            { value: 'stock', label: 'Stocks' },
            { value: 'etf', label: 'ETFs' },
            { value: 'crypto', label: 'Crypto' },
          ]}
          value={assetTypeFilter}
          onChange={(e) => setAssetTypeFilter(e.target.value)}
          className="w-32"
        />
        <Select
          options={[
            { value: '', label: 'All tax years' },
            ...taxYears.map(y => ({ value: y.label, label: y.label })),
          ]}
          value={taxYearFilter}
          onChange={(e) => setTaxYearFilter(e.target.value)}
          className="w-40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No transactions found</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add your first transaction
          </Button>
        </div>
      ) : (
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((tx) => {
              const price = convertCurrency(tx.price_per_unit, tx.currency, displayCurrency, exchangeRate)
              const fees = convertCurrency(tx.fees, tx.currency, displayCurrency, exchangeRate)
              const total = price * tx.quantity + fees
              return (
                <TableRow key={tx.id}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(tx.transaction_date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">{tx.symbol}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tx.transaction_type === 'buy'
                          ? 'default'
                          : tx.transaction_type === 'sell'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {tx.transaction_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tx.asset_type.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(tx.quantity, 4)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(price, displayCurrency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(fees, displayCurrency)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(total, displayCurrency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingTx(tx)
                          setModalOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingTx(tx)}
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
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditingTx(null)
        }}
        editTransaction={editingTx}
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (rows) => {
          await bulkImport.mutateAsync(rows)
        }}
      />

      <Dialog open={!!deletingTx} onOpenChange={(open) => { if (!open) setDeletingTx(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Transaction
            </DialogTitle>
          </DialogHeader>
          {deletingTx && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this <span className="font-medium text-foreground">{deletingTx.transaction_type.toUpperCase()}</span> of <span className="font-medium text-foreground">{formatNumber(deletingTx.quantity, 4)} {deletingTx.symbol}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDeletingTx(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    deleteTransaction.mutate(deletingTx.id)
                    setDeletingTx(null)
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

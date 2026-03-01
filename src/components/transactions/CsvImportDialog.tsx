import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  parseCsvFile,
  parseCsvRow,
  type ColumnMapping,
  DEFAULT_COLUMN_MAPPING,
  type TransactionFormData,
} from '@/lib/csv-import'
import { Upload, Check, X } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (rows: TransactionFormData[]) => Promise<void>
}

export function CsvImportDialog({ open, onOpenChange, onImport }: Props) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_COLUMN_MAPPING)
  const [parsed, setParsed] = useState<{ data: TransactionFormData | null; error: string | null }[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      const { headers: h, rows: r } = parseCsvFile(text)
      setHeaders(h)
      setRows(r)
      setMapping((prev) => {
        const next = { ...prev }
        h.forEach((col) => {
          const lower = col.toLowerCase()
          if (!Object.values(next).includes(col)) {
            if (lower.includes('date')) next.date = col
            else if (lower.includes('symbol') || lower === 'ticker') next.symbol = col
            else if (lower.includes('name')) next.name = col
            else if (lower.includes('type') || lower.includes('action')) next.transaction_type = col
            else if (lower.includes('qty') || lower.includes('quantity') || lower.includes('shares'))
              next.quantity = col
            else if (lower.includes('price') || lower.includes('amount')) next.price_per_unit = col
            else if (lower.includes('currency')) next.currency = col
            else if (lower.includes('fee')) next.fees = col
            else if (lower.includes('asset')) next.asset_type = col
          }
        })
        return next
      })
      setStep(r.length > 0 ? 'mapping' : 'upload')
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const applyMapping = useCallback(() => {
    const results = rows.map((row) => parseCsvRow(row, mapping))
    setParsed(results)
    setStep('preview')
  }, [rows, mapping])

  const validRows = parsed.filter((p) => p.data != null) as { data: TransactionFormData }[]
  const invalidCount = parsed.filter((p) => p.error != null).length

  const handleImport = async () => {
    if (validRows.length === 0) return
    setIsImporting(true)
    try {
      await onImport(validRows.map((p) => p.data))
      onOpenChange(false)
      reset()
    } finally {
      setIsImporting(false)
    }
  }

  const reset = () => {
    setStep('upload')
    setHeaders([])
    setRows([])
    setMapping(DEFAULT_COLUMN_MAPPING)
    setParsed([])
  }

  const handleClose = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Transactions from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with columns for date, symbol, type, quantity, price, and optionally currency, fees,
              notes.
            </p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload CSV</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map your CSV columns to transaction fields. Detected {rows.length} rows.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {(['date', 'symbol', 'name', 'transaction_type', 'asset_type', 'quantity', 'price_per_unit', 'currency', 'fees', 'notes'] as const).map(
                (field) => (
                  <div key={field} className="flex items-center gap-2">
                    <label className="w-28 shrink-0 capitalize">{field.replace('_', ' ')}</label>
                    <Select
                      value={mapping[field]}
                      onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                      options={[
                        { value: '', label: '—' },
                        ...headers.map((h) => ({ value: h, label: h })),
                      ]}
                      className="flex-1"
                    />
                  </div>
                )
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={applyMapping}>Preview</Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {validRows.length} valid, {invalidCount} invalid. Review and import.
            </p>
            <div className="max-h-60 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.slice(0, 20).map((p, i) => (
                    <TableRow key={i} className={p.error ? 'bg-destructive/10' : ''}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      {p.data ? (
                        <>
                          <TableCell>{p.data.transaction_date}</TableCell>
                          <TableCell>{p.data.symbol}</TableCell>
                          <TableCell>{p.data.transaction_type}</TableCell>
                          <TableCell className="text-right">{p.data.quantity}</TableCell>
                          <TableCell className="text-right">{p.data.price_per_unit}</TableCell>
                          <TableCell>
                            <Check className="h-4 w-4 text-success" />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell colSpan={5} className="text-destructive text-xs">
                            {p.error}
                          </TableCell>
                          <TableCell>
                            <X className="h-4 w-4 text-destructive" />
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsed.length > 20 && (
              <p className="text-xs text-muted-foreground">Showing first 20 of {parsed.length} rows</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={validRows.length === 0 || isImporting}>
                {isImporting ? 'Importing...' : `Import ${validRows.length} transactions`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

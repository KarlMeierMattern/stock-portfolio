import type { Transaction } from '@/types/database'

const CSV_HEADERS = [
  'date',
  'symbol',
  'name',
  'asset_type',
  'transaction_type',
  'quantity',
  'price_per_unit',
  'currency',
  'fees',
  'notes',
] as const

export function exportTransactionsToCsv(transactions: Transaction[]): string {
  const rows = [
    CSV_HEADERS.join(','),
    ...transactions.map((tx) =>
      CSV_HEADERS.map((h) => {
        const val = tx[h as keyof Transaction]
        if (val == null) return ''
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    ),
  ]
  return rows.join('\n')
}

export function downloadTransactionsCsv(transactions: Transaction[], filename = 'transactions.csv') {
  const csv = exportTransactionsToCsv(transactions)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

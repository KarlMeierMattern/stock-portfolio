import { z } from 'zod/v4'

export const transactionSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(20).transform((s) => s.toUpperCase().trim()),
  name: z.string().optional().transform((s) => s?.trim() || undefined),
  asset_type: z.enum(['stock', 'etf', 'crypto']),
  transaction_type: z.enum(['buy', 'sell', 'dividend']),
  quantity: z.number().positive('Quantity must be positive'),
  price_per_unit: z.number().positive('Price must be positive'),
  currency: z.enum(['USD', 'ZAR']),
  fees: z.number().min(0, 'Fees cannot be negative').default(0),
  transaction_date: z.string().min(1, 'Date is required'),
  notes: z.string().optional().transform((s) => s?.trim() || undefined),
})

export type TransactionFormData = z.infer<typeof transactionSchema>

export type ColumnMapping = {
  date: string
  symbol: string
  name: string
  asset_type: string
  transaction_type: string
  quantity: string
  price_per_unit: string
  currency: string
  fees: string
  notes: string
}

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  date: 'date',
  symbol: 'symbol',
  name: 'name',
  asset_type: 'asset_type',
  transaction_type: 'transaction_type',
  quantity: 'quantity',
  price_per_unit: 'price_per_unit',
  currency: 'currency',
  fees: 'fees',
  notes: 'notes',
}

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
]

function parseDate(val: string): string | null {
  const s = val.trim()
  if (!s) return null
  for (const p of DATE_PATTERNS) {
    if (p.test(s)) {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
  }
  return null
}

function parseNumber(val: string): number | null {
  const s = val.trim().replace(/,/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseType(val: string): 'buy' | 'sell' | 'dividend' | null {
  const s = val.trim().toLowerCase()
  if (['buy', 'b'].includes(s)) return 'buy'
  if (['sell', 's'].includes(s)) return 'sell'
  if (['dividend', 'div', 'd'].includes(s)) return 'dividend'
  return null
}

function parseAssetType(val: string): 'stock' | 'etf' | 'crypto' | null {
  const s = val.trim().toLowerCase()
  if (['stock', 'stocks', 'equity'].includes(s)) return 'stock'
  if (['etf', 'etfs'].includes(s)) return 'etf'
  if (['crypto', 'cryptocurrency'].includes(s)) return 'crypto'
  return null
}

function parseCurrency(val: string): 'USD' | 'ZAR' | null {
  const s = val.trim().toUpperCase()
  if (['USD', 'US$', '$'].includes(s)) return 'USD'
  if (['ZAR', 'R', 'RAND'].includes(s)) return 'ZAR'
  return null
}

export function parseCsvRow(
  row: Record<string, string>,
  mapping: ColumnMapping
): { data: TransactionFormData | null; error: string | null } {
  const get = (field: keyof ColumnMapping) => row[mapping[field]]?.trim() ?? ''

  const date = parseDate(get('date'))
  const symbol = get('symbol')
  const quantity = parseNumber(get('quantity'))
  const price = parseNumber(get('price_per_unit'))
  const currency = parseCurrency(get('currency')) ?? 'USD'
  const fees = parseNumber(get('fees')) ?? 0
  const transaction_type = parseType(get('transaction_type')) ?? 'buy'
  const asset_type = parseAssetType(get('asset_type')) ?? 'stock'

  if (!date) return { data: null, error: 'Invalid or missing date' }
  if (!symbol) return { data: null, error: 'Invalid or missing symbol' }
  if (quantity == null || quantity <= 0) return { data: null, error: 'Invalid or missing quantity' }
  if (price == null || price <= 0) return { data: null, error: 'Invalid or missing price' }

  const parsed = {
    symbol,
    name: get('name') || undefined,
    asset_type,
    transaction_type,
    quantity,
    price_per_unit: price,
    currency,
    fees,
    transaction_date: date,
    notes: get('notes') || undefined,
  }

  const result = transactionSchema.safeParse(parsed)
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join('; ')
    return { data: null, error: msg }
  }
  return { data: result.data, error: null }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  result.push(current.trim())
  return result
}

export function parseCsvFile(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? ''
    })
    return obj
  })

  return { headers, rows }
}

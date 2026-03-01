import { z } from 'zod/v4'

export const transactionSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(20),
  name: z.string().optional(),
  asset_type: z.enum(['stock', 'etf', 'crypto']),
  transaction_type: z.enum(['buy', 'sell', 'dividend']),
  quantity: z.number().positive('Quantity must be positive'),
  price_per_unit: z.number().positive('Price must be positive'),
  currency: z.enum(['USD', 'ZAR']),
  fees: z.number().min(0, 'Fees cannot be negative').default(0),
  transaction_date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
})

export type TransactionFormData = z.infer<typeof transactionSchema>

import type { Transaction } from '@/types/database'
import { isInTaxYear, type TaxYear } from './tax-utils'

export type GainLot = {
  buyTransaction: Transaction
  sellTransaction: Transaction
  quantity: number
  costBasis: number
  proceeds: number
  gain: number
  currency: 'USD' | 'ZAR'
}

export type CapitalGainsSummary = {
  totalProceeds: number
  totalCostBasis: number
  totalFees: number
  realizedGains: number
  lots: GainLot[]
}

/**
 * FIFO capital gains calculation.
 * Matches sell transactions against buy transactions in chronological order.
 */
export function calculateCapitalGains(
  transactions: Transaction[],
  taxYear?: TaxYear,
  currency: 'USD' | 'ZAR' = 'ZAR'
): CapitalGainsSummary {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  )

  // Build buy lots per symbol: { symbol: [{ tx, remainingQty }] }
  const buyLots: Record<string, { tx: Transaction; remainingQty: number }[]> = {}
  const lots: GainLot[] = []

  for (const tx of sorted) {
    if (tx.transaction_type === 'buy') {
      if (!buyLots[tx.symbol]) buyLots[tx.symbol] = []
      buyLots[tx.symbol].push({ tx, remainingQty: tx.quantity })
      continue
    }

    // Sell transaction — match against FIFO buy lots
    if (taxYear && !isInTaxYear(tx.transaction_date, taxYear)) continue

    const symbolLots = buyLots[tx.symbol] || []
    let remainingToSell = tx.quantity

    for (const lot of symbolLots) {
      if (remainingToSell <= 0) break
      if (lot.remainingQty <= 0) continue

      const matchedQty = Math.min(lot.remainingQty, remainingToSell)
      const costBasis = matchedQty * lot.tx.price_per_unit
      const proceeds = matchedQty * tx.price_per_unit

      lots.push({
        buyTransaction: lot.tx,
        sellTransaction: tx,
        quantity: matchedQty,
        costBasis,
        proceeds,
        gain: proceeds - costBasis,
        currency: tx.currency,
      })

      lot.remainingQty -= matchedQty
      remainingToSell -= matchedQty
    }
  }

  const filteredLots = currency === 'ZAR' ? lots : lots
  const totalProceeds = filteredLots.reduce((sum, l) => sum + l.proceeds, 0)
  const totalCostBasis = filteredLots.reduce((sum, l) => sum + l.costBasis, 0)
  const totalFees = filteredLots.reduce(
    (sum, l) => sum + l.sellTransaction.fees + l.buyTransaction.fees * (l.quantity / l.buyTransaction.quantity),
    0
  )

  return {
    totalProceeds,
    totalCostBasis,
    totalFees,
    realizedGains: totalProceeds - totalCostBasis - totalFees,
    lots,
  }
}

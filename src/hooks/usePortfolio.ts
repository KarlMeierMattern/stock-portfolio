import { useMemo } from 'react'
import { useTransactions } from './useTransactions'
import { usePrices, useExchangeRate } from './usePrices'
import { useCurrency } from './useCurrency'
import type { AssetType } from '@/types/database'

export type PortfolioHolding = {
  symbol: string
  name: string | null
  asset_type: AssetType
  quantity: number
  avgCostUsd: number
  avgCostZar: number
  totalInvestedUsd: number
  totalInvestedZar: number
  currentPriceUsd: number | null
  currentPriceZar: number | null
  previousCloseUsd: number | null
  currentValueUsd: number | null
  currentValueZar: number | null
  dayGainUsd: number | null
  dayGainPercent: number | null
  totalGainUsd: number | null
  totalGainZar: number | null
  totalGainPercent: number | null
  portfolioPercent: number
}

export function usePortfolio() {
  const { data: transactions = [], isLoading: txLoading } = useTransactions()
  const { data: exchangeRate = 18.5 } = useExchangeRate()
  const { currency } = useCurrency()

  const symbols = useMemo(() => {
    const symbolSet = new Set<string>()
    for (const tx of transactions) {
      symbolSet.add(tx.symbol)
    }
    return Array.from(symbolSet)
  }, [transactions])

  const { data: prices = {}, isLoading: pricesLoading } = usePrices(symbols)

  const holdings = useMemo((): PortfolioHolding[] => {
    const holdingsMap: Record<string, {
      symbol: string
      name: string | null
      asset_type: AssetType
      totalQty: number
      totalCostUsd: number
      totalCostZar: number
    }> = {}

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    )

    for (const tx of sorted) {
      if (!holdingsMap[tx.symbol]) {
        holdingsMap[tx.symbol] = {
          symbol: tx.symbol,
          name: tx.name,
          asset_type: tx.asset_type,
          totalQty: 0,
          totalCostUsd: 0,
          totalCostZar: 0,
        }
      }

      const h = holdingsMap[tx.symbol]
      const priceUsd = tx.currency === 'USD' ? tx.price_per_unit : tx.price_per_unit / exchangeRate
      const priceZar = tx.currency === 'ZAR' ? tx.price_per_unit : tx.price_per_unit * exchangeRate

      if (tx.transaction_type === 'dividend') continue
      if (tx.transaction_type === 'buy') {
        h.totalCostUsd += priceUsd * tx.quantity
        h.totalCostZar += priceZar * tx.quantity
        h.totalQty += tx.quantity
      } else {
        const fraction = Math.min(tx.quantity / h.totalQty, 1)
        h.totalCostUsd -= h.totalCostUsd * fraction
        h.totalCostZar -= h.totalCostZar * fraction
        h.totalQty -= tx.quantity
      }

      if (tx.name && !h.name) h.name = tx.name
    }

    const activeHoldings = Object.values(holdingsMap).filter(h => h.totalQty > 0.0001)

    const totalPortfolioValue = activeHoldings.reduce((sum, h) => {
      const price = prices[h.symbol]
      const val = price?.price_usd ? price.price_usd * h.totalQty : h.totalCostUsd / (h.totalQty || 1) * h.totalQty
      return sum + val
    }, 0)

    return activeHoldings.map(h => {
      const price = prices[h.symbol]
      const currentPriceUsd = price?.price_usd ?? null
      const currentPriceZar = price?.price_zar ?? null
      const previousCloseUsd = price?.previous_close_usd ?? null

      const currentValueUsd = currentPriceUsd ? currentPriceUsd * h.totalQty : null
      const currentValueZar = currentPriceZar ? currentPriceZar * h.totalQty : null

      const dayGainUsd = currentPriceUsd && previousCloseUsd
        ? (currentPriceUsd - previousCloseUsd) * h.totalQty
        : null
      const dayGainPercent = currentPriceUsd && previousCloseUsd
        ? ((currentPriceUsd - previousCloseUsd) / previousCloseUsd) * 100
        : null

      const totalGainUsd = currentValueUsd ? currentValueUsd - h.totalCostUsd : null
      const totalGainZar = currentValueZar ? currentValueZar - h.totalCostZar : null
      const totalGainPercent = totalGainUsd && h.totalCostUsd
        ? (totalGainUsd / h.totalCostUsd) * 100
        : null

      const valueForPercent = currentValueUsd ?? h.totalCostUsd
      const portfolioPercent = totalPortfolioValue > 0
        ? (valueForPercent / totalPortfolioValue) * 100
        : 0

      return {
        symbol: h.symbol,
        name: h.name,
        asset_type: h.asset_type,
        quantity: h.totalQty,
        avgCostUsd: h.totalQty > 0 ? h.totalCostUsd / h.totalQty : 0,
        avgCostZar: h.totalQty > 0 ? h.totalCostZar / h.totalQty : 0,
        totalInvestedUsd: h.totalCostUsd,
        totalInvestedZar: h.totalCostZar,
        currentPriceUsd,
        currentPriceZar,
        previousCloseUsd,
        currentValueUsd,
        currentValueZar,
        dayGainUsd,
        dayGainPercent,
        totalGainUsd,
        totalGainZar,
        totalGainPercent,
        portfolioPercent,
      }
    }).sort((a, b) => (b.currentValueUsd ?? 0) - (a.currentValueUsd ?? 0))
  }, [transactions, prices, exchangeRate])

  const totals = useMemo(() => {
    const totalValueUsd = holdings.reduce((sum, h) => sum + (h.currentValueUsd ?? h.totalInvestedUsd), 0)
    const totalValueZar = holdings.reduce((sum, h) => sum + (h.currentValueZar ?? h.totalInvestedZar), 0)
    const totalInvestedUsd = holdings.reduce((sum, h) => sum + h.totalInvestedUsd, 0)
    const totalInvestedZar = holdings.reduce((sum, h) => sum + h.totalInvestedZar, 0)
    const totalDayGainUsd = holdings.reduce((sum, h) => sum + (h.dayGainUsd ?? 0), 0)
    const totalDayGainZar = totalDayGainUsd * exchangeRate
    const totalGainUsd = totalValueUsd - totalInvestedUsd
    const totalGainZar = totalValueZar - totalInvestedZar
    const totalGainPercent = totalInvestedUsd > 0 ? (totalGainUsd / totalInvestedUsd) * 100 : 0
    const dayGainPercent = totalInvestedUsd > 0 ? (totalDayGainUsd / (totalValueUsd - totalDayGainUsd)) * 100 : 0

    const totalDividendsUsd = transactions
      .filter(t => t.transaction_type === 'dividend')
      .reduce((sum, t) => {
        const amt = t.quantity * t.price_per_unit
        return sum + (t.currency === 'USD' ? amt : amt / exchangeRate)
      }, 0)
    const totalDividendsZar = totalDividendsUsd * exchangeRate

    return {
      totalValueUsd,
      totalValueZar,
      totalInvestedUsd,
      totalInvestedZar,
      totalDayGainUsd,
      totalDayGainZar,
      totalGainUsd,
      totalGainZar,
      totalGainPercent,
      dayGainPercent,
      totalDividendsUsd,
      totalDividendsZar,
    }
  }, [holdings, exchangeRate, transactions])

  const allocationByType = useMemo(() => {
    const map: Record<AssetType, number> = { stock: 0, etf: 0, crypto: 0 }
    for (const h of holdings) {
      const value = currency === 'USD'
        ? (h.currentValueUsd ?? h.totalInvestedUsd)
        : (h.currentValueZar ?? h.totalInvestedZar)
      map[h.asset_type] += value
    }
    return map
  }, [holdings, currency])

  return {
    holdings,
    totals,
    allocationByType,
    isLoading: txLoading || pricesLoading,
    exchangeRate,
  }
}

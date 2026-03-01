import { useMemo } from 'react'
import { useTransactions } from './useTransactions'
import { calculateCapitalGains, type CapitalGainsSummary } from '@/lib/capital-gains'
import { getCurrentTaxYear, getAllTaxYears, SA_CGT_ANNUAL_EXCLUSION, type TaxYear } from '@/lib/tax-utils'

export function useCapitalGains(taxYear?: TaxYear) {
  const { data: transactions = [] } = useTransactions()

  const year = taxYear ?? getCurrentTaxYear()

  const summary = useMemo((): CapitalGainsSummary => {
    return calculateCapitalGains(transactions, year)
  }, [transactions, year])

  const allowanceUsed = Math.max(0, summary.realizedGains)
  const allowanceRemaining = Math.max(0, SA_CGT_ANNUAL_EXCLUSION - allowanceUsed)

  const taxYears = useMemo(() => getAllTaxYears(transactions), [transactions])

  return {
    summary,
    allowanceUsed,
    allowanceRemaining,
    exclusionAmount: SA_CGT_ANNUAL_EXCLUSION,
    currentTaxYear: year,
    taxYears,
  }
}

import { format, parse, isAfter, isBefore, isEqual } from 'date-fns'

export const SA_CGT_ANNUAL_EXCLUSION = 40000

export type TaxYear = {
  label: string
  start: Date
  end: Date
}

export function getTaxYear(date: Date): TaxYear {
  const year = date.getFullYear()
  const month = date.getMonth()

  // SA tax year: 1 March to 28/29 February
  // If month >= March (2), tax year starts this year
  // If month < March, tax year started previous year
  const startYear = month >= 2 ? year : year - 1
  const endYear = startYear + 1

  return {
    label: `${startYear}/${endYear}`,
    start: new Date(startYear, 2, 1), // 1 March
    end: new Date(endYear, 1, 28),    // 28 Feb (simplified)
  }
}

export function getCurrentTaxYear(): TaxYear {
  return getTaxYear(new Date())
}

export function getAllTaxYears(transactions: { transaction_date: string }[]): TaxYear[] {
  if (transactions.length === 0) return [getCurrentTaxYear()]

  const dates = transactions.map(t => parse(t.transaction_date, 'yyyy-MM-dd', new Date()))
  const earliest = dates.reduce((a, b) => (isBefore(a, b) ? a : b))
  const current = getCurrentTaxYear()
  const firstTaxYear = getTaxYear(earliest)

  const years: TaxYear[] = []
  let startYear = firstTaxYear.start.getFullYear()
  const endStartYear = current.start.getFullYear()

  while (startYear <= endStartYear) {
    years.push({
      label: `${startYear}/${startYear + 1}`,
      start: new Date(startYear, 2, 1),
      end: new Date(startYear + 1, 1, 28),
    })
    startYear++
  }

  return years.reverse()
}

export function isInTaxYear(dateStr: string, taxYear: TaxYear): boolean {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date())
  return (isAfter(date, taxYear.start) || isEqual(date, taxYear.start)) &&
         (isBefore(date, taxYear.end) || isEqual(date, taxYear.end))
}

export function formatTaxYearLabel(taxYear: TaxYear): string {
  return `${format(taxYear.start, 'dd MMM yyyy')} – ${format(taxYear.end, 'dd MMM yyyy')}`
}

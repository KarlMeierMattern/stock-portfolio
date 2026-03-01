import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { StatementTemplate } from '@/components/pdf/StatementTemplate'
import { TaxReportTemplate } from '@/components/pdf/TaxReportTemplate'
import type { Transaction } from '@/types/database'
import type { CapitalGainsSummary } from '@/lib/capital-gains'
import type { TaxYear } from '@/lib/tax-utils'

async function downloadPdf(doc: React.ReactElement<any>, filename: string) {
  const blob = await pdf(doc as any).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function downloadTransactionStatement(
  transactions: Transaction[],
  title?: string,
  taxYear?: TaxYear
) {
  const doc = createElement(StatementTemplate, { transactions, title, taxYear })
  const filename = `transaction-statement-${new Date().toISOString().split('T')[0]}.pdf`
  await downloadPdf(doc, filename)
}

export async function downloadTaxReport(
  summary: CapitalGainsSummary,
  taxYear: TaxYear,
  allowanceUsed: number,
  allowanceRemaining: number,
  exclusionAmount: number
) {
  const doc = createElement(TaxReportTemplate, {
    summary, taxYear, allowanceUsed, allowanceRemaining, exclusionAmount,
  })
  const filename = `tax-report-${taxYear.label.replace('/', '-')}.pdf`
  await downloadPdf(doc, filename)
}

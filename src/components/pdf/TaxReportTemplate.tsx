import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { CapitalGainsSummary, GainLot } from '@/lib/capital-gains'
import type { TaxYear } from '@/lib/tax-utils'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  header: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666', marginBottom: 2 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 4 },
  summaryBox: { padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { color: '#666' },
  summaryValue: { fontWeight: 'bold' },
  alertBox: { padding: 10, backgroundColor: '#fef2f2', borderRadius: 4, borderWidth: 1, borderColor: '#fee2e2', marginTop: 8 },
  successBox: { padding: 10, backgroundColor: '#f0fdf4', borderRadius: 4, borderWidth: 1, borderColor: '#dcfce7', marginTop: 8 },
  table: { marginTop: 10 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  col1: { width: '12%' },
  col2: { width: '12%' },
  col3: { width: '12%' },
  col4: { width: '8%', textAlign: 'right' },
  col5: { width: '16%', textAlign: 'right' },
  col6: { width: '16%', textAlign: 'right' },
  col7: { width: '16%', textAlign: 'right' },
  footer: { marginTop: 20, fontSize: 8, color: '#999', textAlign: 'center' },
  positive: { color: '#16a34a' },
  negative: { color: '#dc2626' },
})

type Props = {
  summary: CapitalGainsSummary
  taxYear: TaxYear
  allowanceUsed: number
  allowanceRemaining: number
  exclusionAmount: number
}

export function TaxReportTemplate({ summary, taxYear, allowanceUsed, allowanceRemaining, exclusionAmount }: Props) {
  const isOverLimit = allowanceRemaining <= 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Capital Gains Tax Report</Text>
          <Text style={styles.subtitle}>
            Tax Year: {taxYear.start.toLocaleDateString()} – {taxYear.end.toLocaleDateString()}
          </Text>
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Proceeds</Text>
            <Text style={styles.summaryValue}>R {summary.totalProceeds.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Cost Basis</Text>
            <Text style={styles.summaryValue}>R {summary.totalCostBasis.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Fees</Text>
            <Text style={styles.summaryValue}>R {summary.totalFees.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Realized Gains/Losses</Text>
            <Text style={[styles.summaryValue, summary.realizedGains >= 0 ? styles.positive : styles.negative]}>
              R {summary.realizedGains.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={isOverLimit ? styles.alertBox : styles.successBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Annual CGT Exclusion</Text>
            <Text>R {exclusionAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Allowance Used</Text>
            <Text style={styles.summaryValue}>R {allowanceUsed.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Allowance Remaining</Text>
            <Text style={[styles.summaryValue, isOverLimit ? styles.negative : styles.positive]}>
              R {allowanceRemaining.toFixed(2)}
            </Text>
          </View>
        </View>

        {isOverLimit && (
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Capital Gain Exceeding Exclusion</Text>
              <Text style={styles.summaryValue}>R {(summary.realizedGains - exclusionAmount).toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Inclusion Rate (40%)</Text>
              <Text style={styles.summaryValue}>R {((summary.realizedGains - exclusionAmount) * 0.4).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#ddd' }}>
              <Text style={[styles.summaryLabel, { fontWeight: 'bold', color: '#000' }]}>Amount Added to Taxable Income</Text>
              <Text style={[styles.summaryValue, styles.negative]}>
                R {((summary.realizedGains - exclusionAmount) * 0.4).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sale Breakdown (FIFO Method)</Text>

          {summary.lots.length === 0 ? (
            <Text>No sales recorded in this tax year.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col1}>Symbol</Text>
                <Text style={styles.col2}>Buy Date</Text>
                <Text style={styles.col3}>Sell Date</Text>
                <Text style={styles.col4}>Qty</Text>
                <Text style={styles.col5}>Cost Basis</Text>
                <Text style={styles.col6}>Proceeds</Text>
                <Text style={styles.col7}>Gain/Loss</Text>
              </View>

              {summary.lots.map((lot: GainLot, idx: number) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.col1}>{lot.sellTransaction.symbol}</Text>
                  <Text style={styles.col2}>{lot.buyTransaction.transaction_date}</Text>
                  <Text style={styles.col3}>{lot.sellTransaction.transaction_date}</Text>
                  <Text style={styles.col4}>{lot.quantity.toFixed(4)}</Text>
                  <Text style={styles.col5}>R {lot.costBasis.toFixed(2)}</Text>
                  <Text style={styles.col6}>R {lot.proceeds.toFixed(2)}</Text>
                  <Text style={[styles.col7, lot.gain >= 0 ? styles.positive : styles.negative]}>
                    R {lot.gain.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          This report is for personal record-keeping purposes and does not constitute tax advice.
          Consult a registered tax practitioner for official SARS submissions.
        </Text>
      </Page>
    </Document>
  )
}

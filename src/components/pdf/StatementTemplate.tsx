import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Transaction } from '@/types/database'
import type { TaxYear } from '@/lib/tax-utils'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  header: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666', marginBottom: 2 },
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
  col2: { width: '10%' },
  col3: { width: '8%' },
  col4: { width: '8%' },
  col5: { width: '12%', textAlign: 'right' },
  col6: { width: '14%', textAlign: 'right' },
  col7: { width: '10%', textAlign: 'right' },
  col8: { width: '14%', textAlign: 'right' },
  col9: { width: '12%' },
  footer: { marginTop: 20, fontSize: 8, color: '#999', textAlign: 'center' },
  summary: { marginTop: 16, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
})

type Props = {
  transactions: Transaction[]
  title?: string
  taxYear?: TaxYear
}

export function StatementTemplate({ transactions, title = 'Transaction Statement', taxYear }: Props) {
  const totalBuys = transactions
    .filter(t => t.transaction_type === 'buy')
    .reduce((sum, t) => sum + t.quantity * t.price_per_unit + t.fees, 0)

  const totalSells = transactions
    .filter(t => t.transaction_type === 'sell')
    .reduce((sum, t) => sum + t.quantity * t.price_per_unit - t.fees, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {taxYear && (
            <Text style={styles.subtitle}>
              Tax Year: {taxYear.start.toLocaleDateString()} – {taxYear.end.toLocaleDateString()}
            </Text>
          )}
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString()} | Total transactions: {transactions.length}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Date</Text>
            <Text style={styles.col2}>Symbol</Text>
            <Text style={styles.col3}>Type</Text>
            <Text style={styles.col4}>Asset</Text>
            <Text style={styles.col5}>Qty</Text>
            <Text style={styles.col6}>Price</Text>
            <Text style={styles.col7}>Fees</Text>
            <Text style={styles.col8}>Total</Text>
            <Text style={styles.col9}>Currency</Text>
          </View>

          {transactions.map((tx) => (
            <View key={tx.id} style={styles.tableRow}>
              <Text style={styles.col1}>{tx.transaction_date}</Text>
              <Text style={styles.col2}>{tx.symbol}</Text>
              <Text style={styles.col3}>{tx.transaction_type.toUpperCase()}</Text>
              <Text style={styles.col4}>{tx.asset_type.toUpperCase()}</Text>
              <Text style={styles.col5}>{tx.quantity.toFixed(4)}</Text>
              <Text style={styles.col6}>{tx.price_per_unit.toFixed(2)}</Text>
              <Text style={styles.col7}>{tx.fees.toFixed(2)}</Text>
              <Text style={styles.col8}>{(tx.quantity * tx.price_per_unit + tx.fees).toFixed(2)}</Text>
              <Text style={styles.col9}>{tx.currency}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text>Total Purchases:</Text>
            <Text>{totalBuys.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Total Sales:</Text>
            <Text>{totalSells.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This statement is for personal record-keeping purposes only.
        </Text>
      </Page>
    </Document>
  )
}

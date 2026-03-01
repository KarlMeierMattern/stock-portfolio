import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/hooks/useTransactions";
import { useCurrency } from "@/hooks/useCurrency";
import { useExchangeRate } from "@/hooks/usePrices";
import { formatCurrency, formatNumber, convertCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export function RecentTransactions() {
  const { data: transactions = [] } = useTransactions();
  const { currency } = useCurrency();
  const { data: exchangeRate = 18.5 } = useExchangeRate();

  const recent = transactions.slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
        <Link
          to="/transactions"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <Table className="min-w-[500px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Symbol</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs text-right">Qty</TableHead>
              <TableHead className="text-xs text-right">Price</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((tx) => {
              const price = convertCurrency(
                tx.price_per_unit,
                tx.currency,
                currency,
                exchangeRate,
              );
              const total = price * tx.quantity;

              return (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs">
                    {format(new Date(tx.transaction_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {tx.symbol}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tx.transaction_type === "buy"
                          ? "default"
                          : tx.transaction_type === "sell"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tx.transaction_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatNumber(tx.quantity, 4)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCurrency(price, currency)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    {formatCurrency(total, currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

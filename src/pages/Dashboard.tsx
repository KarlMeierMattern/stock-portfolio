import { useState } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useBackfillSnapshots, runBackfill } from "@/hooks/useBackfill";
import { useWipePortfolio } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedAccount } from "@/hooks/useAccounts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PortfolioValueCard } from "@/components/dashboard/PortfolioValueCard";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { AllocationPie } from "@/components/dashboard/AllocationPie";
import { CapitalGainsCard } from "@/components/dashboard/CapitalGainsCard";
import { AlertsCard } from "@/components/dashboard/AlertsCard";
import { BenchmarkCard } from "@/components/dashboard/BenchmarkCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCw, Trash2, AlertTriangle, Database, Plus } from "lucide-react";

const DEMO_TRANSACTIONS = [
  { symbol: 'AAPL',  name: 'Apple Inc.',          asset_type: 'stock',  transaction_type: 'buy',  quantity: 50,   price_per_unit: 178.50, currency: 'USD', fees: 4.99, transaction_date: '2025-06-15', notes: 'Initial position' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',        asset_type: 'stock',  transaction_type: 'buy',  quantity: 30,   price_per_unit: 142.20, currency: 'USD', fees: 4.99, transaction_date: '2025-07-01', notes: null },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',      asset_type: 'stock',  transaction_type: 'buy',  quantity: 40,   price_per_unit: 415.80, currency: 'USD', fees: 4.99, transaction_date: '2025-08-10', notes: null },
  { symbol: 'VOO',   name: 'Vanguard S&P 500 ETF', asset_type: 'etf',    transaction_type: 'buy',  quantity: 20,   price_per_unit: 478.30, currency: 'USD', fees: 0,    transaction_date: '2025-09-01', notes: 'Core ETF holding' },
  { symbol: 'BTC',   name: 'Bitcoin',              asset_type: 'crypto', transaction_type: 'buy',  quantity: 0.5,  price_per_unit: 62400,  currency: 'USD', fees: 15,   transaction_date: '2025-09-15', notes: null },
  { symbol: 'TSLA',  name: 'Tesla Inc.',           asset_type: 'stock',  transaction_type: 'buy',  quantity: 25,   price_per_unit: 248.90, currency: 'USD', fees: 4.99, transaction_date: '2025-10-01', notes: null },
  { symbol: 'AAPL',  name: 'Apple Inc.',          asset_type: 'stock',  transaction_type: 'buy',  quantity: 20,   price_per_unit: 185.30, currency: 'USD', fees: 4.99, transaction_date: '2025-11-05', notes: 'Added to position' },
  { symbol: 'ETH',   name: 'Ethereum',             asset_type: 'crypto', transaction_type: 'buy',  quantity: 3,    price_per_unit: 3250,   currency: 'USD', fees: 8,    transaction_date: '2025-11-20', notes: null },
  { symbol: 'AAPL',  name: 'Apple Inc.',          asset_type: 'stock',  transaction_type: 'sell', quantity: 30,   price_per_unit: 195.60, currency: 'USD', fees: 4.99, transaction_date: '2025-12-15', notes: 'Took partial profits' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',           asset_type: 'stock',  transaction_type: 'sell', quantity: 25,   price_per_unit: 310.40, currency: 'USD', fees: 4.99, transaction_date: '2026-01-10', notes: 'Sold full position' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',         asset_type: 'stock',  transaction_type: 'buy',  quantity: 15,   price_per_unit: 680.50, currency: 'USD', fees: 4.99, transaction_date: '2026-01-20', notes: null },
  { symbol: 'VOO',   name: 'Vanguard S&P 500 ETF', asset_type: 'etf',    transaction_type: 'buy',  quantity: 10,   price_per_unit: 495.10, currency: 'USD', fees: 0,    transaction_date: '2026-02-01', notes: 'DCA' },
  { symbol: 'BTC',   name: 'Bitcoin',              asset_type: 'crypto', transaction_type: 'sell', quantity: 0.2,  price_per_unit: 85000,  currency: 'USD', fees: 12,   transaction_date: '2026-02-10', notes: 'Partial sell' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',        asset_type: 'stock',  transaction_type: 'sell', quantity: 15,   price_per_unit: 168.90, currency: 'USD', fees: 4.99, transaction_date: '2026-02-20', notes: 'Rebalance' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',      asset_type: 'stock',  transaction_type: 'buy',  quantity: 20,   price_per_unit: 198.40, currency: 'USD', fees: 4.99, transaction_date: '2026-02-28', notes: 'New position' },
] as const

export default function Dashboard() {
  const { totals, allocationByType, isLoading, holdings } = usePortfolio();
  const backfill = useBackfillSnapshots();
  const wipe = useWipePortfolio();
  const [wipeOpen, setWipeOpen] = useState(false);
  const { user } = useAuth();
  const { selectedAccountId } = useSelectedAccount();
  const queryClient = useQueryClient();

  const seed = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      if (!selectedAccountId) throw new Error('No account selected')
      const rows = DEMO_TRANSACTIONS.map(tx => ({ ...tx, user_id: user.id, account_id: selectedAccountId }))
      const { error } = await supabase.from('transactions').insert(rows as never[])
      if (error) throw error
      await runBackfill(user.id, selectedAccountId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['snapshots'] })
      toast.success('Demo data seeded')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to seed demo')
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-16 text-center">
          <p className="text-lg font-medium text-foreground mb-2">No holdings yet</p>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Add your first transaction to start tracking your portfolio performance.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
              <Database className={`h-4 w-4 ${seed.isPending ? "animate-spin" : ""}`} />
              {seed.isPending ? "Seeding..." : "Seed Demo"}
            </Button>
            <Link
              to="/transactions"
              className={buttonVariants({ variant: "outline" })}
            >
              <Plus className="h-4 w-4" />
              Add Transaction
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          {holdings.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seed.mutate()}
              disabled={seed.isPending}
            >
              <Database className={`h-4 w-4 ${seed.isPending ? "animate-spin" : ""}`} />
              {seed.isPending ? "Seeding..." : "Seed Demo"}
            </Button>
          )}
          {holdings.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWipeOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => backfill.mutate()}
                disabled={backfill.isPending}
              >
                <RefreshCw
                  className={`h-4 w-4 ${backfill.isPending ? "animate-spin" : ""}`}
                />
                {backfill.isPending ? "Syncing..." : "Sync Prices"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <PortfolioValueCard
            totalValueUsd={totals.totalValueUsd}
            totalValueZar={totals.totalValueZar}
            totalGainUsd={totals.totalGainUsd}
            totalGainZar={totals.totalGainZar}
            totalGainPercent={totals.totalGainPercent}
            dayGainUsd={totals.totalDayGainUsd}
            dayGainZar={totals.totalDayGainZar}
            dayGainPercent={totals.dayGainPercent}
            totalDividendsUsd={totals.totalDividendsUsd}
            totalDividendsZar={totals.totalDividendsZar}
          />
          <PerformanceChart />
          <BenchmarkCard />
        </div>

        <div className="space-y-4">
          <CapitalGainsCard />
          <AllocationPie allocation={allocationByType} />
          <RecentTransactions />
        </div>
      </div>

      <AlertsCard />

      <Dialog open={wipeOpen} onOpenChange={setWipeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reset Portfolio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will permanently delete <span className="font-medium text-foreground">all transactions, snapshots, and alert settings</span>. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setWipeOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={wipe.isPending}
                onClick={() => {
                  wipe.mutate(undefined, { onSuccess: () => setWipeOpen(false) })
                }}
              >
                {wipe.isPending ? "Deleting..." : "Delete Everything"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

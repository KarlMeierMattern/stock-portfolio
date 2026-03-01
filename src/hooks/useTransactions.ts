import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useSelectedAccount } from './useAccounts'
import { runBackfill } from './useBackfill'
import type { Transaction } from '@/types/database'
import type { TransactionFormData } from '@/lib/validators'

export function useWipePortfolio() {
  const { user } = useAuth()
  const { selectedAccountId } = useSelectedAccount()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      if (!selectedAccountId) throw new Error('No account selected')
      await supabase.from('portfolio_snapshots').delete().eq('account_id', selectedAccountId)
      await supabase.from('alerts').delete().eq('user_id', user.id)
      await supabase.from('alert_settings').delete().eq('user_id', user.id)
      await supabase.from('transactions').delete().eq('account_id', selectedAccountId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['snapshots'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] })
      toast.success('Portfolio reset')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to reset portfolio')
    },
  })
}

export function useTransactions() {
  const { user } = useAuth()
  const { selectedAccountId } = useSelectedAccount()

  return useQuery({
    queryKey: ['transactions', user?.id, selectedAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', selectedAccountId!)
        .order('transaction_date', { ascending: false })

      if (error) throw error
      return (data ?? []) as Transaction[]
    },
    enabled: !!user && !!selectedAccountId,
  })
}

export function useAddTransaction() {
  const { user } = useAuth()
  const { selectedAccountId } = useSelectedAccount()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TransactionFormData) => {
      if (!selectedAccountId) throw new Error('No account selected')
      const { error } = await supabase.from('transactions').insert({
        user_id: user!.id,
        account_id: selectedAccountId,
        symbol: data.symbol.toUpperCase(),
        name: data.name || null,
        asset_type: data.asset_type,
        transaction_type: data.transaction_type,
        quantity: data.quantity,
        price_per_unit: data.price_per_unit,
        currency: data.currency,
        fees: data.fees,
        transaction_date: data.transaction_date,
        notes: data.notes || null,
      } as never)
      if (error) throw error
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      if (user && selectedAccountId) {
        await runBackfill(user.id, selectedAccountId)
        queryClient.invalidateQueries({ queryKey: ['snapshots'] })
      }
      toast.success('Transaction added')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add transaction')
    },
  })
}

export function useBulkImportTransactions() {
  const { user } = useAuth()
  const { selectedAccountId } = useSelectedAccount()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rows: TransactionFormData[]) => {
      if (!user) throw new Error('Not authenticated')
      if (!selectedAccountId) throw new Error('No account selected')
      const inserts = rows.map((data) => ({
        user_id: user.id,
        account_id: selectedAccountId,
        symbol: data.symbol.toUpperCase(),
        name: data.name || null,
        asset_type: data.asset_type,
        transaction_type: data.transaction_type,
        quantity: data.quantity,
        price_per_unit: data.price_per_unit,
        currency: data.currency,
        fees: data.fees,
        transaction_date: data.transaction_date,
        notes: data.notes || null,
      }))
      const { error } = await supabase.from('transactions').insert(inserts as never[])
      if (error) throw error
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      if (user && selectedAccountId) {
        await runBackfill(user.id, selectedAccountId)
        queryClient.invalidateQueries({ queryKey: ['snapshots'] })
      }
      toast.success('Transactions imported')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to import transactions')
    },
  })
}

export function useUpdateTransaction() {
  const { user } = useAuth()
  const { selectedAccountId } = useSelectedAccount()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransactionFormData }) => {
      const { error } = await supabase
        .from('transactions')
        .update({
          symbol: data.symbol.toUpperCase(),
          name: data.name || null,
          asset_type: data.asset_type,
          transaction_type: data.transaction_type,
          quantity: data.quantity,
          price_per_unit: data.price_per_unit,
          currency: data.currency,
          fees: data.fees,
          transaction_date: data.transaction_date,
          notes: data.notes || null,
        } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      if (user && selectedAccountId) {
        await runBackfill(user.id, selectedAccountId)
        queryClient.invalidateQueries({ queryKey: ['snapshots'] })
      }
      toast.success('Transaction updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update transaction')
    },
  })
}

export function useDeleteTransaction() {
  const { user } = useAuth()
  const { selectedAccountId } = useSelectedAccount()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      if (user && selectedAccountId) {
        await runBackfill(user.id, selectedAccountId)
        queryClient.invalidateQueries({ queryKey: ['snapshots'] })
      }
      toast.success('Transaction deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete transaction')
    },
  })
}

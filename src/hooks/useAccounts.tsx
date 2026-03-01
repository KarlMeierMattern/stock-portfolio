import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Account } from '@/types/database'

const SELECTED_ACCOUNT_KEY = 'portfolio-selected-account'

type SelectedAccountContextValue = {
  selectedAccountId: string | null
  setSelectedAccountId: (id: string | null) => void
}

const SelectedAccountContext = createContext<SelectedAccountContextValue | null>(null)

export function useSelectedAccount() {
  const ctx = useContext(SelectedAccountContext)
  if (!ctx) throw new Error('useSelectedAccount must be used within SelectedAccountProvider')
  return ctx
}

export function useAccounts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Account[]
    },
    enabled: !!user,
  })
}


export function useCreateAccount() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; type: Account['type']; currency: Account['currency'] }) => {
      const { data: account, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user!.id,
          name: data.name,
          type: data.type,
          currency: data.currency,
        } as never)
        .select()
        .single()
      if (error) throw error
      return account as Account
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function SelectedAccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: accounts = [], isLoading, isError } = useAccounts()
  const createAccount = useCreateAccount()

  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(SELECTED_ACCOUNT_KEY) : null
  )

  const setSelectedAccountId = useCallback((id: string | null) => {
    if (id) localStorage.setItem(SELECTED_ACCOUNT_KEY, id)
    else localStorage.removeItem(SELECTED_ACCOUNT_KEY)
    setSelectedAccountIdState(id)
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['holdings'] })
    queryClient.invalidateQueries({ queryKey: ['snapshots'] })
  }, [queryClient])

  // Ensure default account for new users
  useEffect(() => {
    if (!user || isLoading || isError || accounts.length > 0 || createAccount.isPending) return
    createAccount.mutate(
      { name: 'Main', type: 'taxable', currency: 'USD' },
      { onSuccess: (acc) => setSelectedAccountId(acc.id) }
    )
  }, [user, isLoading, isError, accounts.length])

  // Sync selected account when accounts load
  useEffect(() => {
    if (!user || accounts.length === 0) return
    if (selectedAccountId && accounts.some((a) => a.id === selectedAccountId)) return
    const stored = localStorage.getItem(SELECTED_ACCOUNT_KEY)
    if (stored && accounts.some((a) => a.id === stored)) {
      setSelectedAccountId(stored)
    } else {
      setSelectedAccountId(accounts[0].id)
    }
  }, [user, accounts, selectedAccountId, setSelectedAccountId])

  return (
    <SelectedAccountContext.Provider value={{ selectedAccountId, setSelectedAccountId }}>
      {children}
    </SelectedAccountContext.Provider>
  )
}


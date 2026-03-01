import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { WatchlistItem } from '@/types/database'
import type { AssetType } from '@/types/database'

export function useWatchlist() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user!.id)
        .order('added_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as WatchlistItem[]
    },
    enabled: !!user,
  })
}

export function useAddToWatchlist() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      symbol,
      name,
      asset_type,
    }: {
      symbol: string
      name?: string | null
      asset_type: AssetType
    }) => {
      const { error } = await supabase.from('watchlist').insert({
        user_id: user!.id,
        symbol: symbol.toUpperCase(),
        name: name || null,
        asset_type,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('watchlist').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })
}

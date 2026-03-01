import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { AlertSetting, Alert } from '@/types/database'

export function useAlertSettings() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['alert-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('user_id', user!.id)

      if (error) throw error
      return (data as AlertSetting[]) ?? []
    },
    enabled: !!user,
  })
}

export function useToggleAlert() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ symbol, enabled }: { symbol: string; enabled: boolean }) => {
      if (!user) throw new Error('Not authenticated')

      if (enabled) {
        const { error } = await supabase
          .from('alert_settings')
          .upsert(
            { user_id: user.id, symbol, alert_type: '200_sma_cross_below', enabled: true } as never,
            { onConflict: 'user_id,symbol,alert_type' }
          )
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('alert_settings')
          .delete()
          .eq('user_id', user.id)
          .eq('symbol', symbol)
          .eq('alert_type', '200_sma_cross_below')
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-settings'] })
    },
  })
}

export function useToggleAllAlerts() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ symbols, enabled }: { symbols: string[]; enabled: boolean }) => {
      if (!user) throw new Error('Not authenticated')

      if (enabled) {
        const rows = symbols.map(symbol => ({
          user_id: user.id,
          symbol,
          alert_type: '200_sma_cross_below',
          enabled: true,
        }))
        const { error } = await supabase
          .from('alert_settings')
          .upsert(rows as never[], { onConflict: 'user_id,symbol,alert_type' })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('alert_settings')
          .delete()
          .eq('user_id', user.id)
          .eq('alert_type', '200_sma_cross_below')
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-settings'] })
    },
  })
}

export function useAlerts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['alerts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return (data as Alert[]) ?? []
    },
    enabled: !!user,
  })
}

export function useUnreadAlertCount() {
  const { data: alerts = [] } = useAlerts()
  return alerts.filter(a => !a.read).length
}

export function useMarkAlertRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ read: true } as never)
        .eq('id', alertId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useMarkAllAlertsRead() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('alerts')
        .update({ read: true } as never)
        .eq('user_id', user.id)
        .eq('read', false)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '@/hooks/useAlerts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function AlertsCard() {
  const { data: alerts = [], isLoading } = useAlerts()
  const markRead = useMarkAlertRead()
  const markAllRead = useMarkAllAlertsRead()

  const unread = alerts.filter(a => !a.read)
  const recent = alerts.slice(0, 10)

  if (isLoading || alerts.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Alerts
            {unread.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                {unread.length}
              </span>
            )}
          </CardTitle>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {recent.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-md p-2.5 text-sm ${
              alert.read ? 'opacity-60' : 'bg-destructive/5 border border-destructive/15'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className={`leading-snug ${alert.read ? '' : 'font-medium'}`}>
                {alert.message}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
              </p>
            </div>
            {!alert.read && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => markRead.mutate(alert.id)}
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

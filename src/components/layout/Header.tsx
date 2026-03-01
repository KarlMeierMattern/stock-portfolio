import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAccounts, useSelectedAccount } from '@/hooks/useAccounts'
import { useCurrency } from '@/hooks/useCurrency'
import { useTheme } from '@/hooks/useTheme'
import { useUnreadAlertCount } from '@/hooks/useAlerts'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { BarChart3, LogOut, ArrowLeftRight, Sun, Moon } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/holdings', label: 'Holdings' },
  { path: '/transactions', label: 'Transactions' },
  { path: '/watchlist', label: 'Watchlist' },
  { path: '/tax', label: 'Tax Report' },
]

export function Header() {
  const { user, signOut } = useAuth()
  const { data: accounts = [] } = useAccounts()
  const { selectedAccountId, setSelectedAccountId } = useSelectedAccount()
  const { currency, toggleCurrency } = useCurrency()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const unreadCount = useUnreadAlertCount()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span>Portfolio</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                {item.label}
                {item.path === '/' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {accounts.length > 1 && (
            <Select
              value={selectedAccountId ?? ''}
              onChange={(e) => setSelectedAccountId(e.target.value || null)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              className="h-9 w-[120px]"
            />
          )}
          <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleCurrency}
            className="font-mono min-w-[60px] sm:min-w-[80px]"
            title={`Currency: ${currency}`}
          >
            <ArrowLeftRight className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">{currency}</span>
          </Button>

          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex md:hidden border-t px-4 py-2 gap-1 overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`relative px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              location.pathname === item.path
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
            {item.path === '/' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </header>
  )
}

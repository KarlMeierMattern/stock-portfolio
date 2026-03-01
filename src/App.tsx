import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/useAuth'
import { CurrencyProvider } from '@/hooks/useCurrency'
import { ThemeProvider } from '@/hooks/useTheme'
import { SelectedAccountProvider } from '@/hooks/useAccounts'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Holdings = lazy(() => import('@/pages/Holdings'))
const Transactions = lazy(() => import('@/pages/Transactions'))
const TaxReport = lazy(() => import('@/pages/TaxReport'))
const Watchlist = lazy(() => import('@/pages/Watchlist'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Toaster richColors position="top-right" />
        <AuthProvider>
          <CurrencyProvider>
          <BrowserRouter>
            <ErrorBoundary>
            <Suspense fallback={
              <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            }>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<SelectedAccountProvider><Layout /></SelectedAccountProvider>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/holdings" element={<Holdings />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/tax" element={<TaxReport />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                </Route>
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

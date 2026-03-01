import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Currency } from '@/types/database'

type CurrencyContextType = {
  currency: Currency
  setCurrency: (c: Currency) => void
  toggleCurrency: () => void
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'ZAR',
  setCurrency: () => {},
  toggleCurrency: () => {},
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(
    () => (localStorage.getItem('portfolio-currency') as Currency) || 'ZAR'
  )

  const updateCurrency = (c: Currency) => {
    setCurrency(c)
    localStorage.setItem('portfolio-currency', c)
  }

  const toggleCurrency = () => {
    updateCurrency(currency === 'USD' ? 'ZAR' : 'USD')
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: updateCurrency, toggleCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}

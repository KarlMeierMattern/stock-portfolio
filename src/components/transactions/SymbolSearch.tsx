import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'

const TWELVE_DATA_BASE = 'https://api.twelvedata.com'

type SearchResult = {
  symbol: string
  instrument_name: string
  instrument_type: string
  exchange: string
  country: string
}

type Props = {
  value: string
  onChange: (symbol: string, name: string, type: string) => void
}

export function SymbolSearch({ value, onChange }: Props) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.length < 1) {
      setResults([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `${TWELVE_DATA_BASE}/symbol_search?symbol=${encodeURIComponent(q)}&outputsize=8&apikey=${apiKey}`
        )
        const data = await res.json()
        setResults(data.data || [])
        setIsOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleSelect = (result: SearchResult) => {
    const assetType = result.instrument_type === 'ETF'
      ? 'etf'
      : result.instrument_type === 'Digital Currency'
        ? 'crypto'
        : 'stock'

    setQuery(result.symbol)
    onChange(result.symbol, result.instrument_name, assetType)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search symbol..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            search(e.target.value)
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="pl-8"
        />
        {loading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {results.map((r, idx) => (
            <button
              key={`${r.symbol}-${r.exchange}-${idx}`}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between cursor-pointer"
              onClick={() => handleSelect(r)}
            >
              <div>
                <span className="font-medium">{r.symbol}</span>
                <span className="text-muted-foreground ml-2 text-xs">{r.instrument_name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.instrument_type} · {r.exchange}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

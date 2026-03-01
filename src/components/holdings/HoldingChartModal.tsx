import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { fetchTimeSeries } from "@/lib/twelve-data";
import { calculateSMA } from "@/lib/sma";
import { formatCurrency } from "@/lib/currency";
import { useCurrency } from "@/hooks/useCurrency";
import { useExchangeRate } from "@/hooks/usePrices";
import { format, subMonths, subYears } from "date-fns";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  name: string | null;
};

const RANGES = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "2Y", months: 24 },
] as const;

const SMA_PERIOD = 200;

export function HoldingChartModal({ open, onOpenChange, symbol, name }: Props) {
  const [range, setRange] = useState<string>("1Y");
  const { currency } = useCurrency();
  const { data: exchangeRate = 18.5 } = useExchangeRate();

  // Fetch enough data for 200-day SMA + display range (need ~450 days for 1Y + 200 SMA)
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["holding-chart", symbol],
    queryFn: async () => {
      const startDate = format(subYears(new Date(), 3), "yyyy-MM-dd");
      return await fetchTimeSeries(symbol, startDate);
    },
    enabled: open && !!symbol,
    staleTime: 4 * 60 * 60 * 1000, // 4 hours
  });

  const chartData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    const sorted = [...rawData].reverse();

    const smaData = calculateSMA(sorted, SMA_PERIOD);
    const smaMap: Record<string, number> = {};
    for (const s of smaData) {
      smaMap[s.date] = s.sma;
    }

    const now = new Date();
    let startDate: Date;
    switch (range) {
      case "3M":
        startDate = subMonths(now, 3);
        break;
      case "6M":
        startDate = subMonths(now, 6);
        break;
      case "1Y":
        startDate = subYears(now, 1);
        break;
      case "2Y":
        startDate = subYears(now, 2);
        break;
      default:
        startDate = subYears(now, 1);
    }

    const dateFormat =
      range === "3M" || range === "6M" ? "MMM dd" : "MMM dd ''yy";

    const filtered = sorted.filter((d) => new Date(d.date) >= startDate);

    const MAX_POINTS = 200;
    let sampled = filtered;
    if (filtered.length > MAX_POINTS) {
      const step = Math.ceil(filtered.length / MAX_POINTS);
      sampled = filtered.filter((_, i) => i % step === 0);
      const last = filtered[filtered.length - 1];
      if (sampled[sampled.length - 1].date !== last.date) {
        sampled.push(last);
      }
    }

    return sampled.map((d) => {
      const priceInCurrency =
        currency === "USD" ? d.close : d.close * exchangeRate;
      const smaRaw = smaMap[d.date];
      const smaInCurrency = smaRaw
        ? currency === "USD"
          ? smaRaw
          : smaRaw * exchangeRate
        : null;

      return {
        date: format(new Date(d.date), dateFormat),
        fullDate: d.date,
        price: priceInCurrency,
        sma200: smaInCurrency,
      };
    });
  }, [rawData, range, currency, exchangeRate]);

  const currentPrice =
    chartData.length > 0 ? chartData[chartData.length - 1].price : null;
  const currentSMA =
    chartData.length > 0 ? chartData[chartData.length - 1].sma200 : null;
  const isBelowSMA =
    currentPrice && currentSMA ? currentPrice < currentSMA : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {symbol}
            {name && (
              <span className="text-sm font-normal text-muted-foreground">
                — {name}
              </span>
            )}
          </DialogTitle>
          {currentPrice && (
            <div className="flex items-center gap-4 text-sm">
              <span>
                Price:{" "}
                <span className="font-medium">
                  {formatCurrency(currentPrice, currency)}
                </span>
              </span>
              {currentSMA && (
                <span>
                  200-day SMA:{" "}
                  <span
                    className={`font-medium ${isBelowSMA ? "text-destructive" : "text-success"}`}
                  >
                    {formatCurrency(currentSMA, currency)}
                  </span>
                </span>
              )}
              {isBelowSMA && (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                  Below SMA
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex gap-1 mb-2">
          {RANGES.map((r) => (
            <Button
              key={r.label}
              variant={range === r.label ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setRange(r.label)}
            >
              {r.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex h-[350px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer
            width="100%"
            height={350}
            style={{ outline: "none" }}
          >
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="oklch(0.646 0.222 41.12)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="oklch(0.646 0.222 41.12)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => formatCurrency(v, currency)}
                width={90}
                domain={["auto", "auto"]}
              />
              <Tooltip
                formatter={(value, dataKey) => [
                  formatCurrency(Number(value), currency),
                  dataKey === "price" ? "Price" : "200-day SMA",
                ]}
                labelFormatter={(_label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullDate
                    ? format(new Date(item.fullDate), "MMM dd, yyyy")
                    : String(_label);
                }}
              />
              <Legend
                formatter={(value) =>
                  value === "price" ? "Price" : "200-day SMA"
                }
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="oklch(0.646 0.222 41.12)"
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="sma200"
                stroke="oklch(0.6 0.118 184.71)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[350px] items-center justify-center text-muted-foreground text-sm">
            No price data available for {symbol}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

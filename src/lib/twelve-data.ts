const BASE_URL = "https://api.twelvedata.com";

function getApiKey(): string {
  return import.meta.env.VITE_TWELVE_DATA_API_KEY;
}

export type TwelveDataPrice = {
  symbol: string;
  price: number;
  previousClose: number | null;
};

export async function fetchPricesDirect(
  symbols: string[],
): Promise<Record<string, TwelveDataPrice>> {
  const apiKey = getApiKey();
  if (!apiKey || symbols.length === 0) return {};

  const results: Record<string, TwelveDataPrice> = {};
  const batchSize = 8;

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const symbolStr = batch.join(",");

    try {
      const [priceRes, quoteRes] = await Promise.all([
        fetch(`${BASE_URL}/price?symbol=${symbolStr}&apikey=${apiKey}`),
        fetch(`${BASE_URL}/quote?symbol=${symbolStr}&apikey=${apiKey}`),
      ]);

      const priceData = await priceRes.json();
      const quoteData = await quoteRes.json();

      for (const symbol of batch) {
        const pData = batch.length === 1 ? priceData : priceData[symbol];
        const qData = batch.length === 1 ? quoteData : quoteData[symbol];

        const price = parseFloat(pData?.price);
        if (!isNaN(price)) {
          results[symbol] = {
            symbol,
            price,
            previousClose: parseFloat(qData?.previous_close) || null,
          };
        }
      }
    } catch (err) {
      console.error(`Failed to fetch prices for batch:`, batch, err);
    }
  }

  return results;
}

export async function fetchExchangeRate(): Promise<number> {
  const apiKey = getApiKey();
  if (!apiKey) return 18.5;

  // Try /exchange_rate endpoint first
  try {
    const res = await fetch(
      `${BASE_URL}/exchange_rate?symbol=USD/ZAR&apikey=${apiKey}`,
    );
    const data = await res.json();
    const rate = parseFloat(data.rate);
    if (!isNaN(rate) && rate > 0) return rate;
  } catch {
    // Fall through to alternative
  }

  // Fallback: use /price endpoint with forex pair
  try {
    const res = await fetch(
      `${BASE_URL}/price?symbol=USD/ZAR&apikey=${apiKey}`,
    );
    const data = await res.json();
    const price = parseFloat(data.price);
    if (!isNaN(price) && price > 0) return price;
  } catch {
    // Fall through
  }

  // Last resort: use a free forex API
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    if (data.rates?.ZAR) return data.rates.ZAR;
  } catch {
    // Use fallback
  }

  return 18.5;
}

export async function fetchTimeSeries(
  symbol: string,
  startDate: string,
  interval = "1day",
): Promise<{ date: string; close: number }[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `${BASE_URL}/time_series?symbol=${symbol}&interval=${interval}&start_date=${startDate}&outputsize=5000&apikey=${apiKey}`,
    );
    const data = await res.json();

    if (!data.values) return [];

    return data.values.map((v: { datetime: string; close: string }) => ({
      date: v.datetime,
      close: parseFloat(v.close),
    }));
  } catch {
    return [];
  }
}

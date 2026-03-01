/**
 * Calculate Simple Moving Average for a given period.
 * Input data should be sorted oldest-first.
 */
export function calculateSMA(
  data: { date: string; close: number }[],
  period: number
): { date: string; sma: number }[] {
  if (data.length < period) return []

  const result: { date: string; sma: number }[] = []

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close
    }
    result.push({
      date: data[i].date,
      sma: sum / period,
    })
  }

  return result
}

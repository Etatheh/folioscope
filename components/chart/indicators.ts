// Client-side indicator math for the detail-page chart.
//
// The servers already compute a snapshot of MA/RSI/MACD for the quote cards.
// The chart needs the whole aligned series (and weekly/monthly aggregation), so
// it recomputes from the daily history it receives.

import type { Candle } from "@/lib/us-stocks";

export type BollingerSeries = {
  mid: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
};

export type MacdSeries = {
  dif: (number | null)[];
  dea: (number | null)[];
  hist: (number | null)[];
};

export function sma(values: readonly number[], period: number): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function bollinger(
  values: readonly number[],
  period = 20,
  multiplier = 2
): BollingerSeries {
  const mid = sma(values, period);
  const upper: (number | null)[] = values.map(() => null);
  const lower: (number | null)[] = values.map(() => null);

  for (let i = period - 1; i < values.length; i++) {
    const mean = mid[i];
    if (mean === null) continue;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - mean;
      variance += diff * diff;
    }
    const deviation = Math.sqrt(variance / period);
    upper[i] = mean + multiplier * deviation;
    lower[i] = mean - multiplier * deviation;
  }

  return { mid, upper, lower };
}

/** Wilder's RSI, aligned to the input array. */
export function rsi(values: readonly number[], period = 14): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  if (period <= 0 || values.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] =
    avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(delta, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period;
    out[i] =
      avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function ema(values: readonly number[], period: number): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  if (period <= 0 || values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** MACD (12, 26, 9) with a histogram of DIF − DEA. */
export function macd(
  values: readonly number[],
  fast = 12,
  slow = 26,
  signal = 9
): MacdSeries {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const dif: (number | null)[] = values.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null
      ? (fastEma[i] as number) - (slowEma[i] as number)
      : null
  );

  const valid: number[] = [];
  const validIndex: number[] = [];
  dif.forEach((value, index) => {
    if (value !== null) {
      valid.push(value);
      validIndex.push(index);
    }
  });

  const dea: (number | null)[] = values.map(() => null);
  const deaValid = ema(valid, signal);
  deaValid.forEach((value, i) => {
    if (value !== null) dea[validIndex[i]] = value;
  });

  const hist: (number | null)[] = values.map((_, i) =>
    dif[i] !== null && dea[i] !== null
      ? (dif[i] as number) - (dea[i] as number)
      : null
  );

  return { dif, dea, hist };
}

function weekKey(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const value = new Date(Date.UTC(year, month - 1, day));
  const offset = (value.getUTCDay() + 6) % 7; // Monday = 0
  value.setUTCDate(value.getUTCDate() - offset);
  return value.toISOString().slice(0, 10);
}

/**
 * Aggregate daily candles into weekly (Monday-start) or monthly buckets.
 * The resulting candle keeps the last trading date so axis labels stay real
 * session dates rather than synthetic period keys.
 */
export function aggregateCandles(
  bars: readonly Candle[],
  mode: "weekly" | "monthly"
): Candle[] {
  const groups = new Map<string, Candle>();

  for (const bar of bars) {
    const key = mode === "weekly" ? weekKey(bar.date) : bar.date.slice(0, 7);
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { ...bar });
      continue;
    }
    group.high = Math.max(group.high, bar.high);
    group.low = Math.min(group.low, bar.low);
    group.close = bar.close;
    group.volume += bar.volume;
    group.date = bar.date;
  }

  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));
}
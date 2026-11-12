// 5-year dollar-cost-averaging (DCA) series for the Pro backtest card.
//
// Real data: 60 monthly closes of the S&P 500 taken from the daily kline feed
// (long range, 1400 bars). If the feed is unreachable — or returns fewer than
// two years of history — a clearly labelled demo series is returned so the card
// still renders instead of collapsing into an empty state.

import { fetchKlinesSecid } from "./klines";
import { US_KLINE_SECID, type Candle } from "./us-stocks";

export type DcaPoint = { month: string; close: number };

export type DcaSeries = {
  symbol: string;
  name: string;
  /** true when the numbers are generated demo data, not the real index */
  demo: boolean;
  points: DcaPoint[];
};

const BENCHMARK_SYMBOL = "INX";
const BENCHMARK_NAME = "S&P 500";
const MONTHS = 60;
const DAILY_BARS = 1400;
const MIN_REAL_POINTS = 24;
const CACHE_TTL_MS = 10 * 60_000;

let cache: { at: number; data: DcaSeries } | null = null;

/** Last trading day of every month, keeping the most recent `months` months. */
function monthlyCloses(bars: Candle[], months: number): DcaPoint[] {
  const byMonth = new Map<string, Candle>();
  for (const bar of bars) {
    const month = bar.date.slice(0, 7); // "YYYY-MM"
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    byMonth.set(month, bar);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-months)
    .map(([month, bar]) => ({ month, close: bar.close }));
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic demo curve: 60 monthly closes that end at the bundled demo
 * S&P 500 level, with a plausible drift and volatility. Values are stable
 * across renders (fixed seed), so the chart never jumps between requests.
 */
function demoSeries(months = MONTHS): DcaPoint[] {
  const endPrice = 7541.4; // matches the bundled demo snapshot (S&P 500)
  const endYear = 2026;
  const endMonthIndex = 10; // November (0-based)
  const random = mulberry32(0x5eed1234);

  const closes: number[] = [];
  let level = 1;
  for (let index = 0; index < months; index += 1) {
    const drift = 0.0078;
    const shock = (random() - 0.5) * 0.085;
    level *= 1 + drift + shock;
    closes.push(level);
  }

  const scale = endPrice / closes[closes.length - 1];
  return closes.map((close, index) => {
    const date = new Date(Date.UTC(endYear, endMonthIndex - (months - 1 - index), 1));
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { month, close: Number((close * scale).toFixed(2)) };
  });
}

export async function getDcaSeries(): Promise<DcaSeries> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.data;

  let series: DcaSeries | null = null;
  const secid = US_KLINE_SECID[BENCHMARK_SYMBOL];
  if (secid) {
    try {
      // Distinct cache key so the 1400-bar request does not evict the 320-bar
      // series used by the quote cards.
      const bars = await fetchKlinesSecid(`${BENCHMARK_SYMBOL}:dca`, secid, DAILY_BARS);
      const points = monthlyCloses(bars, MONTHS);
      if (points.length >= MIN_REAL_POINTS) {
        series = { symbol: BENCHMARK_SYMBOL, name: BENCHMARK_NAME, demo: false, points };
      }
    } catch {
      // fall through to the demo series
    }
  }

  if (!series) {
    series = {
      symbol: BENCHMARK_SYMBOL,
      name: BENCHMARK_NAME,
      demo: true,
      points: demoSeries(),
    };
  }

  cache = { at: now, data: series };
  return series;
}

// 5-year dollar-cost-averaging (DCA) series for the Pro backtest card.
//
// The card only shows a completed result when all 60 monthly closes are
// available. A plausible generated price curve is especially misleading in a
// financial backtest, so an unavailable source becomes an explicit empty state
// instead. A previously fetched in-memory result can be labelled stale.

import { fetchKlinesSecid } from "./klines";
import { US_KLINE_SECID, type Candle } from "./us-stocks";

export type DcaPoint = { month: string; close: number };

export type DcaDataState = "live" | "stale" | "unavailable";

export type DcaSeries = {
  symbol: string;
  name: string;
  dataState: DcaDataState;
  /** Last month represented by the series, if data is available. */
  asOf: string | null;
  points: DcaPoint[];
};

const BENCHMARK_SYMBOL = "INX";
const BENCHMARK_NAME = "S&P 500";
const MONTHS = 60;
const DAILY_BARS = 1400;
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

export async function getDcaSeries(): Promise<DcaSeries> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.data;

  const secid = US_KLINE_SECID[BENCHMARK_SYMBOL];
  if (secid) {
    try {
      // Distinct cache key so the 1400-bar request does not evict the 320-bar
      // series used by the quote cards.
      const bars = await fetchKlinesSecid(`${BENCHMARK_SYMBOL}:dca`, secid, DAILY_BARS);
      const points = monthlyCloses(bars, MONTHS);
      if (points.length === MONTHS) {
        const series: DcaSeries = {
          symbol: BENCHMARK_SYMBOL,
          name: BENCHMARK_NAME,
          dataState: "live",
          asOf: points.at(-1)?.month ?? null,
          points,
        };
        cache = { at: now, data: series };
        return series;
      }
    } catch {
      // Use a labelled cached result, if available, before showing no result.
    }
  }

  if (cache) {
    return { ...cache.data, dataState: "stale" };
  }

  return {
    symbol: BENCHMARK_SYMBOL,
    name: BENCHMARK_NAME,
    dataState: "unavailable",
    asOf: null,
    points: [],
  };
}

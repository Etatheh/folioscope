// Multi-period dollar-cost-averaging backtest data for the Pro card.
//
// The card lets the user pick the DCA target (S&P 500 or Nasdaq 100) and
// compares it against DCA-ing the other index over the same window. Both
// series are kept server-side (up to 120 month-end closes) so the client can
// slice any period from 6M to 10Y.

import { fetchUsKlines } from "./us-stocks";

export type DcaPoint = { month: string; close: number };

export type DcaDataState = "live" | "stale" | "unavailable";

export type DcaSeries = {
  symbol: string;
  name: string;
  /** English display name for locale-aware titles. */
  nameEn: string;
  dataState: DcaDataState;
  /** Last month represented by the series, if data is available. */
  asOf: string | null;
  points: DcaPoint[];
};

export type DcaTarget = "sp500" | "nasdaq";

export type DcaDataset = {
  sp500: DcaSeries;
  nasdaq: DcaSeries;
};

/** Full history kept server-side so the client can slice any period up to 10y. */
export const MAX_MONTHS = 120;
/** Shortest period the multi-period engine can meaningfully display. */
export const MIN_MONTHS = 6;

const CACHE_TTL_MS = 10 * 60_000;
const FETCH_LIMIT = 2800; // ~10+ years of daily bars

let cache: { at: number; data: DcaDataset } | null = null;

/** Last trading day of every month, keeping the most recent `months` months. */
function monthlyCloses(bars: { date: string; close: number }[], months: number): DcaPoint[] {
  const byMonth = new Map<string, { date: string; close: number }>();
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

async function loadSeries(symbol: string): Promise<DcaSeries> {
  try {
    const bars = await fetchUsKlines(symbol, FETCH_LIMIT);
    const points = monthlyCloses(bars, MAX_MONTHS);
    if (points.length >= MIN_MONTHS) {
      return {
        symbol,
        name: symbol === "NDX" ? "纳斯达克100" : "标普500",
        nameEn: symbol === "NDX" ? "Nasdaq 100" : "S&P 500",
        dataState: "live",
        asOf: points.at(-1)?.month ?? null,
        points,
      };
    }
  } catch {
    // fall through to unavailable / stale
  }
  return {
    symbol,
    name: symbol === "NDX" ? "纳斯达克100" : "标普500",
    nameEn: symbol === "NDX" ? "Nasdaq 100" : "S&P 500",
    dataState: "unavailable",
    asOf: null,
    points: [],
  };
}

export async function getDcaDataset(): Promise<DcaDataset> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.data;

  const [sp500, nasdaq] = await Promise.all([loadSeries("INX"), loadSeries("NDX")]);
  const data: DcaDataset = { sp500, nasdaq };

  // Degrade gracefully: if a live fetch failed, reuse a labelled stale series.
  if (cache) {
    if (data.sp500.points.length === 0) data.sp500 = { ...cache.data.sp500, dataState: "stale" };
    if (data.nasdaq.points.length === 0) data.nasdaq = { ...cache.data.nasdaq, dataState: "stale" };
  }

  const anyLive = data.sp500.points.length > 0 || data.nasdaq.points.length > 0;
  if (anyLive) cache = { at: now, data };
  return data;
}
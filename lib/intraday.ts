// Five-day intraday series for the detail-page 5D tab.
//
// Eastmoney's trends2 endpoint is the primary source: it returns five recent
// trading sessions of one-minute price/volume plus a running average price
// (VWAP), which is exactly the data a Xueqiu-style five-day chart needs. It
// works for U.S. tickers (including leveraged ETFs such as SOXL), A-shares,
// Hong Kong / Japan / Korea and the Europe indices because they all have an
// Eastmoney secid. No Yahoo dependency, so the tab also works from networks
// where Yahoo Finance is unreachable.
//
// Rows are resampled to 15-minute buckets on the server to keep the client
// payload small and the touch crosshair comfortable on mobile.

import { CN_KLINE_SECID } from "./cn-markets";
import { ASIA_KLINE_SECID } from "./asia-markets";
import { EUROPE_KLINE_SECID } from "./europe-markets";
import { INDEX_KLINE_SECID } from "./index-symbols";
import { resolveUsSecid, US_KLINE_SECID } from "./us-stocks";

export type IntradayPoint = {
  /** HH:mm of the 15-minute bucket start, Beijing time (as provided by Eastmoney) */
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** running session average price (VWAP) */
  vwap: number;
};

export type IntradaySession = {
  /** YYYY-MM-DD */
  date: string;
  points: IntradayPoint[];
};

const TRENDS_ENDPOINT = "https://push2his.eastmoney.com/api/qt/stock/trends2/get?";
const REQUEST_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 2 * 60_000;
const BUCKET_MINUTES = 15;

const cache = new Map<string, { at: number; sessions: IntradaySession[] }>();

type TrendsPayload = {
  data?: {
    trends?: string[] | null;
  } | null;
};

type RawPoint = {
  date: string;
  time: string;
  /** absolute minute index, used to detect overnight session breaks */
  minuteIndex: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
};

async function resolveSecid(symbol: string): Promise<string | null> {
  return (
    INDEX_KLINE_SECID[symbol] ??
    CN_KLINE_SECID[symbol] ??
    ASIA_KLINE_SECID[symbol] ??
    EUROPE_KLINE_SECID[symbol] ??
    US_KLINE_SECID[symbol] ??
    (await resolveUsSecid(symbol))
  );
}

function parseRawPoints(rows: readonly string[]): RawPoint[] {
  const points: RawPoint[] = [];
  for (const row of rows) {
    const parts = row.split(",");
    if (parts.length < 8) continue;
    const stamp = parts[0];
    const match = stamp.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
    if (!match) continue;

    const close = Number(parts[2]);
    if (!Number.isFinite(close) || close <= 0) continue;

    const open = Number(parts[1]);
    const high = Number(parts[3]);
    const low = Number(parts[4]);
    const volume = Number(parts[5]);
    const vwap = Number(parts[7]);
    const dayIndex = Math.floor(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) /
        86_400_000
    );
    const minuteIndex =
      dayIndex * 1_440 + Number(match[4]) * 60 + Number(match[5]);

    points.push({
      date: stamp.slice(0, 10),
      time: stamp.slice(11, 16),
      minuteIndex,
      open: Number.isFinite(open) && open > 0 ? open : close,
      high: Number.isFinite(high) && high > 0 ? high : close,
      low: Number.isFinite(low) && low > 0 ? low : close,
      close,
      volume: Number.isFinite(volume) && volume > 0 ? volume : 0,
      vwap: Number.isFinite(vwap) && vwap > 0 ? vwap : 0,
    });
  }
  return points.sort((a, b) => a.minuteIndex - b.minuteIndex);
}

/** Collapse one session's minute rows into 15-minute buckets. */
function resampleSession(raw: readonly RawPoint[]): IntradayPoint[] {
  const buckets = new Map<string, IntradayPoint>();
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  let cumulativeClose = 0;
  let cumulativeCount = 0;

  for (const point of raw) {
    const [hour, minute] = point.time.split(":").map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

    const startMinute =
      Math.floor((hour * 60 + minute) / BUCKET_MINUTES) * BUCKET_MINUTES;
    const key = `${String(Math.floor(startMinute / 60)).padStart(2, "0")}:${String(
      startMinute % 60
    ).padStart(2, "0")}`;

    const typical = (point.high + point.low + point.close) / 3;
    cumulativePV += typical * point.volume;
    cumulativeVolume += point.volume;
    cumulativeClose += point.close;
    cumulativeCount += 1;

    const vwap =
      point.vwap > 0
        ? point.vwap
        : cumulativeVolume > 0
          ? cumulativePV / cumulativeVolume
          : cumulativeClose / cumulativeCount;

    const bucket = buckets.get(key);
    if (!bucket) {
      buckets.set(key, {
        time: key,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
        vwap,
      });
    } else {
      bucket.high = Math.max(bucket.high, point.high);
      bucket.low = Math.min(bucket.low, point.low);
      bucket.close = point.close;
      bucket.volume += point.volume;
      bucket.vwap = vwap;
    }
  }

  return [...buckets.values()].map((point) => ({
    ...point,
    vwap: point.vwap > 0 ? point.vwap : point.close,
  }));
}

export async function fetchIntradaySessions(
  symbol: string
): Promise<IntradaySession[]> {
  const normalized = symbol.trim().toUpperCase();
  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.sessions;

  const secid = await resolveSecid(normalized);
  if (!secid) throw new Error(`no intraday secid for ${normalized}`);

  const params = new URLSearchParams({
    secid,
    ndays: "5",
    iscr: "0",
    fields1: "f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58",
  });
  const response = await fetch(`${TRENDS_ENDPOINT}${params.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`intraday endpoint responded with ${response.status}`);
  }

  const payload = (await response.json()) as TrendsPayload;
  const rows = payload.data?.trends;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`no intraday payload for ${normalized}`);
  }

  const rawPoints = parseRawPoints(rows);
  const groups: { date: string; points: RawPoint[]; lastMinute: number }[] = [];
  const sessionBreakMinutes = 6 * 60;

  for (const point of rawPoints) {
    const current = groups[groups.length - 1];
    if (
      !current ||
      point.minuteIndex - current.lastMinute > sessionBreakMinutes
    ) {
      groups.push({
        // The first row is the exchange session's local date: U.S. sessions
        // start at 22:30 Beijing time but still belong to that same U.S. day.
        date: point.date,
        points: [point],
        lastMinute: point.minuteIndex,
      });
      continue;
    }
    current.points.push(point);
    current.lastMinute = point.minuteIndex;
  }

  const sessions: IntradaySession[] = groups
    .slice(-5)
    .map(({ date, points }) => ({ date, points: resampleSession(points) }))
    .filter((session) => session.points.length > 0);

  if (sessions.length === 0) {
    throw new Error(`empty intraday payload for ${normalized}`);
  }

  cache.set(normalized, { at: Date.now(), sessions });
  return sessions;
}
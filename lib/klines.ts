import type { Candle } from "./us-stocks";

// Shared daily kline loader for all markets (Eastmoney push2his endpoint).
// A-shares and indices use Eastmoney secids; US stocks use 105./106. secids.

const KLINE_ENDPOINT = "https://push2his.eastmoney.com/api/qt/stock/kline/get?";
const REQUEST_TIMEOUT_MS = 8_000;
export const KLINE_TTL_MS = 5 * 60_000;
const KLINE_BARS = 320;

const cache = new Map<string, { at: number; bars: Candle[] }>();

export async function fetchKlinesSecid(symbol: string, secid: string): Promise<Candle[]> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.at < KLINE_TTL_MS) return cached.bars;

  const params = new URLSearchParams({
    secid,
    klt: "101", // daily
    fqt: "1", // 前复权
    end: "20500101",
    lmt: String(KLINE_BARS),
    fields1: "f1,f2,f3,f4,f5,f6",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58",
  });
  const response = await fetch(`${KLINE_ENDPOINT}${params.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`kline endpoint responded with ${response.status}`);
  }
  const json = (await response.json()) as { data?: { klines?: string[] } };
  const rows = json.data?.klines;
  if (!Array.isArray(rows)) {
    throw new Error(`no kline payload for ${symbol}`);
  }
  // kline strings: "date,open,close,high,low,volume,amount,amplitude"
  const bars: Candle[] = [];
  for (const row of rows) {
    const parts = row.split(",");
    const close = Number(parts[2]);
    if (!Number.isFinite(close) || close <= 0) continue;
    bars.push({
      date: parts[0],
      open: Number(parts[1]),
      close,
      high: Number(parts[3]),
      low: Number(parts[4]),
      volume: Number(parts[5]) || 0,
    });
  }
  if (bars.length === 0) throw new Error(`empty kline payload for ${symbol}`);
  cache.set(symbol, { at: Date.now(), bars });
  return bars;
}

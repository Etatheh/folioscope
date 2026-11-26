import { fetch as request, ProxyAgent } from "undici";
import type { Candle } from "./us-stocks";

const proxy = process.env.MARKET_DATA_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const pending = new Map<string, Promise<Candle[]>>();
const cache = new Map<string, { at: number; bars: Candle[] }>();

export function fetchYahooHistory(symbol: string, limit: number): Promise<Candle[]> {
  const key = `${symbol}:${limit}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 300_000) return Promise.resolve(cached.bars);
  const active = pending.get(key);
  if (active) return active;
  const task = (async () => {
    const end = Math.floor(Date.now() / 1000);
    const start = end - Math.ceil(limit * 1.6 + 30) * 86400;
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d`;
    const options = { dispatcher, headers: { "User-Agent": "Mozilla/5.0" } };
    const response = await request(url, { ...options, signal: AbortSignal.timeout(20000) })
      .then(async response => {
        if (response.ok) return response;
        await response.arrayBuffer();
        throw new Error(`Yahoo history response ${response.status}`);
      })
      .catch(() => request(url.replace("query2.", "query1."), { ...options, signal: AbortSignal.timeout(20000) }));
    if (!response.ok) throw new Error(`Yahoo history ${symbol}: ${response.status}`);
    type Columns = Partial<Record<"open" | "high" | "low" | "close" | "volume", (number | null)[]>>;
    const json = await response.json() as { chart?: { result?: { timestamp?: number[]; indicators?: { quote?: Columns[] } }[] } };
    const result = json.chart?.result?.[0];
    const columns = result?.indicators?.quote?.[0];
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
    const bars = (result?.timestamp ?? []).flatMap((time, i) => {
      const open = columns?.open?.[i], high = columns?.high?.[i], low = columns?.low?.[i];
      const close = columns?.close?.[i], volume = columns?.volume?.[i];
      if (!validPrice(open) || !validPrice(high) || !validPrice(low) || !validPrice(close)
        || typeof volume !== "number" || !Number.isFinite(volume) || volume < 0) return [];
      const parts = formatter.formatToParts(new Date(time * 1000));
      const part = (type: string) => parts.find(p => p.type === type)?.value;
      return [{ date: `${part("year")}-${part("month")}-${part("day")}`, open, high, low, close, volume }];
    }).slice(-limit);
    if (bars.length < 2) throw new Error(`Yahoo history empty: ${symbol}`);
    cache.set(key, { at: Date.now(), bars });
    return bars;
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

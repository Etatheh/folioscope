// Live quotes + daily history for the Europe / Asia-Pacific index boards.
// Eastmoney serves both endpoints; the quote payload scales index levels by
// 100 and the kline endpoint is shared with the rest of the app.

import { fetchKlinesSecid } from "./klines";
import {
  INDEX_KLINE_SECID,
  INDEX_META,
  type IndexMeta,
} from "./index-symbols";
import {
  computeTechnicals,
  type Candle,
  type UsMarketSnapshot,
  type UsQuote,
} from "./us-stocks";

const EM_QUOTE_ENDPOINT = "https://push2.eastmoney.com/api/qt/stock/get?";
const REQUEST_TIMEOUT_MS = 8_000;

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

type EmIndexPayload = {
  data?: {
    f43?: number;
    f44?: number;
    f45?: number;
    f57?: string;
    f58?: string;
    f60?: number;
    f169?: number;
    f170?: number;
  };
};

/** Fetch one global-index quote from Eastmoney. */
export async function fetchIndexQuoteMeta(
  item: IndexMeta
): Promise<UsQuote | null> {
  const params = new URLSearchParams({
    secid: item.em,
    fields: "f43,f44,f45,f57,f58,f60,f169,f170",
  });
  const response = await fetch(`${EM_QUOTE_ENDPOINT}${params.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`index quote ${item.symbol} responded with ${response.status}`);
  }
  const json = (await response.json()) as EmIndexPayload;
  const d = json.data;
  const rawPrice = num(d?.f43);
  if (!d || rawPrice === null || rawPrice <= 0) return null;

  const price = rawPrice / 100;
  const prevClose = (num(d.f60) ?? rawPrice) / 100;
  return {
    symbol: item.symbol,
    code: d.f57 || item.symbol,
    name: item.name,
    nameEn: item.nameEn,
    price,
    prevClose,
    change: (num(d.f169) ?? 0) / 100,
    changePct: (num(d.f170) ?? 0) / 100,
    open: price,
    high: (num(d.f44) ?? rawPrice) / 100,
    low: (num(d.f45) ?? rawPrice) / 100,
    volume: 0,
    pe: null,
    marketCapUsd: null,
    week52High: null,
    week52Low: null,
    quoteTime: null,
    tech: null,
    valuation: null,
  };
}

/** Attach MA / RSI / MACD to index cards using the shared kline loader. */
export async function attachIndexTechnicals(indices: UsQuote[]): Promise<void> {
  const results = await Promise.all(
    indices.map(async (quote) => {
      const secid = INDEX_KLINE_SECID[quote.symbol];
      if (!secid) return null;
      try {
        const bars = await fetchKlinesSecid(quote.symbol, secid);
        return bars.length >= 5 ? computeTechnicals(bars) : null;
      } catch {
        return null;
      }
    })
  );
  indices.forEach((quote, index) => {
    quote.tech = results[index];
  });
}

/** Build an indices-only snapshot for a regional board. */
export async function getIndexSnapshot(
  items: IndexMeta[]
): Promise<UsMarketSnapshot> {
  const now = Date.now();
  const results = await Promise.allSettled(items.map(fetchIndexQuoteMeta));
  const indices = results.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : []
  );
  if (indices.length === 0) {
    return { demo: true, fetchedAt: now, indices: [], stocks: [] };
  }
  await attachIndexTechnicals(indices);
  return {
    demo: indices.length < items.length,
    fetchedAt: now,
    indices,
    stocks: [],
  };
}

/** On-demand quote for a public index symbol (used by /api/markets/quote). */
export async function getIndexQuote(symbol: string): Promise<UsQuote | null> {
  const meta = INDEX_META[symbol.toUpperCase()];
  if (!meta) return null;
  const quote = await fetchIndexQuoteMeta(meta);
  if (!quote) return null;
  await attachIndexTechnicals([quote]);
  return quote;
}

/** Daily bars for a public index symbol. */
export async function fetchIndexBars(
  symbol: string,
  limit = 420
): Promise<Candle[]> {
  const normalized = symbol.toUpperCase();
  const secid = INDEX_KLINE_SECID[normalized];
  if (!secid) throw new Error(`no index secid for ${symbol}`);
  return fetchKlinesSecid(normalized, secid, limit);
}
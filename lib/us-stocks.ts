// Server-side data access for the U.S. stocks panel.
// - Live quotes: Sina Finance (hq.sinajs.cn, GBK text, needs a finance.sina Referer).
// - Daily history for technical indicators: Eastmoney kline endpoint (lib/klines.ts).
// When the quote endpoint is unreachable the panel falls back to a bundled
// demo snapshot so the UI never breaks; technicals then show as unavailable.

import { fetchKlinesSecid } from "./klines";
import { SYMBOL_NAMES } from "./watchlist";

export type Candle = {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
};

export type Technicals = {
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  /** Wilder's RSI with period 14 */
  rsi14: number | null;
  /** MACD DIF (EMA12 - EMA26) */
  macd: number | null;
  /** MACD signal line DEA (EMA9 of DIF) */
  macdSignal: number | null;
  /** MACD golden/dead cross detected within the last 3 bars */
  macdCross: "golden" | "dead" | null;
  /** last 30 daily closes for the mini chart */
  sparkline: number[];
};

export type Valuation = {
  pe: number;
  pb: number | null;
  /** current PE vs its own history, 0..1 (e.g. 0.25 = 25th percentile) */
  pePercentile: number | null;
  /** source date, e.g. "11-03" */
  asOf: string | null;
};

export type UsQuote = {
  symbol: string;
  code: string;
  name: string;
  nameEn: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  pe: number | null;
  marketCapUsd: number | null;
  week52High: number | null;
  week52Low: number | null;
  quoteTime: string | null;
  tech: Technicals | null;
  /** index valuation (PE/PB/percentile); stocks keep pe above instead */
  valuation: Valuation | null;
};

export type UsMarketSnapshot = {
  /** true when the live endpoint failed and bundled demo values are shown */
  demo: boolean;
  /** epoch ms when the snapshot was produced */
  fetchedAt: number;
  indices: UsQuote[];
  stocks: UsQuote[];
};

type WatchItem = {
  symbol: string;
  /** Eastmoney secid for daily klines */
  em: string;
  name: string;
  nameEn: string;
};

const INDICES: WatchItem[] = [
  { symbol: "DJI", em: "100.DJIA", name: "道琼斯", nameEn: "Dow Jones" },
  { symbol: "IXIC", em: "100.NDX", name: "纳斯达克", nameEn: "Nasdaq Composite" },
  { symbol: "INX", em: "100.SPX", name: "标普500", nameEn: "S&P 500" },
  { symbol: "NDX", em: "100.NDX100", name: "纳斯达克100", nameEn: "Nasdaq 100" },
];

const STOCKS: WatchItem[] = [
  { symbol: "AAPL", em: "105.AAPL", name: "苹果", nameEn: "Apple" },
  { symbol: "MSFT", em: "105.MSFT", name: "微软", nameEn: "Microsoft" },
  { symbol: "NVDA", em: "105.NVDA", name: "英伟达", nameEn: "NVIDIA" },
  { symbol: "GOOGL", em: "105.GOOGL", name: "谷歌-A", nameEn: "Alphabet" },
  { symbol: "AMZN", em: "105.AMZN", name: "亚马逊", nameEn: "Amazon" },
  { symbol: "META", em: "105.META", name: "Meta", nameEn: "Meta Platforms" },
  { symbol: "TSLA", em: "105.TSLA", name: "特斯拉", nameEn: "Tesla" },
  { symbol: "AVGO", em: "105.AVGO", name: "博通", nameEn: "Broadcom" },
  { symbol: "NFLX", em: "105.NFLX", name: "奈飞", nameEn: "Netflix" },
  { symbol: "AMD", em: "105.AMD", name: "超威半导体", nameEn: "AMD" },
  { symbol: "COST", em: "105.COST", name: "好市多", nameEn: "Costco" },
  { symbol: "JPM", em: "106.JPM", name: "摩根大通", nameEn: "JPMorgan Chase" },
];

/** Extra symbols used by the free featured pool and Pro search. */
const FEATURED_ITEMS: WatchItem[] = [
  { symbol: "LLY", em: "106.LLY", name: "礼来", nameEn: "Eli Lilly" },
  { symbol: "SPY", em: "107.SPY", name: "标普500ETF-SPDR", nameEn: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", em: "105.QQQ", name: "纳指100ETF", nameEn: "Invesco QQQ" },
  { symbol: "BRK.B", em: "106.BRK_B", name: "伯克希尔哈撒韦-B", nameEn: "Berkshire Hathaway B" },
];

export const US_KLINE_SECID: Record<string, string> = Object.fromEntries(
  [...INDICES, ...STOCKS, ...FEATURED_ITEMS].map((item) => [item.symbol, item.em])
);

// ---------------------------------------------------------------------------
// Sina Finance live quotes
// ---------------------------------------------------------------------------

const SINA_ENDPOINT = "https://hq.sinajs.cn/list=";
const REQUEST_TIMEOUT_MS = 8_000;
const QUOTE_TTL_MS = 60_000;

const SINA_HEADERS: Record<string, string> = {
  Referer: "https://finance.sina.com.cn",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

/** Internal symbol → Sina quote code. Indices use `gb_$dji`-style codes. */
const SINA_INDICES: Record<string, string> = {
  DJI: "gb_$dji",
  IXIC: "gb_$ixic",
  INX: "gb_$inx",
  NDX: "gb_$ndx",
};

function sinaCode(symbol: string): string {
  return SINA_INDICES[symbol] ?? `gb_${symbol.toLowerCase()}`;
}

function toNum(value: string | undefined): number | null {
  if (value === undefined || value === "" || value === "--") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Sina US quote field layout (comma separated, GBK):
 *   0 name · 1 price · 2 change% · 3 time · 4 change · 5 open · 6 high · 7 low
 *   8 52w high · 9 52w low · 10 volume · 12 market cap · 14 PE
 * Previous close is derived from price − change (reliable across stocks/indices).
 */
function parseSinaRecord(fields: string[], item: WatchItem): UsQuote | null {
  const price = toNum(fields[1]);
  const change = toNum(fields[4]) ?? 0;
  if (price === null || price <= 0) return null;
  const prevClose = price - change;
  if (!(prevClose > 0)) return null;
  const changePct = toNum(fields[2]) ?? (change / prevClose) * 100;
  return {
    symbol: item.symbol,
    code: item.symbol,
    name: fields[0] || item.name,
    nameEn: item.nameEn,
    price,
    prevClose,
    change,
    changePct,
    open: toNum(fields[5]) ?? price,
    high: toNum(fields[6]) ?? price,
    low: toNum(fields[7]) ?? price,
    volume: toNum(fields[10]) ?? 0,
    pe: toNum(fields[14]),
    marketCapUsd: toNum(fields[12]) || null,
    week52High: toNum(fields[8]),
    week52Low: toNum(fields[9]),
    quoteTime: fields[3] || null,
    tech: null,
    valuation: null,
  };
}

async function fetchLiveSnapshot(): Promise<UsMarketSnapshot> {
  const all = [...INDICES, ...STOCKS];
  const list = all.map((item) => sinaCode(item.symbol)).join(",");
  const response = await fetch(`${SINA_ENDPOINT}${list}`, {
    headers: SINA_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`sina quote endpoint responded with ${response.status}`);
  }
  const text = new TextDecoder("gbk").decode(await response.arrayBuffer());
  const records = new Map<string, string[]>();
  for (const match of text.matchAll(/var hq_str_([\w$]+)="([^"]*)"/g)) {
    if (match[2]) records.set(match[1], match[2].split(","));
  }
  const resolve = (item: WatchItem) => {
    const fields = records.get(sinaCode(item.symbol));
    return fields ? parseSinaRecord(fields, item) : null;
  };
  const snapshot: UsMarketSnapshot = {
    demo: false,
    fetchedAt: Date.now(),
    indices: INDICES.map(resolve).filter((q): q is UsQuote => q !== null),
    stocks: STOCKS.map(resolve).filter((q): q is UsQuote => q !== null),
  };
  if (snapshot.stocks.length === 0) {
    throw new Error("sina quote payload contained no usable records");
  }
  return snapshot;
}

// ---------------------------------------------------------------------------
// On-demand quotes for search / featured pool (Eastmoney push2)
// ---------------------------------------------------------------------------

const EM_QUOTE_ENDPOINT = "https://push2.eastmoney.com/api/qt/stock/get?";
const EM_FIELDS =
  "f43,f44,f45,f46,f47,f48,f57,f58,f60,f116,f162,f167,f169,f170";
const SECID_PREFIXES = ["105", "106", "107"] as const;
const GENERIC_QUOTE_TTL_MS = 60_000;

type EmQuotePayload = {
  data?: {
    f43?: number;
    f44?: number;
    f45?: number;
    f46?: number;
    f47?: number;
    f48?: number;
    f57?: string;
    f58?: string;
    f60?: number;
    f116?: number;
    f162?: number;
    f167?: number;
    f169?: number;
    f170?: number;
  } | null;
};

const genericQuoteCache = new Map<string, { at: number; quote: UsQuote }>();
const secidCache = new Map<string, string | null>();

function emNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function eastmoneyCandidates(symbol: string): string[] {
  const known = US_KLINE_SECID[symbol];
  const emSymbol = symbol.replace(/\./g, "_");
  const list = known ? [known] : [];
  for (const prefix of SECID_PREFIXES) {
    const secid = `${prefix}.${emSymbol}`;
    if (!list.includes(secid)) list.push(secid);
  }
  return list;
}

async function fetchEmQuoteRaw(secid: string): Promise<EmQuotePayload["data"] | null> {
  try {
    const params = new URLSearchParams({ secid, fields: EM_FIELDS });
    const response = await fetch(`${EM_QUOTE_ENDPOINT}${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as EmQuotePayload;
    return json.data ?? null;
  } catch {
    return null;
  }
}

/** Resolve the Eastmoney secid for any U.S. ticker (needed by the kline loader). */
export async function resolveUsSecid(symbol: string): Promise<string | null> {
  if (secidCache.has(symbol)) return secidCache.get(symbol) ?? null;

  for (const secid of eastmoneyCandidates(symbol)) {
    const data = await fetchEmQuoteRaw(secid);
    if (data && emNumber(data.f43) && (data.f43 as number) > 0) {
      secidCache.set(symbol, secid);
      return secid;
    }
  }

  return null;
}

/**
 * Fetch one U.S. stock/ETF quote by ticker.
 *
 * Eastmoney returns prices scaled by 1000 for U.S. instruments; previous close
 * (f60) is reliable, so change and change % are recomputed locally.
 */
export async function fetchQuoteBySymbol(symbol: string): Promise<UsQuote | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(normalized)) return null;

  const cached = genericQuoteCache.get(normalized);
  if (cached && Date.now() - cached.at < GENERIC_QUOTE_TTL_MS) return cached.quote;

  for (const secid of eastmoneyCandidates(normalized)) {
    const data = await fetchEmQuoteRaw(secid);
    const rawPrice = emNumber(data?.f43);
    const rawPrev = emNumber(data?.f60);
    if (!data || rawPrice === null || rawPrev === null) continue;

    const price = rawPrice / 1000;
    const prevClose = rawPrev / 1000;
    if (!(price > 0) || !(prevClose > 0)) continue;

    const change = price - prevClose;
    const changePct = (change / prevClose) * 100;
    const known = SYMBOL_NAMES[normalized];
    const quote: UsQuote = {
      symbol: normalized,
      code: normalized,
      name: known?.zh || data.f58 || normalized,
      nameEn: known?.en || data.f57 || normalized,
      price,
      prevClose,
      change,
      changePct,
      open: (emNumber(data.f46) ?? rawPrice) / 1000,
      high: (emNumber(data.f44) ?? rawPrice) / 1000,
      low: (emNumber(data.f45) ?? rawPrice) / 1000,
      volume: emNumber(data.f47) ?? 0,
      pe: emNumber(data.f162) ? (data.f162 as number) / 100 : null,
      marketCapUsd: emNumber(data.f116) || null,
      week52High: null,
      week52Low: null,
      quoteTime: null,
      tech: null,
      valuation: null,
    };

    secidCache.set(normalized, secid);
    genericQuoteCache.set(normalized, { at: Date.now(), quote });
    return quote;
  }

  return null;
}

/** Snapshot first (keeps existing names/technicals), then on-demand lookup. */
export async function getQuoteForSymbol(symbol: string): Promise<UsQuote | null> {
  const normalized = symbol.trim().toUpperCase();
  const snapshot = await getUsMarketSnapshot();
  const existing = [...snapshot.indices, ...snapshot.stocks].find(
    (quote) => quote.symbol === normalized
  );
  if (existing) return existing;
  return fetchQuoteBySymbol(normalized);
}

// Bundled fallback values for the four featured names that are not part of the
// regular dashboard snapshot. Used only when the live feed is unreachable.
const FEATURED_DEMO: Record<
  string,
  {
    price: number;
    prevClose: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    pe: number | null;
    marketCapUsd: number | null;
    week52High: number | null;
    week52Low: number | null;
  }
> = {
  SPY: { price: 739.95, prevClose: 754.37, open: 749.66, high: 749.82, low: 738.07, volume: 69207282, pe: null, marketCapUsd: null, week52High: 781.62, week52Low: 625.49 },
  QQQ: { price: 661.75, prevClose: 679.89, open: 671.04, high: 672.15, low: 660.48, volume: 43576942, pe: null, marketCapUsd: null, week52High: 762.86, week52Low: 554.04 },
  LLY: { price: 1431.67, prevClose: 1443.5, open: 1453.75, high: 1475.25, low: 1427.66, volume: 3209218, pe: 51.46, marketCapUsd: 1353477563384, week52High: 1475.25, week52Low: 845.32 },
  "BRK.B": { price: 592.85, prevClose: 592.94, open: 594.97, high: 595.83, low: 588.55, volume: 3886810, pe: 12.3, marketCapUsd: 1259521441302, week52High: 615, week52Low: 455 },
};

function demoFeaturedQuote(symbol: string): UsQuote {
  const seed = FEATURED_DEMO[symbol];
  const known = SYMBOL_NAMES[symbol];
  if (!seed) {
    return {
      symbol,
      code: symbol,
      name: known?.zh ?? symbol,
      nameEn: known?.en ?? symbol,
      price: 0,
      prevClose: 0,
      change: 0,
      changePct: 0,
      open: 0,
      high: 0,
      low: 0,
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
  const change = seed.price - seed.prevClose;
  return {
    symbol,
    code: symbol,
    name: known?.zh ?? symbol,
    nameEn: known?.en ?? symbol,
    price: seed.price,
    prevClose: seed.prevClose,
    change,
    changePct: (change / seed.prevClose) * 100,
    open: seed.open,
    high: seed.high,
    low: seed.low,
    volume: seed.volume,
    pe: seed.pe,
    marketCapUsd: seed.marketCapUsd,
    week52High: seed.week52High,
    week52Low: seed.week52Low,
    quoteTime: null,
    tech: null,
    valuation: null,
  };
}

/**
 * Quotes for the 14-name free pool. Reuses the dashboard snapshot for names it
 * already has, fetches SPY/QQQ/LLY/BRK.B on demand, and always returns all 14
 * cards thanks to the bundled fallback.
 */
export async function getWatchlistQuotes(symbols: readonly string[]): Promise<UsQuote[]> {
  const snapshot = await getUsMarketSnapshot();
  const existing = new Map(
    [...snapshot.indices, ...snapshot.stocks].map((quote) => [quote.symbol, quote])
  );

  const quotes = await mapWithConcurrency(symbols, 4, async (symbol) => {
    const normalized = symbol.toUpperCase();
    const known = existing.get(normalized);
    if (known) return known;
    const live = await fetchQuoteBySymbol(normalized);
    return live ?? demoFeaturedQuote(normalized);
  });

  // Every featured card gets a sparkline and MA/RSI/MACD basics, even the
  // symbols outside the regular dashboard snapshot (SPY/QQQ/LLY/BRK.B).
  await mapWithConcurrency(quotes, 4, async (quote) => {
    if (quote.tech) return quote;
    try {
      const bars = await fetchUsKlines(quote.symbol);
      if (bars.length >= 5) quote.tech = computeTechnicals(bars);
    } catch {
      // leave technicals empty; the card renders graceful placeholders
    }
    return quote;
  });

  return quotes;
}

// ---------------------------------------------------------------------------
// Daily klines + technical indicators (Eastmoney)
// ---------------------------------------------------------------------------

/**
 * Fetch daily bars for a US symbol from Eastmoney (shared loader).
 * `limit` is the number of most recent bars requested.
 */
export async function fetchUsKlines(
  symbol: string,
  limit = 320
): Promise<Candle[]> {
  let secid: string | null = US_KLINE_SECID[symbol] ?? null;
  if (!secid) {
    secid = await resolveUsSecid(symbol);
  }
  if (!secid) throw new Error(`no kline secid for ${symbol}`);
  return fetchKlinesSecid(symbol, secid, limit);
}

function emaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function computeTechnicals(bars: Candle[]): Technicals {
  const closes = bars.map((bar) => bar.close);
  const last = closes.length - 1;
  const ma = (period: number): number | null =>
    closes.length >= period
      ? closes.slice(-period).reduce((sum, v) => sum + v, 0) / period
      : null;

  // Wilder's RSI(14)
  let rsi14: number | null = null;
  const period = 14;
  if (closes.length > period) {
    let gain = 0;
    let loss = 0;
    for (let i = 1; i <= period; i++) {
      const delta = closes[i] - closes[i - 1];
      if (delta >= 0) gain += delta;
      else loss -= delta;
    }
    let avgGain = gain / period;
    let avgLoss = loss / period;
    for (let i = period + 1; i < closes.length; i++) {
      const delta = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(delta, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period;
    }
    rsi14 = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  // MACD (12, 26, 9) + cross detection over the last 3 bars
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const difSeries: (number | null)[] = closes.map((_, i) =>
    ema12[i] !== null && ema26[i] !== null
      ? (ema12[i] as number) - (ema26[i] as number)
      : null
  );
  const validDifs = difSeries.filter((v): v is number => v !== null);
  const deaSeries = emaSeries(validDifs, 9);
  let dif: number | null = null;
  let dea: number | null = null;
  let macdCross: Technicals["macdCross"] = null;
  if (difSeries[last] !== null && deaSeries.length > 0) {
    dif = difSeries[last];
    dea = deaSeries[deaSeries.length - 1];
    for (let back = 0; back <= 2; back++) {
      const d = difSeries[last - back];
      const s = deaSeries[deaSeries.length - 1 - back];
      if (d === null || s === null) break;
      const hist = d - s;
      const prevD = difSeries[last - back - 1];
      const prevS = deaSeries[deaSeries.length - 2 - back];
      if (prevD === null || prevS === null) break;
      const prevHist = prevD - prevS;
      if (prevHist <= 0 && hist > 0) macdCross = "golden";
      else if (prevHist >= 0 && hist < 0) macdCross = "dead";
      break;
    }
  }

  return {
    ma5: ma(5),
    ma10: ma(10),
    ma20: ma(20),
    rsi14,
    macd: dif,
    macdSignal: dea,
    macdCross,
    sparkline: closes.slice(-30),
  };
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index], index);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

async function attachTechnicals(snapshot: UsMarketSnapshot): Promise<void> {
  const quotes = [...snapshot.indices, ...snapshot.stocks];
  const barsList = await mapWithConcurrency(quotes, 6, async (quote) => {
    try {
      return await fetchUsKlines(quote.symbol);
    } catch {
      return null;
    }
  });
  quotes.forEach((quote, i) => {
    const bars = barsList[i];
    quote.tech = bars && bars.length >= 5 ? computeTechnicals(bars) : null;
  });
}

// ---------------------------------------------------------------------------
// Index valuations (PE / PB / percentile) — Danjuan's index valuation feed
// ---------------------------------------------------------------------------

const VALUATION_ENDPOINT = "https://danjuanfunds.com/djapi/index_eva/dj";
const VALUATION_TTL_MS = 6 * 60 * 60 * 1000;

// danjuan index_code -> our symbol
const VALUATION_SYMBOLS: Record<string, string> = {
  NDX: "NDX",
  SP500: "INX",
};

type DanjuanItem = {
  index_code: string;
  pe: number;
  pb: number;
  pe_percentile: number;
  date: string;
};

let valuationCache: { at: number; map: Record<string, Valuation> } | null =
  null;

async function fetchValuations(): Promise<Record<string, Valuation>> {
  if (valuationCache && Date.now() - valuationCache.at < VALUATION_TTL_MS) {
    return valuationCache.map;
  }
  const response = await fetch(VALUATION_ENDPOINT, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`valuation endpoint responded with ${response.status}`);
  }
  const json = (await response.json()) as {
    data?: { items?: DanjuanItem[] };
  };
  const map: Record<string, Valuation> = {};
  for (const item of json.data?.items ?? []) {
    const symbol = VALUATION_SYMBOLS[item.index_code];
    if (!symbol || typeof item.pe !== "number" || !(item.pe > 0)) continue;
    map[symbol] = {
      pe: item.pe,
      pb: typeof item.pb === "number" && item.pb > 0 ? item.pb : null,
      pePercentile:
        typeof item.pe_percentile === "number" && item.pe_percentile >= 0
          ? item.pe_percentile
          : null,
      asOf: item.date || null,
    };
  }
  valuationCache = { at: Date.now(), map };
  return map;
}

async function attachValuations(snapshot: UsMarketSnapshot): Promise<void> {
  try {
    const map = await fetchValuations();
    for (const index of snapshot.indices) {
      const valuation = map[index.symbol];
      if (valuation) index.valuation = valuation;
    }
  } catch {
    // valuations are optional; leave them null
  }
}

let cache: { at: number; data: UsMarketSnapshot } | null = null;

export async function getUsMarketSnapshot(): Promise<UsMarketSnapshot> {
  const now = Date.now();
  if (cache && now - cache.at < QUOTE_TTL_MS) return cache.data;
  try {
    const data = await fetchLiveSnapshot();
    await attachTechnicals(data);
    await attachValuations(data);
    cache = { at: now, data };
    return data;
  } catch {
    // Network or parse failure: fall back to the bundled demo snapshot.
    return buildDemo();
  }
}

// ---------------------------------------------------------------------------
// Bundled demo snapshot (2026-11-14) used when the live feed fails
// ---------------------------------------------------------------------------

function buildDemo(): UsMarketSnapshot {
  const q = (
    symbol: string,
    name: string,
    nameEn: string,
    price: number,
    prevClose: number,
    open: number,
    high: number,
    low: number,
    volume: number,
    pe: number | null,
    marketCapUsd: number | null,
    w52h: number | null,
    w52l: number | null
  ): UsQuote => ({
    symbol,
    code: symbol,
    name,
    nameEn,
    price,
    prevClose,
    change: price - prevClose,
    changePct: ((price - prevClose) / prevClose) * 100,
    open,
    high,
    low,
    volume,
    pe,
    marketCapUsd,
    week52High: w52h,
    week52Low: w52l,
    quoteTime: "2026-11-14 05:43:43",
    tech: null,
    valuation: null,
  });

  return {
    demo: true,
    fetchedAt: Date.now(),
    indices: [
      q("DJI", "道琼斯", "Dow Jones", 52347.55, 52297.09, 52490.68, 52521.48, 52017.86, 645244111, null, null, 54744.33, 45057.28),
      q("IXIC", "纳斯达克", "Nasdaq Composite", 25136.27, 25366.09, 25408.0, 25423.09, 24872.41, 7740442365, null, null, 27722.75, 20690.25),
      q("INX", "标普500", "S&P 500", 7561.67, 7592.4, 7616.85, 7621.78, 7499.4, 2727332784, null, null, 7844.52, 6316.91),
      q("NDX", "纳斯达克100", "Nasdaq 100", 27943.74, 28289.19, 28265.54, 28295.8, 27609.71, 1517679827, null, null, 31361.37, 22841.42),
    ],
    stocks: [
      q("AAPL", "苹果", "Apple", 356.27, 354.88, 357.96, 360.83, 355.75, 40027467, 42.92, 5177407913930, 360.83, 242.89),
      q("MSFT", "微软", "Microsoft", 507.12, 521.91, 524.02, 529.63, 504.96, 34743321, 26.48, 3765971781000, 551.15, 348.54),
      q("NVDA", "英伟达", "NVIDIA", 202.06, 204.64, 207.53, 209.98, 201.66, 119272174, 25.54, 4879142820000, 243.37, 163.89),
      q("GOOGL", "谷歌-A", "Alphabet", 278.99, 279.84, 282.46, 287.0, 278.8, 48512348, 14.57, 3429903060000, 408.12, 270.0),
      q("AMZN", "亚马逊", "Amazon", 245.63, 240.35, 243.01, 253.81, 242.28, 58347979, 19.86, 2656031162000, 287.2, 196.0),
      q("META", "Meta", "Meta Platforms", 606.73, 614.99, 614.44, 621.69, 606.41, 19496498, 20.7, 1579216887000, 779.82, 519.38),
      q("TSLA", "特斯拉", "Tesla", 403.82, 399.81, 404.66, 414.23, 397.61, 43141083, 443.76, 1596191490000, 498.83, 297.38),
      q("AVGO", "博通", "Broadcom", 322.23, 326.08, 328.37, 333.56, 321.87, 20326866, 41.1, 1538206751000, 493.32, 288.98),
      q("NFLX", "奈飞", "Netflix", 62.34, 62.08, 62.2, 62.89, 61.71, 40917261, 18.02, 259579999000, 116.73, 61.39),
      q("AMD", "超威半导体", "AMD", 466.84, 504.8, 510.71, 512.82, 466.07, 32141002, 119.7, 762104649000, 658.52, 188.22),
      q("COST", "好市多", "Costco", 1040.55, 1012.28, 1015.87, 1042.57, 1014.34, 3114794, 50.12, 461098244000, 1093.1, 839.09),
      q("JPM", "摩根大通", "JPMorgan Chase", 340.58, 337.04, 340.94, 342.43, 339.92, 6014662, 14.29, 904444248000, 364.67, 275.05),
    ],
  };
}

// ---------------------------------------------------------------------------
// Single-symbol detail (used by the detail page)
// ---------------------------------------------------------------------------

export type ChartSeries = {
  bars: Candle[];
  ma5: (number | null)[];
  ma10: (number | null)[];
  ma20: (number | null)[];
};

/** Builds the last `window` bars plus their MA series aligned to the window. */
export function buildChartSeries(bars: Candle[], window = 60): ChartSeries {
  const closes = bars.map((bar) => bar.close);
  const ma = (period: number) => {
    const series: (number | null)[] = closes.map(() => null);
    for (let i = period - 1; i < closes.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      series[i] = sum / period;
    }
    return series.slice(-window);
  };
  return {
    bars: bars.slice(-window),
    ma5: ma(5),
    ma10: ma(10),
    ma20: ma(20),
  };
}

export type SymbolDetail = {
  quote: UsQuote;
  bars: Candle[];
  demo: boolean;
};

export async function getSymbolDetail(
  symbol: string
): Promise<SymbolDetail | null> {
  const snapshot = await getUsMarketSnapshot();
  const quote = [...snapshot.indices, ...snapshot.stocks].find(
    (item) => item.symbol === symbol
  );
  if (!quote) return null;
  let bars: Candle[] = [];
  try {
    bars = await fetchUsKlines(quote.symbol);
  } catch {
    // keep the quote; the chart area will show an empty state
  }
  return { quote, bars, demo: snapshot.demo };
}

// ---------------------------------------------------------------------------
// Investment simulator data (aligned daily closes for backtesting)
// ---------------------------------------------------------------------------

export type SimulationData = {
  dates: string[];
  series: Record<string, number[]>;
  benchmark: { symbol: string; name: string; closes: number[] };
};

export async function getSimulationData(
  window = 1300
): Promise<SimulationData> {
  // Include the complete featured pool so FREE users can backtest all 14 names.
  // Pro users additionally keep COST/JPM and can add any U.S. ticker on demand.
  const symbols = [
    ...STOCKS.map((item) => item.symbol),
    ...FEATURED_ITEMS.map((item) => item.symbol),
  ];
  const benchSymbol = "INX";
  const all = [...symbols, benchSymbol];

  const barsList = await mapWithConcurrency(all, 6, async (symbol) => {
    try {
      return await fetchUsKlines(symbol, Math.max(window, 320));
    } catch {
      return null;
    }
  });

  const union = new Set<string>();
  for (const bars of barsList) {
    if (!bars) continue;
    for (const bar of bars) union.add(bar.date);
  }
  const dates = [...union].sort().slice(-window);

  const series: Record<string, number[]> = {};
  barsList.forEach((bars, idx) => {
    const symbol = all[idx];
    if (!bars) return;
    const map = new Map(bars.map((bar) => [bar.date, bar.close]));
    let last = NaN;
    const closes = dates.map((date) => {
      const close = map.get(date);
      if (close !== undefined) last = close;
      return Number.isFinite(last) ? last : NaN;
    });
    series[symbol] = closes;
  });

  const benchmarkBars = barsList[all.length - 1];
  const benchMap = new Map(
    (benchmarkBars ?? []).map((bar) => [bar.date, bar.close])
  );
  let benchLast = NaN;
  const benchmarkCloses = dates.map((date) => {
    const close = benchMap.get(date);
    if (close !== undefined) benchLast = close;
    return Number.isFinite(benchLast) ? benchLast : NaN;
  });

  return {
    dates,
    series,
    benchmark: {
      symbol: benchSymbol,
      name: "S&P 500",
      closes: benchmarkCloses,
    },
  };
}
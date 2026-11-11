// Server-side data access for the U.S. stocks panel.
// - Live quotes: Tencent's public quote endpoint (GBK-encoded plain text).
// - Daily history for technical indicators: Eastmoney kline endpoint (lib/klines.ts).
// When the quote endpoint is unreachable the panel falls back to a bundled
// demo snapshot so the UI never breaks; technicals then show as unavailable.

import { fetchKlinesSecid } from "./klines";

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
  /** Eastmoney secid for daily klines (Tencent has no US stock history) */
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

export const US_KLINE_SECID: Record<string, string> = Object.fromEntries(
  [...INDICES, ...STOCKS].map((item) => [item.symbol, item.em])
);

const QUOTE_ENDPOINT = "https://qt.gtimg.cn/q=";
const REQUEST_TIMEOUT_MS = 8_000;
const QUOTE_TTL_MS = 60_000;

// Bundled snapshot (2026-11-03 close) used when the live endpoint fails.
// Field layout matches the Tencent payload so both paths share one parser.
const DEMO_RESPONSE = [
  'v_usDJI="200~道琼斯~.DJI~51983.98~51770.31~52008.23~522048265~0~0~51846.69~0~0~0~0~0~0~0~0~0~52169.66~0~0~0~0~0~0~0~0~0~~2026-11-02 16:50:57~213.67~0.41~52424.91~51981.66~USD~522048265~27229058962081~~~~~~0.86~~~Dow Jones~~54744.33~45057.28~0~~~~8.16~-0.72~ZS~~~0.03~1.40~-3.80~~~1.09~~~52158.13~~~~~";',
  'v_usIXIC="200~纳斯达克~.IXIC~25164.36~25437.00~25600.17~8002403957~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~2026-11-02 18:18:15~-272.64~-1.07~25799.46~25145.95~USD~8002403957~201375398846825~~~~~~2.57~~~Nasdaq Composite~~27722.75~20690.25~0~~~~8.27~-3.84~ZS~~~-4.79~-8.42~-5.72~~~1.14~~~25164.36~~~~~";',
  'v_usINX="200~标普500~.INX~7541.40~7580.07~7610.83~3558585949~0~0~7505.29~0~0~0~0~0~0~0~0~0~7593.01~0~0~0~0~0~0~0~0~0~~2026-11-02 16:50:59~-38.67~-0.51~7662.23~7539.38~USD~3558585949~26836720075789~~~~~~1.62~~~S&P 500 Index~~7844.52~6316.91~0~~~~10.17~-1.76~ZS~~~-1.94~-2.99~-2.79~~~1.10~~~7541.40~~~~~";',
  'v_usNDX="200~纳斯达克100~.NDX~28180.26~27989.82~28085.50~1304372708~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~2026-11-03 17:15:59~190.44~0.68~28307.90~28085.50~USD~1304372708~36757565831025~~~~~~0.79~~~Nasdaq 100~~31361.37~22841.42~0~~~~11.61~-4.96~ZS~~~-4.44~-9.75~-4.87~~~0.84~~~28180.26~~~~~";',
  'v_usAAPL="200~苹果~AAPL.OQ~338.32~344.63~342.67~64757691~0~0~329.00~120~0~0~0~0~0~0~0~0~329.10~80~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~-6.31~-1.83~343.80~335.82~USD~64757691~21950929283~0.44~38.80~~45.35~~2.32~49344.34036~49375.02978~Apple Inc.~8.72~351.73~242.76~40~45.92~0.31~49375.02978~24.78~-1.63~GP~148.75~36.08~-1.35~1.63~8.07~14594180000~14585108878~1.41~36.88~1.06~338.97~~~~~";',
  'v_usMSFT="200~微软~MSFT.OQ~507.12~521.91~524.02~34743321~0~0~508.15~240~0~0~0~0~0~0~0~0~508.88~80~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~-14.79~-2.83~529.63~504.96~USD~34743321~17947737859~0.47~26.48~~28.25~~4.73~37648.15740~37659.71781~Microsoft Corporation~19.15~551.15~348.54~160~8.00~0.73~37659.71781~5.53~-4.78~GP~34.22~20.15~-4.95~-3.44~1.62~7426194552~7423914932~1.22~25.77~3.71~516.58~~~~~";',
  'v_usNVDA="200~英伟达~NVDA.OQ~202.06~204.64~207.53~119272174~0~0~203.79~3200~0~0~0~0~0~0~0~0~203.80~3700~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~-2.58~-1.26~209.98~201.66~USD~119272174~24456602984~0.49~25.54~~41.24~~4.06~46857.09324~48791.42820~Nvidia Corporation~7.91~243.37~163.89~-500~21.31~0.26~48791.42820~8.60~-6.45~GP~117.21~83.68~-6.92~-15.42~-9.68~24147000000~23189692783~1.16~20.83~0.52~205.05~~~~~";',
  'v_usGOOGL="200~谷歌-A~GOOGL.OQ~278.99~279.84~282.46~48512348~0~0~280.40~80~0~0~0~0~0~0~0~0~280.50~80~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~-0.85~-0.30~287.00~278.80~USD~48512348~13707308329~0.39~14.57~~25.81~~2.93~16419.68587~34299.03060~Alphabet Inc.~19.15~408.12~270.00~0~5.20~0.31~34299.03060~-10.70~-11.93~GP~44.29~30.61~-18.94~-19.48~-21.21~12294000000~5885403014~0.76~12.81~0.87~282.55~~~~~";',
  'v_usAMZN="200~亚马逊~AMZN.OQ~245.63~240.35~243.01~58347979~0~0~246.15~40~0~0~0~0~0~0~0~0~246.55~40~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~5.28~2.20~253.81~242.28~USD~58347979~14530847488~0.54~19.86~~34.26~~4.80~24217.33712~26560.31162~Amazon.Com, Inc.~12.37~287.20~196.00~0~4.33~~26560.31162~6.42~-1.39~GP~27.42~13.67~-6.41~-2.30~-10.51~10813138306~9859274976~1.00~17.68~~249.04~~~~~";',
  'v_usMETA="200~Meta Platforms~META.OQ~606.73~614.99~614.44~19496498~0~0~608.80~40~0~0~0~0~0~0~0~0~609.20~40~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~-8.26~-1.34~621.69~606.41~USD~19496498~11925087046~0.75~20.70~~25.83~~2.48~13705.98435~15792.16887~Meta Platforms, Inc.~29.31~779.82~519.38~0~5.70~0.35~15792.16887~-7.84~-3.78~GP~32.26~19.23~-13.99~-18.22~2.55~2602833034~2258992360~0.56~22.26~2.10~611.65~~~~~";',
  'v_usTSLA="200~特斯拉~TSLA.OQ~403.82~399.81~404.66~43141083~0~0~403.75~80~0~0~0~0~0~0~0~0~404.38~120~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~4.01~1.00~414.23~397.61~USD~43141083~17557835326~1.09~443.76~~373.91~~4.16~14280.22620~15961.91490~Tesla, Inc.~0.91~498.83~297.38~-40~17.88~~15961.91490~-10.21~3.12~GP~3.80~2.21~9.72~6.62~22.90~3952730153~3536285027~1.09~452.05~~406.99~~~~~";',
  'v_usAVGO="200~博通~AVGO.OQ~322.23~326.08~328.37~20326866~0~0~323.00~240~0~0~0~0~0~0~0~0~324.00~280~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~-3.85~-1.18~333.56~321.87~USD~20326866~6625146018~0.43~41.10~~67.55~~3.59~15093.95973~15382.06751~Broadcom Inc.~7.84~493.32~288.98~-40~15.43~0.81~15382.06751~-6.38~-2.11~GP~44.25~21.63~-3.69~-11.11~-24.53~4773629865~4684219262~0.84~39.68~2.60~325.93~~~~~";',
  'v_usNFLX="200~奈飞~NFLX.OQ~62.34~62.08~62.20~40917261~0~0~62.40~500~0~0~0~0~0~0~0~0~62.50~300~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~0.26~0.42~62.89~61.71~USD~40917261~2550681312~0.98~18.02~~24.64~~1.90~2580.25098~2595.79999~Netflix, Inc.~3.46~116.73~61.39~200~8.86~~2595.79999~-33.51~-2.44~GP~53.46~25.99~-10.75~-7.64~-15.92~4163939676~4138997409~0.84~16.12~~62.34~~~~~";',
  'v_usAMD="200~超威半导体~AMD.OQ~466.84~504.80~510.71~32141002~0~0~471.73~40~0~0~0~0~0~0~0~0~472.50~200~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~-37.96~-7.52~512.82~466.07~USD~32141002~15518801360~1.97~119.70~~176.17~~9.26~7588.73991~7621.04649~Advanced Micro Devices, Inc.~3.90~658.52~188.22~-160~11.34~~7621.04649~117.99~-12.13~GP~10.20~8.12~-13.23~-26.10~-3.42~1632475042~1625554775~1.42~105.14~~482.84~~~~~";',
  'v_usCOST="200~好市多~COST.OQ~1040.55~1012.28~1015.87~3114794~0~0~1041.01~40~0~0~0~0~0~0~0~0~1042.00~200~0~0~0~0~0~0~0~0~~2026-11-02 16:00:02~28.27~2.79~1042.57~1014.34~USD~3114794~3226024896~0.70~50.12~~50.12~~2.79~4606.19310~4610.98244~Costco Wholesale Corporation~20.76~1093.10~839.09~-160~12.88~0.55~4610.98244~21.38~3.68~GP~28.40~11.11~4.68~12.84~9.95~443129349~442669079~1.37~50.12~5.71~1035.71~~~~~";',
  'v_usJPM="200~摩根大通~JPM.N~340.58~337.04~340.94~6014662~0~0~340.25~40~0~0~0~0~0~0~0~0~341.24~400~0~0~0~0~0~0~0~0~~2026-11-02 16:04:32~3.54~1.05~342.43~339.92~USD~6014662~2051072343~0.23~14.29~~17.01~~0.74~9015.24428~9044.44248~Jp Morgan Chase & Co.~23.84~364.67~275.05~-360~2.57~1.81~9044.44248~7.74~1.96~GP~17.93~1.36~2.11~2.98~-4.26~2655600000~2647026918~1.01~13.30~6.15~341.01~~~~~";',
].join("");

function toNum(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseRecord(fields: string[], item: WatchItem): UsQuote | null {
  const price = toNum(fields[3]);
  const prevClose = toNum(fields[4]);
  if (price === null || prevClose === null || price <= 0 || prevClose <= 0) {
    return null;
  }
  const change = price - prevClose;
  const marketCapYi = toNum(fields[45]); // 亿 USD
  return {
    symbol: item.symbol,
    code: fields[2] || item.symbol,
    name: fields[1] || item.name,
    nameEn: fields[46] || item.nameEn,
    price,
    prevClose,
    change,
    changePct: (change / prevClose) * 100,
    open: toNum(fields[5]) ?? price,
    high: toNum(fields[33]) ?? price,
    low: toNum(fields[34]) ?? price,
    volume: toNum(fields[6]) ?? 0,
    pe: toNum(fields[39]),
    marketCapUsd: marketCapYi === null ? null : marketCapYi * 1e8,
    week52High: toNum(fields[48]),
    week52Low: toNum(fields[49]),
    quoteTime: fields[30] || null,
    tech: null,
    valuation: null,
  };
}

function buildSnapshot(text: string, demo: boolean): UsMarketSnapshot {
  const records: Record<string, string[]> = {};
  for (const match of text.matchAll(/v_us(\w+)="([^"]*)"/g)) {
    records[match[1]] = match[2].split("~");
  }
  const resolve = (item: WatchItem) => {
    const fields = records[item.symbol];
    return fields ? parseRecord(fields, item) : null;
  };
  return {
    demo,
    fetchedAt: Date.now(),
    indices: INDICES.map(resolve).filter((q): q is UsQuote => q !== null),
    stocks: STOCKS.map(resolve).filter((q): q is UsQuote => q !== null),
  };
}

async function fetchLiveSnapshot(): Promise<UsMarketSnapshot> {
  const codes = [...INDICES, ...STOCKS].map((item) => `us${item.symbol}`).join(",");
  const response = await fetch(`${QUOTE_ENDPOINT}${codes}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`quote endpoint responded with ${response.status}`);
  }
  const text = new TextDecoder("gbk").decode(await response.arrayBuffer());
  const snapshot = buildSnapshot(text, false);
  if (snapshot.stocks.length === 0) {
    throw new Error("quote payload contained no usable records");
  }
  return snapshot;
}

// ---------------------------------------------------------------------------
// Daily klines + technical indicators
// ---------------------------------------------------------------------------

async function fetchKlines(symbol: string): Promise<Candle[]> {
  return fetchKlinesSecid(symbol, US_KLINE_SECID[symbol]);
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
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function attachTechnicals(snapshot: UsMarketSnapshot): Promise<void> {
  const quotes = [...snapshot.indices, ...snapshot.stocks];
  const barsList = await mapWithConcurrency(quotes, 6, async (quote) => {
    try {
      return await fetchKlines(quote.symbol);
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

let valuationCache: { at: number; map: Record<string, Valuation> } | null = null;

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
  const json = (await response.json()) as { data?: { items?: DanjuanItem[] } };
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
    return buildSnapshot(DEMO_RESPONSE, true);
  }
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

export async function getSymbolDetail(symbol: string): Promise<SymbolDetail | null> {
  const snapshot = await getUsMarketSnapshot();
  const quote = [...snapshot.indices, ...snapshot.stocks].find(
    (item) => item.symbol === symbol
  );
  if (!quote) return null;
  let bars: Candle[] = [];
  try {
    bars = await fetchKlines(quote.symbol);
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

export async function getSimulationData(window = 250): Promise<SimulationData> {
  const symbols = STOCKS.map((item) => item.symbol);
  const benchSymbol = "INX";
  const all = [...symbols, benchSymbol];

  const barsList = await mapWithConcurrency(all, 6, async (symbol) => {
    try {
      return await fetchKlines(symbol);
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
  const benchMap = new Map((benchmarkBars ?? []).map((bar) => [bar.date, bar.close]));
  let benchLast = NaN;
  const benchmarkCloses = dates.map((date) => {
    const close = benchMap.get(date);
    if (close !== undefined) benchLast = close;
    return Number.isFinite(benchLast) ? benchLast : NaN;
  });

  return {
    dates,
    series,
    benchmark: { symbol: benchSymbol, name: "S&P 500", closes: benchmarkCloses },
  };
}

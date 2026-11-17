// Asia-Pacific market data.
// - Indices (Nikkei 225, KOSPI, Hang Seng, Shanghai Composite): Eastmoney
//   quotes + klines (full technicals).
// - Stocks (Toyota, Samsung...): Tencent quotes only — Tencent does not serve
//   JP/KR stock history, so those cards show quotes without indicators.

import { ASIA_INDICES, type IndexMeta } from "./index-symbols";
import {
  attachIndexTechnicals,
  fetchIndexQuoteMeta,
} from "./index-quotes";
import type { UsMarketSnapshot, UsQuote } from "./us-stocks";

type TencentStock = {
  symbol: string;
  name: string;
  nameEn: string;
  tencent: string;
  currency: string;
};

const INDICES: IndexMeta[] = ASIA_INDICES;

const STOCKS: TencentStock[] = [
  { symbol: "7203", name: "丰田汽车", nameEn: "Toyota Motor", tencent: "jp7203", currency: "¥" },
  { symbol: "6758", name: "索尼", nameEn: "Sony", tencent: "jp6758", currency: "¥" },
  { symbol: "9984", name: "软银集团", nameEn: "SoftBank Group", tencent: "jp9984", currency: "¥" },
  { symbol: "7974", name: "任天堂", nameEn: "Nintendo", tencent: "jp7974", currency: "¥" },
  { symbol: "8035", name: "东京电子", nameEn: "Tokyo Electron", tencent: "jp8035", currency: "¥" },
  { symbol: "005930", name: "三星电子", nameEn: "Samsung Electronics", tencent: "kr005930", currency: "₩" },
  { symbol: "000660", name: "SK海力士", nameEn: "SK hynix", tencent: "kr000660", currency: "₩" },
  { symbol: "005380", name: "现代汽车", nameEn: "Hyundai Motor", tencent: "kr005380", currency: "₩" },
  { symbol: "373220", name: "LG新能源", nameEn: "LG Energy Solution", tencent: "kr373220", currency: "₩" },
];

export const ASIA_KLINE_SECID: Record<string, string> = Object.fromEntries(
  INDICES.map((item) => [item.symbol, item.em])
);

export const ASIA_CURRENCY: Record<string, string> = Object.fromEntries(
  STOCKS.map((item) => [item.symbol, item.currency])
);

const QUOTE_ENDPOINT = "https://qt.gtimg.cn/q=";
const REQUEST_TIMEOUT_MS = 8_000;
const QUOTE_TTL_MS = 60_000;

function toNum(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Tencent JP/KR stock quote — layout matches the US payload. */
function parseTencentStock(fields: string[], item: TencentStock): UsQuote | null {
  const price = toNum(fields[3]);
  const prevClose = toNum(fields[4]);
  if (price === null || prevClose === null || price <= 0 || prevClose <= 0) {
    return null;
  }
  const change = price - prevClose;
  return {
    symbol: item.symbol,
    code: fields[2] || item.tencent,
    name: item.name,
    nameEn: item.nameEn,
    price,
    prevClose,
    change,
    changePct: (change / prevClose) * 100,
    open: toNum(fields[5]) ?? price,
    high: toNum(fields[33]) ?? price,
    low: toNum(fields[34]) ?? price,
    volume: toNum(fields[6]) ?? 0,
    pe: toNum(fields[39]),
    marketCapUsd: null,
    week52High: toNum(fields[48]),
    week52Low: toNum(fields[49]),
    quoteTime: fields[30] || null,
    tech: null,
    valuation: null,
  };
}

async function fetchTencentStocks(): Promise<UsQuote[]> {
  const codes = STOCKS.map((item) => item.tencent).join(",");
  const response = await fetch(`${QUOTE_ENDPOINT}${codes}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`asia stock quote ${response.status}`);
  const text = new TextDecoder("gbk").decode(await response.arrayBuffer());
  const records: Record<string, string[]> = {};
  for (const match of text.matchAll(/v_(\w+)="([^"]*)"/g)) {
    records[match[1]] = match[2].split("~");
  }
  return STOCKS.map((item) => {
    const fields = records[item.tencent];
    return fields ? parseTencentStock(fields, item) : null;
  }).filter((q): q is UsQuote => q !== null);
}

let cache: { at: number; data: UsMarketSnapshot } | null = null;

export async function getAsiaMarketSnapshot(): Promise<UsMarketSnapshot> {
  const now = Date.now();
  if (cache && now - cache.at < QUOTE_TTL_MS) return cache.data;
  try {
    const indexResults = await Promise.allSettled(
      INDICES.map(fetchIndexQuoteMeta)
    );
    const indices = indexResults.flatMap((result) =>
      result.status === "fulfilled" && result.value ? [result.value] : []
    );
    let stocks: UsQuote[] = [];
    try {
      stocks = await fetchTencentStocks();
    } catch {
      // Keep the index board usable when the JP/KR stock feed is unavailable.
    }
    if (indices.length === 0 && stocks.length === 0) {
      throw new Error("empty asia snapshot");
    }
    await attachIndexTechnicals(indices);
    const data: UsMarketSnapshot = {
      demo: indices.length < INDICES.length,
      fetchedAt: now,
      indices,
      stocks,
    };
    cache = { at: now, data };
    return data;
  } catch {
    return { demo: true, fetchedAt: now, indices: [], stocks: [] };
  }
}
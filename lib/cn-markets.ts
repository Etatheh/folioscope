// China A-share market data.
// Quotes: Tencent quote endpoint (GBK). Klines: Eastmoney (lib/klines.ts).
// The Tencent A-share payload layout differs from the US one, hence the
// dedicated parser below (verified field indexes).

import { fetchKlinesSecid } from "./klines";
import {
  computeTechnicals,
  type UsMarketSnapshot,
  type UsQuote,
} from "./us-stocks";

type CnItem = {
  symbol: string;
  name: string;
  nameEn: string;
  tencent: string;
  secid: string;
};

const INDICES: CnItem[] = [
  { symbol: "SH000001", name: "上证指数", nameEn: "Shanghai Composite", tencent: "sh000001", secid: "1.000001" },
  { symbol: "SZ399001", name: "深证成指", nameEn: "Shenzhen Component", tencent: "sz399001", secid: "0.399001" },
  { symbol: "SZ399006", name: "创业板指", nameEn: "ChiNext", tencent: "sz399006", secid: "0.399006" },
  { symbol: "SH000300", name: "沪深300", nameEn: "CSI 300", tencent: "sh000300", secid: "1.000300" },
];

const STOCKS: CnItem[] = [
  { symbol: "600519", name: "贵州茅台", nameEn: "Kweichow Moutai", tencent: "sh600519", secid: "1.600519" },
  { symbol: "300750", name: "宁德时代", nameEn: "CATL", tencent: "sz300750", secid: "0.300750" },
  { symbol: "002594", name: "比亚迪", nameEn: "BYD", tencent: "sz002594", secid: "0.002594" },
  { symbol: "688981", name: "中芯国际", nameEn: "SMIC", tencent: "sh688981", secid: "1.688981" },
  { symbol: "600036", name: "招商银行", nameEn: "China Merchants Bank", tencent: "sh600036", secid: "1.600036" },
  { symbol: "000858", name: "五粮液", nameEn: "Wuliangye", tencent: "sz000858", secid: "0.000858" },
  { symbol: "300059", name: "东方财富", nameEn: "East Money", tencent: "sz300059", secid: "0.300059" },
  { symbol: "601012", name: "隆基绿能", nameEn: "LONGi Green Energy", tencent: "sh601012", secid: "1.601012" },
  { symbol: "601318", name: "中国平安", nameEn: "Ping An Insurance", tencent: "sh601318", secid: "1.601318" },
];

export const CN_KLINE_SECID: Record<string, string> = Object.fromEntries(
  [...INDICES, ...STOCKS].map((item) => [item.symbol, item.secid])
);

const QUOTE_ENDPOINT = "https://qt.gtimg.cn/q=";
const REQUEST_TIMEOUT_MS = 8_000;
const QUOTE_TTL_MS = 60_000;

function toNum(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** "20261110161453" -> "2026-11-10 16:14:53" */
function formatCnTime(value: string | undefined): string | null {
  if (!value || !/^\d{14}$/.test(value)) return value || null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`;
}

function parseRecord(fields: string[], item: CnItem): UsQuote | null {
  const price = toNum(fields[3]);
  const prevClose = toNum(fields[4]);
  if (price === null || prevClose === null || price <= 0 || prevClose <= 0) {
    return null;
  }
  const change = price - prevClose;
  const mcapYi = toNum(fields[45]); // 总市值（亿）
  return {
    symbol: item.symbol,
    code: fields[2] || item.symbol,
    name: fields[1] || item.name,
    nameEn: item.nameEn,
    price,
    prevClose,
    change,
    changePct: (change / prevClose) * 100,
    open: toNum(fields[5]) ?? price,
    high: toNum(fields[33]) ?? price,
    low: toNum(fields[34]) ?? price,
    volume: toNum(fields[6]) ?? 0, // 手
    pe: toNum(fields[39]),
    marketCapUsd: mcapYi === null ? null : mcapYi * 1e8,
    week52High: null,
    week52Low: null,
    quoteTime: formatCnTime(fields[30]),
    tech: null,
    valuation: null,
  };
}

async function fetchSnapshot(): Promise<{ indices: UsQuote[]; stocks: UsQuote[] }> {
  const codes = [...INDICES, ...STOCKS].map((item) => item.tencent).join(",");
  const response = await fetch(`${QUOTE_ENDPOINT}${codes}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`cn quote endpoint responded with ${response.status}`);
  }
  const text = new TextDecoder("gbk").decode(await response.arrayBuffer());
  const records: Record<string, string[]> = {};
  for (const match of text.matchAll(/v_(\w+)="([^"]*)"/g)) {
    records[match[1]] = match[2].split("~");
  }
  const resolve = (item: CnItem) => {
    const fields = records[item.tencent];
    return fields ? parseRecord(fields, item) : null;
  };
  return {
    indices: INDICES.map(resolve).filter((q): q is UsQuote => q !== null),
    stocks: STOCKS.map(resolve).filter((q): q is UsQuote => q !== null),
  };
}

async function attachTechnicals(quotes: UsQuote[]): Promise<void> {
  const results = await Promise.all(
    quotes.map(async (quote) => {
      try {
        const bars = await fetchKlinesSecid(quote.symbol, CN_KLINE_SECID[quote.symbol]);
        return bars.length >= 5 ? computeTechnicals(bars) : null;
      } catch {
        return null;
      }
    })
  );
  quotes.forEach((quote, i) => {
    quote.tech = results[i];
  });
}

let cache: { at: number; data: UsMarketSnapshot } | null = null;

export async function getCnMarketSnapshot(): Promise<UsMarketSnapshot> {
  const now = Date.now();
  if (cache && now - cache.at < QUOTE_TTL_MS) return cache.data;
  try {
    const { indices, stocks } = await fetchSnapshot();
    const all = [...indices, ...stocks];
    if (all.length === 0) throw new Error("empty cn snapshot");
    await attachTechnicals(all);
    const data: UsMarketSnapshot = { demo: false, fetchedAt: now, indices, stocks };
    cache = { at: now, data };
    return data;
  } catch {
    return { demo: true, fetchedAt: now, indices: [], stocks: [] };
  }
}

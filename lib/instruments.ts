// Unified instrument lookup for the detail page (US / A-share / Japan-Korea /
// Europe / Asia-Pacific indices).

import { fetchKlinesSecid } from "./klines";
import { getCnMarketSnapshot, CN_KLINE_SECID } from "./cn-markets";
import { getAsiaMarketSnapshot, ASIA_KLINE_SECID, ASIA_CURRENCY } from "./asia-markets";
import { getEuropeMarketSnapshot, EUROPE_KLINE_SECID } from "./europe-markets";
import { EUROPE_INDICES, INDEX_KLINE_SECID } from "./index-symbols";
import { getIndexQuote } from "./index-quotes";
import {
  getUsMarketSnapshot,
  fetchQuoteBySymbol,
  fetchUsKlines,
  computeTechnicals,
  type Candle,
  type UsQuote,
} from "./us-stocks";

// Daily history is fetched deep enough to warm up MA20 / BOLL(20) and to build
// weekly/monthly aggregates for the detail-page chart tabs.
const DETAIL_BAR_LIMIT = 900;

export type InstrumentMarket = "us" | "cn" | "asia" | "europe";

export type InstrumentDetail = {
  quote: UsQuote;
  bars: Candle[];
  demo: boolean;
  market: InstrumentMarket;
  /** currency prefix for prices ("" for index points) */
  currency: string;
};

export async function getInstrumentDetail(symbol: string): Promise<InstrumentDetail | null> {
  const normalized = symbol.toUpperCase();
  const us = await getUsMarketSnapshot();
  let quote = [...us.indices, ...us.stocks].find((item) => item.symbol === normalized);
  let market: InstrumentMarket = "us";
  let demo = us.demo;

  // Pro search can land on any U.S. ticker, not just dashboard snapshot names.
  if (!quote) {
    const generic = await fetchQuoteBySymbol(normalized);
    if (generic) {
      quote = generic;
      demo = false;
    }
  }

  if (!quote) {
    const cn = await getCnMarketSnapshot();
    quote = [...cn.indices, ...cn.stocks].find((item) => item.symbol === normalized);
    if (quote) {
      market = "cn";
      demo = cn.demo;
    }
  }

  if (!quote) {
    const asia = await getAsiaMarketSnapshot();
    quote = [...asia.indices, ...asia.stocks].find((item) => item.symbol === normalized);
    if (quote) {
      market = "asia";
      demo = asia.demo;
    }
  }

  if (!quote) {
    const europe = await getEuropeMarketSnapshot();
    quote = europe.indices.find((item) => item.symbol === normalized);
    if (quote) {
      market = "europe";
      demo = europe.demo;
    }
  }

  // A transient snapshot failure must not turn a public index into a 404.
  if (!quote) {
    try {
      const indexQuote = await getIndexQuote(normalized);
      if (indexQuote) {
        quote = indexQuote;
        market = EUROPE_INDICES.some((item) => item.symbol === normalized)
          ? "europe"
          : "asia";
        demo = false;
      }
    } catch {
      // fall through to 404 when the direct index quote also fails
    }
  }

  if (!quote) return null;

  let bars: Candle[] = [];
  try {
    if (market === "us") {
      bars = await fetchUsKlines(normalized, DETAIL_BAR_LIMIT);
    } else {
      const secid =
        CN_KLINE_SECID[normalized] ??
        INDEX_KLINE_SECID[normalized] ??
        ASIA_KLINE_SECID[normalized] ??
        EUROPE_KLINE_SECID[normalized];
      if (secid) bars = await fetchKlinesSecid(normalized, secid, DETAIL_BAR_LIMIT);
    }
  } catch {
    // leave empty; the chart area shows an empty state
  }

  // ETFs and indices legitimately have no P/E or market cap, but they still
  // have daily bars. Derive MA/RSI/MACD here so a missing valuation can never
  // turn the technical block into "indicators unavailable".
  if (bars.length >= 5 && !quote.tech) {
    quote = { ...quote, tech: computeTechnicals(bars) };
  }

  const currency =
    market === "us"
      ? "$"
      : market === "cn"
        ? "¥"
        : market === "asia"
          ? (ASIA_CURRENCY[normalized] ?? "")
          : "";

  return { quote, bars, demo, market, currency };
}
// Unified instrument lookup for the detail page (US / A-share / Japan-Korea).

import { fetchKlinesSecid } from "./klines";
import { getCnMarketSnapshot, CN_KLINE_SECID } from "./cn-markets";
import { getAsiaMarketSnapshot, ASIA_KLINE_SECID, ASIA_CURRENCY } from "./asia-markets";
import {
  getUsMarketSnapshot,
  fetchUsKlines,
  type Candle,
  type UsQuote,
} from "./us-stocks";

export type InstrumentMarket = "us" | "cn" | "asia";

export type InstrumentDetail = {
  quote: UsQuote;
  bars: Candle[];
  demo: boolean;
  market: InstrumentMarket;
  /** currency prefix for prices ("" for index points) */
  currency: string;
};

export async function getInstrumentDetail(symbol: string): Promise<InstrumentDetail | null> {
  const us = await getUsMarketSnapshot();
  let quote = [...us.indices, ...us.stocks].find((item) => item.symbol === symbol);
  let market: InstrumentMarket = "us";
  let demo = us.demo;

  if (!quote) {
    const cn = await getCnMarketSnapshot();
    quote = [...cn.indices, ...cn.stocks].find((item) => item.symbol === symbol);
    if (quote) {
      market = "cn";
      demo = cn.demo;
    }
  }

  if (!quote) {
    const asia = await getAsiaMarketSnapshot();
    quote = [...asia.indices, ...asia.stocks].find((item) => item.symbol === symbol);
    if (quote) {
      market = "asia";
      demo = asia.demo;
    }
  }

  if (!quote) return null;

  let bars: Candle[] = [];
  try {
    if (market === "us") {
      bars = await fetchUsKlines(symbol);
    } else {
      const secid = CN_KLINE_SECID[symbol] ?? ASIA_KLINE_SECID[symbol];
      if (secid) bars = await fetchKlinesSecid(symbol, secid);
    }
  } catch {
    // leave empty; the chart area shows an empty state
  }

  const currency =
    market === "us" ? "$" : market === "cn" ? "¥" : (ASIA_CURRENCY[symbol] ?? "");

  return { quote, bars, demo, market, currency };
}

// Resolve a public symbol to the right daily-history loader.
//
// U.S. tickers (including the 14 free featured names) use the Eastmoney US
// loader, A-shares use their Tencent/Eastmoney secid, and the Europe /
// Asia-Pacific indices use the shared global-index table.

import { fetchKlinesSecid } from "./klines";
import { fetchIndexBars } from "./index-quotes";
import { INDEX_KLINE_SECID } from "./index-symbols";
import { CN_KLINE_SECID } from "./cn-markets";
import { ASIA_KLINE_SECID } from "./asia-markets";
import { EUROPE_KLINE_SECID } from "./europe-markets";
import { fetchUsKlines, type Candle } from "./us-stocks";

export async function fetchMarketSeries(
  symbol: string,
  limit = 420
): Promise<Candle[]> {
  const normalized = symbol.toUpperCase();

  if (INDEX_KLINE_SECID[normalized]) {
    return fetchIndexBars(normalized, limit);
  }

  const secid =
    CN_KLINE_SECID[normalized] ??
    ASIA_KLINE_SECID[normalized] ??
    EUROPE_KLINE_SECID[normalized];

  if (secid) {
    return fetchKlinesSecid(normalized, secid, limit);
  }

  return fetchUsKlines(normalized, limit);
}
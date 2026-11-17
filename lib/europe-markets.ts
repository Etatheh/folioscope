// Europe market data — index-only by design. The board intentionally does not
// include individual European equities; it is a compact macro overview.

import { EUROPE_INDICES } from "./index-symbols";
import { getIndexSnapshot } from "./index-quotes";
import type { UsMarketSnapshot } from "./us-stocks";

export const EUROPE_KLINE_SECID: Record<string, string> = Object.fromEntries(
  EUROPE_INDICES.map((item) => [item.symbol, item.em])
);

const QUOTE_TTL_MS = 60_000;

let cache: { at: number; data: UsMarketSnapshot } | null = null;

export async function getEuropeMarketSnapshot(): Promise<UsMarketSnapshot> {
  const now = Date.now();
  if (cache && now - cache.at < QUOTE_TTL_MS) return cache.data;
  const data = await getIndexSnapshot(EUROPE_INDICES);
  if (!data.demo) cache = { at: now, data };
  return data;
}
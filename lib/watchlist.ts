// Shared watchlist constants and helpers (safe for both server and client).
//
// The "featured" pool is free for every visitor: 14 liquid US large caps and
// ETFs. Everything outside this list is a Pro-only search result.

import { isPublicIndexSymbol } from "./index-symbols";

export const FEATURED_SYMBOLS = [
  "SPY",
  "QQQ",
  "NVDA",
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "META",
  "TSLA",
  "AVGO",
  "NFLX",
  "AMD",
  "LLY",
  "BRK.B",
] as const;

export type FeaturedSymbol = (typeof FEATURED_SYMBOLS)[number];

export const FEATURED_SYMBOL_SET: ReadonlySet<string> = new Set(FEATURED_SYMBOLS);

/** Localized display names for the featured pool (search previews, empty cards). */
export const SYMBOL_NAMES: Record<
  string,
  { zh: string; en: string }
> = {
  SPY: { zh: "标普500 ETF", en: "SPDR S&P 500 ETF" },
  QQQ: { zh: "纳指100 ETF", en: "Invesco QQQ" },
  NVDA: { zh: "英伟达", en: "NVIDIA" },
  AAPL: { zh: "苹果", en: "Apple" },
  MSFT: { zh: "微软", en: "Microsoft" },
  GOOGL: { zh: "谷歌-A", en: "Alphabet" },
  AMZN: { zh: "亚马逊", en: "Amazon" },
  META: { zh: "Meta", en: "Meta Platforms" },
  TSLA: { zh: "特斯拉", en: "Tesla" },
  AVGO: { zh: "博通", en: "Broadcom" },
  NFLX: { zh: "奈飞", en: "Netflix" },
  AMD: { zh: "超威半导体", en: "AMD" },
  LLY: { zh: "礼来", en: "Eli Lilly" },
  "BRK.B": { zh: "伯克希尔-B", en: "Berkshire Hathaway B" },
};

/**
 * Accept "brk.b", " BRK.B " and "BRK-B" but never arbitrary injection.
 * Public region indices use Yahoo-style symbols (`^FTSE`, `000001.SS`), so the
 * allow-list is checked before the stricter US-ticker pattern.
 */
export function normalizeSymbol(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, "");
  if (isPublicIndexSymbol(cleaned)) return cleaned;
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(cleaned)) return null;
  return cleaned;
}

export function isFeaturedSymbol(symbol: string): boolean {
  return FEATURED_SYMBOL_SET.has(symbol.toUpperCase());
}

export function symbolLabel(symbol: string, lang: "zh" | "en"): string {
  return SYMBOL_NAMES[symbol]?.[lang] ?? symbol;
}

/** Fired after a Pro search result is synced to the backtest simulator pool. */
export const BACKTEST_ADD_EVENT = "indepth:backtest-add-symbol";

/** Hand-off when "sync to backtest" is clicked from another dashboard view. */
export const BACKTEST_PENDING_KEY = "indepth.backtest.pending-symbol";

export function queueBacktestSymbol(symbol: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BACKTEST_PENDING_KEY, symbol);
  } catch {
    // private mode: the simulator simply opens without the extra symbol
  }
}

export function takeQueuedBacktestSymbol(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(BACKTEST_PENDING_KEY);
    window.sessionStorage.removeItem(BACKTEST_PENDING_KEY);
    return normalizeSymbol(value ?? "");
  } catch {
    return null;
  }
}

/** Fired by the navbar heart when it wants the dashboard to focus its list. */
export const WATCHLIST_FOCUS_EVENT = "indepth:watchlist-focus";

export type WatchlistEntry = {
  symbol: string;
  createdAt: number;
};
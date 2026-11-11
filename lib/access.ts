// Viewer access control: anonymous visitors and Free users see a small slice
// of each market; Pro unlocks everything. Indices stay visible for everyone.

export type ViewerPlan = "anon" | "free" | "pro";

export const FREE_STOCK_COUNT = 4;

export const FREE_STOCK_SYMBOLS: Record<"us" | "cn" | "asia", string[]> = {
  us: ["AAPL", "MSFT", "NVDA", "GOOGL"],
  cn: ["600519", "300750", "002594", "688981"],
  asia: ["7203", "6758", "9984", "7974"],
};

export const INDEX_SYMBOLS = new Set([
  "DJI",
  "IXIC",
  "INX",
  "NDX",
  "SH000001",
  "SZ399001",
  "SZ399006",
  "SH000300",
  "N225",
  "KS11",
]);

export function isSymbolUnlocked(
  market: "us" | "cn" | "asia",
  symbol: string,
  plan: ViewerPlan
): boolean {
  if (plan === "pro") return true;
  if (INDEX_SYMBOLS.has(symbol)) return true;
  return (FREE_STOCK_SYMBOLS[market] ?? []).includes(symbol);
}

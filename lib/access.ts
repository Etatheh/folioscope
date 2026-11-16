// Viewer access control: anonymous visitors and Free users see a small slice
// of each market; Pro unlocks everything. Indices stay visible for everyone.

export type ViewerPlan = "anon" | "free" | "pro" | "admin";

export type Viewer = {
  plan: "free" | "pro";
  isAdmin?: boolean;
} | null;

/** Resolve the effective dashboard role. Developer access never depends on billing. */
export function getViewerPlan(viewer: Viewer): ViewerPlan {
  if (viewer?.isAdmin) return "admin";
  if (viewer?.plan === "pro") return "pro";
  return viewer ? "free" : "anon";
}

/** Developers and paid Pro users both unlock every dashboard feature. */
export function hasFullDashboardAccess(plan: ViewerPlan): boolean {
  return plan === "admin" || plan === "pro";
}

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
  if (hasFullDashboardAccess(plan)) return true;
  if (INDEX_SYMBOLS.has(symbol)) return true;
  return (FREE_STOCK_SYMBOLS[market] ?? []).includes(symbol);
}

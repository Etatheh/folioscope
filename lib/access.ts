// Viewer access control: anonymous visitors and Free users see a small slice
// of each market; Pro unlocks everything. Indices stay visible for everyone.

export type ViewerPlan = "anon" | "free" | "pro" | "admin";

/** Stored profile tier. `admin` is the developer/owner tier. */
export type AccessTier = "free" | "pro" | "admin";

export type Viewer = {
  plan: "free" | "pro";
  tier?: AccessTier;
  isAdmin?: boolean;
} | null;

/**
 * The single paid-access rule used by every component and API route:
 * only `pro` and `admin` tiers unlock paid features. Admins additionally get
 * unlimited AI quota.
 */
export function isProTier(tier: AccessTier | string | null | undefined): boolean {
  return tier === "pro" || tier === "admin";
}

/** Developer/owner tier — unlimited quota and every paid feature. */
export function isAdminTier(tier: AccessTier | string | null | undefined): boolean {
  return tier === "admin";
}

/** Pick the strongest tier, so a stale lower tier can never downgrade access. */
export function highestTier(
  ...tiers: (AccessTier | string | null | undefined)[]
): AccessTier {
  let best: AccessTier = "free";
  for (const tier of tiers) {
    if (tier === "admin") return "admin";
    if (tier === "pro") best = "pro";
  }
  return best;
}

/** Resolve a stored tier to the viewer plan used by the dashboard UI. */
export function tierToViewerPlan(
  tier: AccessTier | string | null | undefined
): ViewerPlan {
  if (tier === "admin") return "admin";
  if (tier === "pro") return "pro";
  return "free";
}

/** Resolve the effective dashboard role. Developer access never depends on billing. */
export function getViewerPlan(viewer: Viewer): ViewerPlan {
  if (!viewer) return "anon";
  if (viewer.isAdmin || isAdminTier(viewer.tier)) return "admin";
  // Accept either the stored tier or the legacy plan field, whichever is highest.
  if (isProTier(viewer.tier) || viewer.plan === "pro") return "pro";
  return "free";
}

/** Developers and paid Pro users both unlock every dashboard feature. */
export function hasFullDashboardAccess(plan: ViewerPlan): boolean {
  return isProTier(plan);
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

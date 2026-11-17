// Dashboard navigation state. The active view lives in the `view` query
// parameter so every sidebar entry is a real, shareable URL while the server
// only renders the selected module instead of stacking the whole dashboard.

export const DASHBOARD_VIEW_KEYS = [
  "all",
  "us",
  "europe",
  "asia",
  "watchlist",
  "simulator",
  "ai",
] as const;

export type DashboardView = (typeof DASHBOARD_VIEW_KEYS)[number];

export function parseDashboardView(
  value?: string | string[] | null
): DashboardView {
  const raw = Array.isArray(value) ? value[0] : value;
  return (DASHBOARD_VIEW_KEYS as readonly string[]).includes(raw ?? "")
    ? (raw as DashboardView)
    : "all";
}

export function dashboardViewHref(
  lang: "zh" | "en",
  view: DashboardView
): string {
  return `/dashboard?lang=${lang}&view=${view}`;
}

/** Market parent + its four sub-views. */
export const MARKET_VIEWS = ["all", "us", "europe", "asia"] as const;

export function isMarketView(view: DashboardView): boolean {
  return (MARKET_VIEWS as readonly string[]).includes(view);
}
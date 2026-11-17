import { isProTier } from "@/lib/access";
import { isPublicIndexSymbol } from "@/lib/index-symbols";
import { fetchMarketSeries } from "@/lib/market-series";
import { resolveRequestUser } from "@/lib/server/request-user";
import { isFeaturedSymbol, normalizeSymbol } from "@/lib/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Daily closes for the backtest simulator and the public index detail pages.
 *
 * The 14 curated names and the Europe / Asia-Pacific indices are public to
 * every visitor (including anonymous and FREE accounts). Any other U.S. ticker
 * stays Pro/Admin-only, matching the market search wall.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = normalizeSymbol(url.searchParams.get("symbol") ?? "");
  if (!symbol) {
    return Response.json(
      { ok: false, error: "Invalid symbol", code: "INVALID_SYMBOL" },
      { status: 400, headers: NO_STORE }
    );
  }

  const featured = isFeaturedSymbol(symbol);
  const publicIndex = isPublicIndexSymbol(symbol);
  const session = await resolveRequestUser(request);
  if (!featured && !publicIndex && !isProTier(session?.user.tier)) {
    return Response.json(
      {
        ok: false,
        error: session ? "Pro plan required" : "Authentication required",
        code: session ? "PRO_REQUIRED" : "AUTH_REQUIRED",
        locked: true,
      },
      { status: session ? 403 : 401, headers: NO_STORE }
    );
  }

  try {
    const bars = await fetchMarketSeries(symbol, 1300);
    return Response.json(
      { ok: true, symbol, bars },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[markets/series]", error);
    return Response.json(
      { ok: false, error: "Series unavailable", code: "SERIES_UNAVAILABLE" },
      { status: 503, headers: NO_STORE }
    );
  }
}
import { getViewerPlan } from "@/lib/access";
import { resolveRequestUser } from "@/lib/server/request-user";
import { fetchUsKlines } from "@/lib/us-stocks";
import { normalizeSymbol } from "@/lib/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Daily closes for Pro's "sync to backtest" action.
 *
 * Returns raw bars so the simulator can forward-fill them onto its own trading
 * calendar; the route stays Pro-gated for the same reason as quote search.
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

  const session = await resolveRequestUser(request);
  const plan = getViewerPlan(
    session
      ? { plan: session.user.plan, isAdmin: session.user.isAdmin }
      : null
  );
  if (plan !== "pro" && plan !== "admin") {
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
    const bars = await fetchUsKlines(symbol, 420);
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
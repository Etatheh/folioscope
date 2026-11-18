import { INDEX_SYMBOLS, isProTier } from "@/lib/access";
import { isPublicIndexSymbol } from "@/lib/index-symbols";
import { fetchIntradaySessions } from "@/lib/intraday";
import { resolveRequestUser } from "@/lib/server/request-user";
import { isFeaturedSymbol, normalizeSymbol } from "@/lib/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Five-day intraday series for the detail-page 5D tab.
 *
 * Access rules mirror /api/markets/series: the 14 featured U.S. names and the
 * public region indices are open to everyone; every other ticker requires a
 * Pro/Admin account.
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
  // The detail page treats every symbol in INDEX_SYMBOLS as public (including
  // DJI/IXIC/INX/NDX). Match that rule here so the 5D tab never hits a wall on
  // an index that the page itself just rendered.
  const publicIndex = isPublicIndexSymbol(symbol) || INDEX_SYMBOLS.has(symbol);
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
    const sessions = await fetchIntradaySessions(symbol);
    return Response.json(
      { ok: true, symbol, sessions },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[markets/intraday]", error);
    return Response.json(
      { ok: false, error: "Intraday unavailable", code: "INTRADAY_UNAVAILABLE" },
      { status: 503, headers: NO_STORE }
    );
  }
}
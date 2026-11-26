import { isProTier } from "@/lib/access";
import { isPublicIndexSymbol } from "@/lib/index-symbols";
import { getIndexQuote } from "@/lib/index-quotes";
import { resolveRequestUser } from "@/lib/server/request-user";
import { getQuoteForSymbol } from "@/lib/us-stocks";
import { isFeaturedSymbol, normalizeSymbol } from "@/lib/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * On-demand quote lookup for the search bar and the public regional index
 * boards.
 *
 * The 14 featured names and the Europe / Asia-Pacific indices are public. Any
 * other U.S. ticker is gated here as well as in the UI, so the Pro lock cannot
 * be bypassed by calling the route.
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
  // Paid access is defined by the tier only: pro/admin unlock the full market.
  const isPro = isProTier(session?.user.tier);
  const featured = isFeaturedSymbol(symbol);
  const publicIndex = isPublicIndexSymbol(symbol);

  if (!isPro && !featured && !publicIndex) {
    if (!session) {
      return Response.json(
        {
          ok: false,
          error: "Authentication required",
          code: "AUTH_REQUIRED",
          locked: true,
          featured,
        },
        { status: 401, headers: NO_STORE }
      );
    }
    return Response.json(
      {
        ok: false,
        error: "Pro plan required",
        code: "PRO_REQUIRED",
        locked: true,
        featured,
      },
      { status: 403, headers: NO_STORE }
    );
  }

  try {
    const quote = publicIndex
      ? await getIndexQuote(symbol)
      : await getQuoteForSymbol(symbol);
    if (!quote) {
      return Response.json(
        { ok: false, error: "Symbol not found", code: "NOT_FOUND" },
        { status: 404, headers: NO_STORE }
      );
    }
    return Response.json(
      { ok: true, quote, featured, publicIndex, pro: isPro },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[markets/quote]", error);
    return Response.json(
      { ok: false, error: "Quote feed unavailable", code: "QUOTE_UNAVAILABLE" },
      { status: 503, headers: NO_STORE }
    );
  }
}

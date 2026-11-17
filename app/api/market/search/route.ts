import YahooFinance from "yahoo-finance2";
import type { Quote } from "yahoo-finance2/modules/quote";

import { isProTier } from "@/lib/access";
import { resolveRequestUser } from "@/lib/server/request-user";
import type { MarketSearchHit } from "@/lib/market-search";
import { getQuoteForSymbol, type UsQuote } from "@/lib/us-stocks";
import { SYMBOL_NAMES, normalizeSymbol } from "@/lib/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** Yahoo's U.S. venue codes; the quote payload is also checked for us_market. */
const US_EXCHANGES = new Set([
  "NMS",
  "NGM",
  "NCM",
  "NYQ",
  "PCX",
  "ASE",
  "BTS",
  "PNK",
  "OQX",
  "NAS",
  "NYE",
]);

function jsonError(message: string, status: number, code: string) {
  return Response.json(
    { ok: false, error: message, code, locked: status === 401 || status === 403 },
    { status, headers: NO_STORE }
  );
}

/** Yahoo class shares use BRK-B while our app stores BRK.B. */
function normalizeYahooSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  return /^[A-Z]+-[A-Z]$/.test(upper) ? upper.replace("-", ".") : upper;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateString(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
}

type SearchCandidate = {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange: string;
  exchDisp?: string;
  quoteType: "EQUITY" | "ETF";
};

function quoteFromYahoo(
  symbol: string,
  quote: Quote | undefined,
  fallbackName: string
): UsQuote {
  const price = num(quote?.regularMarketPrice) ?? 0;
  const change = num(quote?.regularMarketChange) ?? 0;
  const prevClose =
    num(quote?.regularMarketPreviousClose) ?? (price > 0 ? price - change : 0);
  const name =
    quote?.shortName ||
    quote?.longName ||
    fallbackName ||
    symbol;
  const known = SYMBOL_NAMES[symbol];

  return {
    symbol,
    code: symbol,
    name: known?.zh || name,
    nameEn: known?.en || name,
    price,
    prevClose,
    change,
    changePct: num(quote?.regularMarketChangePercent) ?? 0,
    open: num(quote?.regularMarketOpen) ?? price,
    high: num(quote?.regularMarketDayHigh) ?? price,
    low: num(quote?.regularMarketDayLow) ?? price,
    volume: num(quote?.regularMarketVolume) ?? 0,
    pe: num(quote?.trailingPE),
    marketCapUsd: num(quote?.marketCap),
    week52High: num(quote?.fiftyTwoWeekHigh),
    week52Low: num(quote?.fiftyTwoWeekLow),
    quoteTime: dateString(quote?.regularMarketTime),
    tech: null,
    valuation: null,
  };
}

/**
 * Resilience path: if Yahoo rate-limits the search call, a valid ticker can
 * still be resolved through the existing quote feed so Pro search stays usable.
 */
async function tickerFallback(rawQuery: string): Promise<MarketSearchHit[]> {
  const symbol = normalizeSymbol(rawQuery);
  if (!symbol) return [];
  try {
    const quote = await getQuoteForSymbol(symbol);
    if (!quote || !(quote.price > 0)) return [];
    const name = quote.nameEn || quote.name || symbol;
    return [
      {
        symbol,
        name: quote.name || name,
        nameEn: name,
        exchange: "U.S.",
        quoteType: "EQUITY",
        quote,
      },
    ];
  } catch {
    return [];
  }
}

/**
 * Pro-only U.S. equity/ETF search.
 *
 * Yahoo's search endpoint provides symbols and names; a single batched quote
 * call adds live prices. Results are restricted to U.S. markets and equities /
 * ETFs before they reach the browser.
 */
export async function GET(request: Request) {
  const session = await resolveRequestUser(request);

  if (!isProTier(session?.user.tier)) {
    return jsonError(
      session
        ? "Full U.S. market search is a Pro feature."
        : "Please log in to search the U.S. market.",
      session ? 403 : 401,
      session ? "PRO_REQUIRED" : "AUTH_REQUIRED"
    );
  }

  const url = new URL(request.url);
  const rawQuery = (url.searchParams.get("q") ?? url.searchParams.get("query") ?? "").trim();
  if (rawQuery.length < 1 || rawQuery.length > 48) {
    return jsonError("Search query must be 1–48 characters.", 400, "INVALID_QUERY");
  }

  try {
    const search = await yahooFinance.search(rawQuery, {
      quotesCount: 14,
      newsCount: 0,
      enableFuzzyQuery: true,
      region: "US",
      lang: "en-US",
    });

    const candidates: SearchCandidate[] = [];
    for (const quote of search.quotes) {
      if (!quote.isYahooFinance) continue;
      const type = "quoteType" in quote ? quote.quoteType : null;
      if (type !== "EQUITY" && type !== "ETF") continue;
      const symbol = typeof quote.symbol === "string" ? quote.symbol : "";
      if (!symbol) continue;
      candidates.push({
        symbol,
        quoteType: type,
        shortname:
          typeof quote.shortname === "string" ? quote.shortname : undefined,
        longname:
          typeof quote.longname === "string" ? quote.longname : undefined,
        exchange: typeof quote.exchange === "string" ? quote.exchange : "",
        exchDisp:
          typeof quote.exchDisp === "string" ? quote.exchDisp : undefined,
      });
    }

    const filtered = candidates
      .filter((quote) => {
        const exchange = quote.exchange.toUpperCase();
        return !exchange || US_EXCHANGES.has(exchange);
      })
      .slice(0, 10);

    const yahooSymbols = [...new Set(filtered.map((quote) => quote.symbol))];
    let quotes: Quote[] = [];
    if (yahooSymbols.length > 0) {
      try {
        quotes = await yahooFinance.quote(yahooSymbols, { return: "array" });
      } catch {
        // Names still make the search useful when the quote batch fails.
        quotes = [];
      }
    }

    const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
    const seen = new Set<string>();
    const results: MarketSearchHit[] = [];

    for (const candidate of filtered) {
      const symbol = normalizeSymbol(normalizeYahooSymbol(candidate.symbol));
      if (!symbol || seen.has(symbol)) continue;

      const yahooQuote = bySymbol.get(candidate.symbol);
      const candidateQuoteType = candidate.quoteType;

      // Prefer the quote's own market metadata; fall back to the search venue.
      if (yahooQuote) {
        const isUs =
          yahooQuote.market?.toLowerCase() === "us_market" ||
          (yahooQuote.currency === "USD" &&
            US_EXCHANGES.has((yahooQuote.exchange ?? "").toUpperCase()));
        if (!isUs) continue;
      }

      const name =
        yahooQuote?.shortName ||
        yahooQuote?.longName ||
        candidate.shortname ||
        candidate.longname ||
        symbol;
      seen.add(symbol);
      results.push({
        symbol,
        name,
        nameEn: name,
        exchange:
          yahooQuote?.fullExchangeName ||
          candidate.exchDisp ||
          candidate.exchange ||
          "",
        quoteType: candidateQuoteType,
        quote: quoteFromYahoo(symbol, yahooQuote, name),
      });
    }

    if (results.length === 0) {
      const fallback = await tickerFallback(rawQuery);
      if (fallback.length > 0) {
        return Response.json(
          { ok: true, query: rawQuery, results: fallback },
          { headers: NO_STORE }
        );
      }
    }

    return Response.json(
      { ok: true, query: rawQuery, results },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[market/search]", error);
    const fallback = await tickerFallback(rawQuery);
    if (fallback.length > 0) {
      return Response.json(
        { ok: true, query: rawQuery, results: fallback },
        { headers: NO_STORE }
      );
    }
    return jsonError(
      "Market search is temporarily unavailable.",
      503,
      "SEARCH_UNAVAILABLE"
    );
  }
}
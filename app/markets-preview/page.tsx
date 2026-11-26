import { notFound } from "next/navigation";
import UsStockPanel from "@/components/UsStockPanel";
import { FEATURED_SYMBOLS, isFeaturedSymbol, SYMBOL_NAMES } from "@/lib/watchlist";
import InstrumentDetailView from "@/components/markets/InstrumentDetailView";
import type { UsQuote } from "@/lib/us-stocks";

function sampleQuote(symbol: string, index: number): UsQuote {
  const closes = Array.from({ length: 30 }, (_, day) =>
    100 + index * 13 + Math.sin(index + day * 0.6) * 3 + day * ((index % 3) - 1) / 4);
  const price = closes[29];
  const prevClose = closes[28];
  const change = price - prevClose;
  return {
    symbol, code: symbol, name: SYMBOL_NAMES[symbol]?.zh ?? symbol,
    nameEn: SYMBOL_NAMES[symbol]?.en ?? symbol, price, prevClose, change,
    changePct: change / prevClose * 100, open: prevClose,
    high: Math.max(prevClose, price), low: Math.min(prevClose, price),
    volume: 1000000, pe: null, marketCapUsd: null, week52High: null,
    week52Low: null, quoteTime: null, valuation: null,
    tech: { sparkline: closes, ma5: null, ma10: null, ma20: null,
      rsi14: null, macd: null, macdSignal: null, macdCross: null },
  };
}

const indexNames: Record<string, string> = { DJI: "Dow Jones", IXIC: "Nasdaq Composite", INX: "S&P 500", NDX: "Nasdaq 100" };

export default async function MarketsPreview({ searchParams }: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { symbol } = await searchParams;
  if (symbol !== undefined) {
    if (typeof symbol !== "string" || !(isFeaturedSymbol(symbol) || Object.hasOwn(indexNames, symbol))) notFound();
    return <InstrumentDetailView symbol={symbol.toUpperCase()} from="preview" />;
  }
  return <main className="mx-auto max-w-7xl p-3 sm:p-6">
    <UsStockPanel lang="en" plan="pro" preview snapshot={{
      demo: true, fetchedAt: 0, stocks: FEATURED_SYMBOLS.map(sampleQuote),
      indices: Object.entries(indexNames).map(([symbol, name], i) => ({ ...sampleQuote(symbol, i), name, nameEn: name })),
    }} />
  </main>;
}

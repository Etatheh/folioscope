import type { Metadata } from "next";
import InstrumentDetailView from "@/components/markets/InstrumentDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  return { title: `${symbol.toUpperCase()} · Markets` };
}

export default async function MarketDetailPage({params, searchParams}: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const [{ symbol }, { from }] = await Promise.all([params, searchParams]);
  let ticker = symbol;
  try {
    ticker = decodeURIComponent(symbol);
  } catch {
    // Preserve malformed segments for the usual instrument lookup / 404.
  }
  return <InstrumentDetailView symbol={ticker.toUpperCase()} from={from === "us" ? "us" : undefined} />;
}

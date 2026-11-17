// Shared metadata for the non-U.S. index boards.
//
// These symbols are public (anonymous and FREE viewers can fetch quotes and
// history through /api/markets/*). Keep the Yahoo-style symbols the product
// exposes (`^FTSE`, `^HSI`, `000001.SS`) while using Eastmoney secids for the
// actual live data. This file is dependency-free so it is safe to import from
// client bundles as well as the server.

export type IndexMeta = {
  symbol: string;
  name: string;
  nameEn: string;
  /** Eastmoney secid used for both the quote and daily kline endpoints. */
  em: string;
};

export const EUROPE_INDICES: IndexMeta[] = [
  { symbol: "^FTSE", name: "英国富时100", nameEn: "FTSE 100", em: "100.FTSE" },
  { symbol: "^GDAXI", name: "德国DAX", nameEn: "DAX", em: "100.GDAXI" },
  { symbol: "^FCHI", name: "法国CAC40", nameEn: "CAC 40", em: "100.FCHI" },
];

export const ASIA_INDICES: IndexMeta[] = [
  { symbol: "N225", name: "日经225", nameEn: "Nikkei 225", em: "100.N225" },
  { symbol: "KS11", name: "韩国KOSPI", nameEn: "KOSPI", em: "100.KS11" },
  { symbol: "^HSI", name: "恒生指数", nameEn: "Hang Seng Index", em: "100.HSI" },
  { symbol: "000001.SS", name: "上证指数", nameEn: "Shanghai Composite", em: "1.000001" },
];

export const ALL_INDEX_META: IndexMeta[] = [...EUROPE_INDICES, ...ASIA_INDICES];

export const INDEX_META: Record<string, IndexMeta> = Object.fromEntries(
  ALL_INDEX_META.map((item) => [item.symbol, item])
);

export const INDEX_KLINE_SECID: Record<string, string> = Object.fromEntries(
  ALL_INDEX_META.map((item) => [item.symbol, item.em])
);

export const PUBLIC_INDEX_SYMBOL_SET: ReadonlySet<string> = new Set(
  ALL_INDEX_META.map((item) => item.symbol)
);

/** True for all region indices that are free for every viewer. */
export function isPublicIndexSymbol(symbol: string): boolean {
  return PUBLIC_INDEX_SYMBOL_SET.has(symbol.toUpperCase());
}
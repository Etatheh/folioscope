import type { UsQuote } from "./us-stocks";

/** One U.S. equity/ETF returned by the Pro market search. */
export type MarketSearchHit = {
  symbol: string;
  name: string;
  nameEn: string;
  fullName?: string;
  exchange: string;
  quoteType: "EQUITY" | "ETF";
  quote: UsQuote;
};

export type MarketSearchSuccess = {
  ok: true;
  query: string;
  results: MarketSearchHit[];
};

export type MarketSearchFailure = {
  ok: false;
  error: string;
  code: string;
  locked?: boolean;
};

export type MarketSearchResponse = MarketSearchSuccess | MarketSearchFailure;

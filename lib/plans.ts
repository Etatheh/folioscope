export type PlanId = "free" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Everything you need to explore the markets",
    features: [
      "Live quotes across US, China and Japan/Korea markets",
      "Technical indicators: MA / RSI / MACD",
      "Daily candlestick detail pages",
      "Backtest simulator: 1M / 3M windows",
      "AI market assistant: 5 questions per day",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    period: "/ month",
    tagline: "For people who research markets seriously",
    highlight: true,
    features: [
      "Everything in Free",
      "Simulator: 6M / 1Y long-range backtests",
      "AI market assistant: 200 questions per day",
      "Saved watchlists & portfolios (coming soon)",
      "Early access to new features",
    ],
  },
];

export const PRO_PRICE = "$9/month";

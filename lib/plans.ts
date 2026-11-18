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
    tagline: "14 curated stocks + core backtesting",
    features: [
      "14 curated benchmark stocks",
      "Interactive historical charts & technical indicators",
      "Core portfolio and DCA backtesting",
      "U.S., Europe and Asia-Pacific index boards",
      "Cloud watchlist: 14 curated names",
      "AI market assistant: 5 questions per day",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    period: "/ month",
    tagline: "Full-market search, multi-market data & AI reports",
    highlight: true,
    features: [
      "Everything in Free",
      "Full U.S. equity search",
      "Multi-market coverage: U.S., Europe, Japan & South Korea",
      "Unlimited cloud watchlist",
      "AI financial report deep summaries",
      "AI market assistant: 200 questions per day",
      "Long-range backtests",
    ],
  },
];

export const PRO_PRICE = "$9/month";

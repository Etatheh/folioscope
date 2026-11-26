import type { Metadata } from "next";
import { PLANS_CONFIG } from "@/config/plans";
import { SITE_DISCLAIMER, SITE_NAME, SITE_URL } from "./site";

const { free, pro } = PLANS_CONFIG;
const proMonthlyPrice = pro.prices.monthly.toFixed(2);
const description =
  "Backtest a stock or ETF portfolio, simulate recurring investments, and compare the S&P 500 with the Nasdaq 100. Explore AI market summaries and company fundamentals.";

/** Shared layout defaults. Each page supplies its own title and canonical URL. */
export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description,
  keywords: [
    "visual portfolio backtesting",
    "ETF and stock DCA simulator",
    "S&P 500 vs Nasdaq 100 comparison",
    "AI market analysis",
    "AI fundamentals analysis",
  ],
};

function publicPageMetadata(path: string, title: string, summary: string): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    title: { absolute: title },
    description: summary,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url, title, description: summary },
    twitter: { card: "summary", title, description: summary },
  };
}

export const homeMetadata = publicPageMetadata(
  "/", "Visual Portfolio Backtesting & DCA Simulator | FolioScope", description,
);

export const pricingMetadata = publicPageMetadata(
  "/pricing", "Free and Pro Plans | FolioScope",
  `Compare Free and Pro portfolio backtesting limits, index DCA tools, and AI research features. FolioScope Pro costs $${proMonthlyPrice} per month.`,
);

export function buildSoftwareApplicationJsonLd() {
  const pricingUrl = `${SITE_URL}/pricing`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: SITE_NAME,
    url: SITE_URL,
    description,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: "en",
    offers: [
      { "@type": "Offer", name: free.name, price: free.prices.monthly, priceCurrency: "USD", url: pricingUrl },
      {
        "@type": "Offer",
        name: pro.name,
        price: proMonthlyPrice,
        priceCurrency: "USD",
        url: pricingUrl,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: proMonthlyPrice,
          priceCurrency: "USD",
          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON", unitText: "month" },
        },
      },
    ],
  };
}

/** Visible FAQ copy and structured data can share these exact questions and answers. */
export const englishFaqs = [
  {
    question: "How do I backtest a stock or ETF portfolio?",
    answer: "Choose your holdings, set their weights, and select a historical period. The backtest charts how your portfolio would have performed over the available price history.",
  },
  {
    question: "How does the dollar-cost averaging simulator work?",
    answer: "Choose a contribution amount and frequency. The simulator uses historical prices to show how recurring purchases accumulated and how the portfolio value compared with the amount invested.",
  },
  {
    question: "Can I compare the S&P 500 and Nasdaq 100 with monthly contributions?",
    answer: `Yes. Pro compares equal monthly investments in both indices over the same period, using up to ${pro.limits.indexDcaMonths / 12} years of available history. Free includes a preview.`,
  },
  {
    question: "What are the Free and Pro portfolio backtesting limits?",
    answer: `Free includes curated stocks and ETFs with preset periods up to ${free.limits.backtestMonths / 12} years. Pro adds U.S. stock and ETF search, custom dates, and periods up to ${pro.limits.backtestMonths / 12} years where price history is available.`,
  },
  {
    question: "What does FolioScope’s AI market analysis cover?",
    answer: "Pro includes on-demand market summaries and reports on company fundamentals, including earnings, revenue, and valuation.",
  },
  {
    question: "Can a backtest or AI report tell me what to buy?",
    answer: SITE_DISCLAIMER,
  },
] as const;

export function buildFaqPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "en",
    mainEntity: englishFaqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

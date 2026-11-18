import Link from "next/link";
import BackgroundEffects from "@/components/BackgroundEffects";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import PricingPlans from "@/components/pricing/PricingPlans";

export const metadata = {
  title: "Pricing",
  description:
    "Compare FolioScope Free and Pro plans. Prices in USD, with full-market search, multi-market data and AI financial report summaries.",
};

const faqs = [
  {
    q: "How do I pay for Pro?",
    a: "Pro subscriptions are processed by Creem, our authorized Merchant of Record. “Upgrade to Pro” opens the secure Creem hosted checkout, where you can pay by card. You are returned to FolioScope once payment completes.",
  },
  {
    q: "Where does the market data come from?",
    a: "Market quotes, historical prices, and valuation metrics are aggregated from established third-party financial data providers. Depending on the exchange and asset class, quotes may be delayed or reflect end-of-day pricing. All market data is provided strictly for informational and backtesting purposes only and does not constitute financial advice.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from Account Settings → Manage Subscription. You keep Pro access until the end of your current paid billing period. First-time purchases also include a 7-day refund window; see the Refund Policy for details.",
  },
];

export default function PricingPage() {
  return (
    <>
      <BackgroundEffects />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-28 pt-36">
        <div className="text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">
            Simple, <span className="gradient-text">honest pricing</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Start free with 14 curated stocks and core backtesting. Upgrade to
            Pro for full U.S. equity search, multi-market coverage across the
            U.S., Europe, Japan and South Korea, and AI financial report
            summaries.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Prices are in USD. Taxes may apply at checkout.
          </p>
        </div>

        <PricingPlans />

        <section className="mt-16">
          <h2 className="text-xl font-semibold text-white">FAQ</h2>
          <div className="mt-6 space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="glass rounded-xl p-5">
                <p className="text-sm font-medium text-slate-200">{f.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-14 text-center">
          <Link
            href="/register"
            className="btn-primary inline-block rounded-full px-8 py-3.5 text-sm font-semibold text-white"
          >
            Start for free
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

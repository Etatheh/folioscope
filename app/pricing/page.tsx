import Link from "next/link";
import BackgroundEffects from "@/components/BackgroundEffects";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import LegalInlineLinks from "@/components/legal/LegalInlineLinks";
import UpgradeButton from "@/components/UpgradeButton";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Pricing",
  description:
    "Compare FolioScope Free and Pro plans. Prices in USD, with full-market search, multi-market data and AI financial report summaries.",
};

const faqs = [
  {
    q: "How do I pay for Pro?",
    a: "Pro subscriptions are processed by Creem, our authorized Merchant of Record. “Upgrade to Pro” opens the hosted checkout; if billing is not configured yet, the button activates a demo Pro preview so you can explore every feature.",
  },
  {
    q: "Where does the market data come from?",
    a: "Quotes come from Tencent and Eastmoney public endpoints, index valuations from Danjuan. Data is real-time or delayed public data.",
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

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`glass rounded-2xl p-8 ${
                plan.highlight
                  ? "border-purple-400/40 ring-1 ring-purple-400/20"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                {plan.highlight && (
                  <span className="rounded-full bg-gradient-to-r from-amber-400/20 to-purple-400/20 px-2.5 py-1 text-[10px] text-amber-300">
                    Recommended
                  </span>
                )}
              </div>
              <p className="mt-4 text-3xl font-bold text-white">
                {plan.price}
                <span className="text-sm font-normal text-slate-500">
                  {" "}
                  {plan.period}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">{plan.tagline}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-400">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-emerald-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <UpgradeButton planId={plan.id} />
              <LegalInlineLinks className="mt-3" />
            </article>
          ))}
        </div>

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

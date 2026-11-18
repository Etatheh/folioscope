import Link from "next/link";
import { cookies } from "next/headers";
import BackgroundEffects from "@/components/BackgroundEffects";
import ClearErrorParam from "@/components/ClearErrorParam";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import LegalInlineLinks from "@/components/legal/LegalInlineLinks";
import { Icon, type IconName } from "@/components/ui/Icon";
import { parseLang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/lang-pref";
import { PLANS } from "@/lib/plans";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata = {
  title: { absolute: "FolioScope — Quantitative Market Research" },
  description: SITE_DESCRIPTION,
};

const features: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: "us",
    title: "US markets, front and center",
    desc: "Real-time US indices and stocks — Dow, Nasdaq, S&P 500 and Nasdaq 100 — with daily candlesticks and technical indicators.",
  },
  {
    icon: "indicators",
    title: "Indicators & valuations",
    desc: "Spot overbought levels and historical valuation extremes at a glance.",
  },
  {
    icon: "backtest",
    title: "Backtest simulator",
    desc: "Pick stocks, set weights and backtest against real historical daily data — benchmarked against the S&P 500.",
  },
  {
    icon: "ai",
    title: "AI market assistant",
    desc: "Get instant AI-powered market summaries, valuation breakdowns, and financial insights.",
  },
  {
    icon: "globe",
    title: "Multi-market macro view",
    desc: "Track European and Asia-Pacific indices alongside U.S. equities in one unified workspace.",
  },
  {
    icon: "watchlist",
    title: "Cloud Watchlist Sync",
    desc: "Save custom stock pools and backtest presets in the cloud, synced seamlessly across devices.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const { lang: rawLang } = await searchParams;
  const store = await cookies();
  const lang = parseLang(rawLang ?? store.get(LANG_COOKIE)?.value);

  return (
    <>
      <ClearErrorParam />
      <BackgroundEffects />
      <Navbar lang={lang} />
      <main>
        <section className="relative z-10 mx-auto max-w-5xl px-6 pb-14 pt-40 text-center">
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-6xl">
            Global markets,
            <br />
            <span className="gradient-text">in focus.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
            Live U.S., European and Asia-Pacific indices and stocks with
            technical indicators, a backtest simulator and an AI research
            analyst. Built for quantitative research, not investment advice.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary rounded-full px-8 py-3.5 text-sm font-semibold text-white"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/dashboard"
              className="btn-secondary rounded-full px-8 py-3.5 text-sm font-semibold text-white"
            >
              Open the demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-600">
            No credit card required.
          </p>
        </section>

        <section id="features" className="relative z-10 mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold">
            <span className="gradient-text">Features</span>
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {features.map((f) => (
              <article
                key={f.title}
                className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:border-purple-400/30"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 text-purple-300 ring-1 ring-purple-400/20">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="relative z-10 mx-auto max-w-5xl px-6 py-16 pb-28">
          <h2 className="text-center text-3xl font-bold">
            <span className="gradient-text">Pricing</span>
          </h2>
          <p className="mt-3 text-center text-slate-500">
            Start free. Upgrade whenever you need more.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
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
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
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
                <Link
                  href={plan.id === "free" ? "/register" : "/pricing"}
                  className={`mt-8 block rounded-full py-3 text-center text-sm font-medium ${
                    plan.highlight ? "btn-primary text-white" : "btn-secondary text-white"
                  }`}
                >
                  {plan.id === "free" ? "Start for free" : "See Pro details"}
                </Link>
                <LegalInlineLinks className="mt-3" />
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

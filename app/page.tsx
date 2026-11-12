import Link from "next/link";
import BackgroundEffects from "@/components/BackgroundEffects";
import Navbar from "@/components/Navbar";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "GUI Markets — US market intelligence, one dashboard",
  description:
    "Live US market data with technical indicators, backtesting and an AI market analyst. A-shares and Japan/Korea included for global context.",
};

const features = [
  {
    icon: "🇺🇸",
    title: "US markets, front and center",
    desc: "Real-time US indices and stocks — Dow, Nasdaq, S&P 500 and Nasdaq 100 — with daily candlesticks and technical indicators.",
  },
  {
    icon: "📊",
    title: "Indicators & valuations",
    desc: "MA / RSI / MACD, 52-week ranges and PE/PB percentiles. Every detail page speaks both English and Chinese.",
  },
  {
    icon: "🧪",
    title: "Backtest simulator",
    desc: "Pick stocks, set weights and backtest against real historical daily data — benchmarked against the S&P 500.",
  },
  {
    icon: "🤖",
    title: "AI market assistant",
    desc: "Ask about quotes, indicators and valuations. Connect an LLM key for free-form conversations.",
  },
  {
    icon: "🌏",
    title: "Global context, kept quiet",
    desc: "A-shares and Japan/Korea panels sit below the fold — Chinese names stay Chinese, everything else stays English.",
  },
];

export default function Home() {
  return (
    <>
      <BackgroundEffects />
      <Navbar />
      <main>
        <section className="relative z-10 mx-auto max-w-5xl px-6 pb-14 pt-40 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-purple-400">
            GUI Markets
          </p>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-6xl">
            US markets,
            <br />
            <span className="gradient-text">in depth.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            Live US indices and stocks with technical indicators, a backtest
            simulator and an AI analyst. Japan/Korea context is included, and
            the A-share board appears in the Chinese version of the site.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
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
                <p className="text-2xl">{f.icon}</p>
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
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-purple-500/10 py-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} GUI Markets · For reference only — not investment advice</p>
      </footer>
    </>
  );
}

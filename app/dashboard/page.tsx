import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import AiAssistantDrawer from "@/components/ai/AiAssistantDrawer";
import AiSummaryCard from "@/components/AiSummaryCard";
import BackgroundEffects from "@/components/BackgroundEffects";
import DcaBacktestCard from "@/components/DcaBacktestCard";
import LangToggle from "@/components/LangToggle";
import MarketBoard from "@/components/MarketBoard";
import PortfolioSimulator from "@/components/PortfolioSimulator";
import UsStockPanel from "@/components/UsStockPanel";
import UserMenu from "@/components/UserMenu";
import ProUpgradeButton from "@/components/ui/ProUpgradeButton";
import type { ChatMarketContext } from "@/lib/chat";
import { getUsMarketSnapshot } from "@/lib/us-stocks";
import {
  FREE_STOCK_SYMBOLS,
  getViewerPlan,
  hasFullDashboardAccess,
} from "@/lib/access";
import { getDcaDataset } from "@/lib/dca";
import { getCnMarketSnapshot } from "@/lib/cn-markets";
import { getAsiaMarketSnapshot, ASIA_CURRENCY } from "@/lib/asia-markets";
import { getSimulationData } from "@/lib/us-stocks";
import { getSessionUser } from "@/lib/server/auth-service";
import { COOKIE_NAME } from "@/lib/server/auth";
import { dict, parseLang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/lang-pref";

const activityColors = ["bg-blue-400", "bg-purple-400", "bg-emerald-400"];

function Icon({
  name,
}: {
  name: "grid" | "trend" | "globe" | "chart" | "book" | "settings";
}) {
  const paths = {
    grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    trend: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    globe:
      "M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18Zm0 0c2.5 2.2 4 5.4 4 9 0 3.6-1.5 6.8-4 9m0-18c-2.5 2.2-4 5.4-4 9 0 3.6 1.5 6.8 4 9M3 12h18",
    chart: "M4 19V9m6 10V5m6 14v-7m4 7H2",
    book: "M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 3V5Zm8-3h5a3 3 0 0 1 3 3v18a3 3 0 0 0-3-3h-5",
    settings:
      "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.5v-.1A1.7 1.7 0 0 0 8.4 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9.5h.3A1.7 1.7 0 0 0 4 8.4a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.46 3.6l.06.06A1.7 1.7 0 0 0 8.4 4a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 9.8 2H14a1.7 1.7 0 0 0 1.6 2 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 20 8.4a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.3V14h-.3a1.7 1.7 0 0 0-2.3 1Z",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
    >
      <path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MarketsSkeleton() {
  return (
    <article className="glass rounded-2xl p-5 sm:p-6" aria-hidden>
      <div className="flex items-center justify-between">
        <div>
          <div className="h-5 w-44 animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-3 w-72 animate-pulse rounded bg-white/5" />
        </div>
        <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    </article>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const { lang: rawLang } = await searchParams;
  const store = await cookies();
  // Honour an explicit ?lang= first, then a remembered cookie choice, else English.
  const lang = parseLang(rawLang ?? store.get(LANG_COOKIE)?.value);
  const t = dict[lang];

  const token = store.get(COOKIE_NAME)?.value;
  let viewer = null;
  try {
    viewer = token ? await getSessionUser(token) : null;
  } catch {
    viewer = null;
  }
  const plan = getViewerPlan(viewer);
  const fullAccess = hasFullDashboardAccess(plan);

  const showCn = lang === "zh";
  const [usData, simData, asiaData, dcaData, cnData] = await Promise.all([
    getUsMarketSnapshot(),
    getSimulationData(),
    getAsiaMarketSnapshot(),
    getDcaDataset(),
    showCn ? getCnMarketSnapshot() : Promise.resolve(null),
  ]);

  // Free / anonymous viewers only get the free stock slice in the simulator too.
  const allowedSymbols = new Set<string>(
    fullAccess ? Object.keys(simData.series) : FREE_STOCK_SYMBOLS.us
  );
  const sim = {
    ...simData,
    series: Object.fromEntries(
      Object.entries(simData.series).filter(([symbol]) => allowedSymbols.has(symbol))
    ),
  };
  const simDefaults = fullAccess
    ? ["AAPL", "MSFT", "NVDA", "AMZN", "JPM"]
    : ["AAPL", "MSFT", "NVDA", "GOOGL"];

  // Live context for indepth AI. DcaBacktestCard keeps the DCA figures in sync
  // after hydration; these values match its default plan for first paint.
  const dcaTarget = dcaData.sp500.points.length > 0 ? "sp500" : "nasdaq";
  const dcaMonths = Math.max(
    1,
    Math.min(60, dcaData[dcaTarget].points.length || 60)
  );
  const chatContext: ChatMarketContext = {
    page: "dashboard",
    asOf: usData.fetchedAt,
    lang,
    indices: usData.indices.map((quote) => ({
      symbol: quote.symbol,
      name: lang === "zh" ? quote.name : quote.nameEn || quote.name,
      price: quote.price,
      changePct: quote.changePct,
      pe: quote.valuation?.pe ?? quote.pe ?? null,
      pePercentile: quote.valuation?.pePercentile ?? null,
    })),
    dca: {
      target: dcaTarget,
      targetName:
        dcaTarget === "sp500"
          ? lang === "zh"
            ? "标普500"
            : "S&P 500"
          : lang === "zh"
            ? "纳斯达克100"
            : "Nasdaq 100",
      period: t.dca.periods.y5,
      months: dcaMonths,
      monthly: 500,
      benchmark:
        dcaTarget === "sp500"
          ? lang === "zh"
            ? "纳斯达克100"
            : "Nasdaq 100"
          : lang === "zh"
            ? "标普500"
            : "S&P 500",
    },
  };

  const navItems = (
    [
      { id: "markets", icon: "trend" },
      { id: "investments", icon: "chart" },
      { id: "cn", icon: "globe" },
      { id: "asia", icon: "globe" },
      { id: "learning", icon: "book" },
    ] as const
  ).filter((item) => showCn || item.id !== "cn");

  return (
    <div className="relative min-h-screen">
      <BackgroundEffects />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-purple-500/10 bg-[#050917]/85 px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
        <nav className="mt-2 space-y-2">
          {navItems.map(({ id, icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                id === "markets"
                  ? "bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-white ring-1 ring-purple-400/20"
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon name={icon} />
              {t.nav[id]}
            </a>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/5 pt-5">
          <a
            href="#settings"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-white/5 hover:text-slate-200"
          >
            <Icon name="settings" />
            {t.settings}
          </a>
          <Link
            href="/"
            className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:text-white"
          >
            ← {t.backToSite}
          </Link>
        </div>
      </aside>

      <main className="relative z-10 px-5 pb-12 pt-6 sm:px-8 lg:ml-64 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4 border-b border-white/5 pb-6">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-xs font-medium uppercase tracking-[0.2em] text-purple-400">
              {t.eyebrow}
            </p>
            <h1 className="mt-2 whitespace-nowrap text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {t.greeting}
            </h1>
          </div>
          <div className="flex w-full flex-nowrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-2.5">
            <LangToggle lang={lang} path="/dashboard" />
            {!fullAccess && (
              <ProUpgradeButton
                lang={lang}
                variant="secondary"
                label={t.pro.upgrade}
                source="dashboard-header"
                className="whitespace-nowrap bg-gradient-to-r from-blue-500/20 to-purple-500/20"
              />
            )}
            <button
              type="button"
              aria-label={lang === "zh" ? "通知" : "Notifications"}
              className="glass flex h-9 w-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full text-slate-400 transition hover:border-purple-400/40 hover:text-white"
            >
              ♡
            </button>
            <UserMenu lang={lang} />
          </div>
        </header>

        <section id="markets" className="mt-8">
          <Suspense fallback={<MarketsSkeleton />}>
            <UsStockPanel lang={lang} plan={plan} snapshot={usData} />
          </Suspense>
        </section>

        <section id="insights" className="mt-5 grid gap-5 xl:grid-cols-2">
          <AiSummaryCard lang={lang} plan={plan} />
          <DcaBacktestCard lang={lang} plan={plan} dataset={dcaData} />
        </section>

        <section id="investments" className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <PortfolioSimulator lang={lang} plan={plan} data={sim} defaults={simDefaults} />

          <article className="data-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">{t.activity.title}</h2>
              <button className="text-xs text-purple-400 hover:text-purple-300">
                {t.activity.viewAll}
              </button>
            </div>
            <div className="mt-6 space-y-6">
              {t.activity.items.map((item, i) => (
                <div key={item.title} className="flex gap-4">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${activityColors[i]} shadow-[0_0_12px_currentColor]`}
                  />
                  <div>
                    <p className="text-sm text-slate-200">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-xl border border-blue-400/10 bg-blue-500/5 p-4">
              <p className="text-xs uppercase tracking-wider text-blue-400">
                {t.activity.weeklyFocus}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {t.activity.weeklyFocusText}
              </p>
            </div>
          </article>
        </section>

        {showCn && cnData && (
          <section id="cn" className="mt-5">
            <Suspense fallback={<MarketsSkeleton />}>
              <MarketBoard
                lang={lang}
                plan={plan}
                market="cn"
                title={t.boards.cn.title}
                titleEn={t.boards.cn.titleEn}
                snapshot={cnData}
                stockCurrency="¥"
              />
            </Suspense>
          </section>
        )}

        <section id="asia" className="mt-5">
          <Suspense fallback={<MarketsSkeleton />}>
            <MarketBoard
              lang={lang}
              plan={plan}
              market="asia"
              title={t.boards.asia.title}
              titleEn={t.boards.asia.titleEn}
              snapshot={asiaData}
              stockCurrencies={ASIA_CURRENCY}
              stockDetail={false}
            />
          </Suspense>
        </section>
      </main>
      <AiAssistantDrawer lang={lang} marketContext={chatContext} />
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import AgentChat from "@/components/AgentChat";
import AiSummaryCard from "@/components/AiSummaryCard";
import BackgroundEffects from "@/components/BackgroundEffects";
import DcaBacktestCard from "@/components/DcaBacktestCard";
import LangToggle from "@/components/LangToggle";
import MarketBoard from "@/components/MarketBoard";
import PortfolioSimulator from "@/components/PortfolioSimulator";
import UsStockPanel from "@/components/UsStockPanel";
import UserMenu from "@/components/UserMenu";
import ProUpgradeButton from "@/components/ui/ProUpgradeButton";
import { FREE_STOCK_SYMBOLS, type ViewerPlan } from "@/lib/access";
import { getDcaSeries } from "@/lib/dca";
import { getCnMarketSnapshot } from "@/lib/cn-markets";
import { getAsiaMarketSnapshot, ASIA_CURRENCY } from "@/lib/asia-markets";
import { getSimulationData } from "@/lib/us-stocks";
import { getSessionUser } from "@/lib/server/auth-service";
import { COOKIE_NAME } from "@/lib/server/auth";
import { dict, parseLang } from "@/lib/i18n";

const stats = [
  { key: "ai" as const, value: "08", zh: "+本月新增 2", en: "+2 this month" },
  { key: "learning" as const, value: "164h", zh: "+本周 18h", en: "+18h this week" },
];

const projects = [
  {
    name: "Market Signal AI",
    typeEn: "Machine Learning",
    typeZh: "机器学习",
    progress: 82,
    status: "planning" as const,
  },
  {
    name: "Research Copilot",
    typeEn: "Generative AI",
    typeZh: "生成式 AI",
    progress: 64,
    status: "building" as const,
  },
  {
    name: "Personal Website",
    typeEn: "Web Development",
    typeZh: "Web 开发",
    progress: 100,
    status: "live" as const,
  },
];

const activityColors = ["bg-blue-400", "bg-purple-400", "bg-emerald-400"];

function Icon({
  name,
}: {
  name: "grid" | "trend" | "globe" | "chart" | "folder" | "book" | "settings";
}) {
  const paths = {
    grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    trend: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    globe:
      "M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18Zm0 0c2.5 2.2 4 5.4 4 9 0 3.6-1.5 6.8-4 9m0-18c-2.5 2.2-4 5.4-4 9 0 3.6 1.5 6.8 4 9M3 12h18",
    chart: "M4 19V9m6 10V5m6 14v-7m4 7H2",
    folder: "M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
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
  const lang = parseLang(rawLang);
  const t = dict[lang];

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  let viewer = null;
  try {
    viewer = token ? await getSessionUser(token) : null;
  } catch {
    viewer = null;
  }
  const plan: ViewerPlan = viewer?.plan === "pro" ? "pro" : viewer ? "free" : "anon";

  const [simData, cnData, asiaData, dcaSeries] = await Promise.all([
    getSimulationData(),
    getCnMarketSnapshot(),
    getAsiaMarketSnapshot(),
    getDcaSeries(),
  ]);

  // Free / anonymous viewers only get the free stock slice in the simulator too.
  const allowedSymbols = new Set<string>(
    plan === "pro" ? Object.keys(simData.series) : FREE_STOCK_SYMBOLS.us
  );
  const sim = {
    ...simData,
    series: Object.fromEntries(
      Object.entries(simData.series).filter(([symbol]) => allowedSymbols.has(symbol))
    ),
  };
  const simDefaults =
    plan === "pro"
      ? ["AAPL", "MSFT", "NVDA", "AMZN", "JPM"]
      : ["AAPL", "MSFT", "NVDA", "GOOGL"];

  const navItems = [
    { id: "overview", icon: "grid" },
    { id: "markets", icon: "trend" },
    { id: "investments", icon: "chart" },
    { id: "cn", icon: "globe" },
    { id: "asia", icon: "globe" },
    { id: "projects", icon: "folder" },
    { id: "learning", icon: "book" },
  ] as const;

  return (
    <div className="relative min-h-screen">
      <BackgroundEffects />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-purple-500/10 bg-[#050917]/85 px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
        <Link href="/" className="px-3 text-2xl font-bold gradient-text">
          GUI
        </Link>
        <nav className="mt-12 space-y-2">
          {navItems.map(({ id, icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                id === "overview"
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
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-purple-400">
              {t.eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {t.greeting}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle lang={lang} path="/dashboard" />
            {plan !== "pro" && (
              <ProUpgradeButton
                lang={lang}
                variant="secondary"
                label={t.pro.upgrade}
                source="dashboard-header"
                className="bg-gradient-to-r from-blue-500/20 to-purple-500/20"
              />
            )}
            <button
              aria-label="Notifications"
              className="glass flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:text-white"
            >
              ♡
            </button>
            <UserMenu lang={lang} />
          </div>
        </header>

        <section id="overview" className="mt-8 grid gap-4 sm:grid-cols-2">
          {stats.map((stat) => (
            <article
              key={stat.key}
              className="data-card rounded-2xl p-5"
            >
              <p className="text-sm text-slate-500">{t.stats[stat.key]}</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <strong className="text-2xl font-semibold text-white sm:text-3xl">
                  {stat.value}
                </strong>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-400">
                  {lang === "zh" ? stat.zh : stat.en}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section id="markets" className="mt-5">
          <Suspense fallback={<MarketsSkeleton />}>
            <UsStockPanel lang={lang} plan={plan} />
          </Suspense>
        </section>

        <section id="insights" className="mt-5 grid gap-5 xl:grid-cols-2">
          <AiSummaryCard lang={lang} plan={plan} />
          <DcaBacktestCard lang={lang} plan={plan} series={dcaSeries} />
        </section>

        <section id="investments" className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <PortfolioSimulator lang={lang} data={sim} defaults={simDefaults} />

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

        <section id="cn" className="mt-5">
          <Suspense fallback={<MarketsSkeleton />}>
            <MarketBoard
              lang={lang}
              plan={plan}
              title={t.boards.cn.title}
              titleEn={t.boards.cn.titleEn}
              snapshot={cnData}
              stockCurrency="¥"
            />
          </Suspense>
        </section>

        <section id="asia" className="mt-5">
          <Suspense fallback={<MarketsSkeleton />}>
            <MarketBoard
              lang={lang}
              plan={plan}
              title={t.boards.asia.title}
              titleEn={t.boards.asia.titleEn}
              snapshot={asiaData}
              stockCurrencies={ASIA_CURRENCY}
              stockDetail={false}
            />
          </Suspense>
        </section>

        <section id="projects" className="data-card mt-5 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">{t.projects.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{t.projects.subtitle}</p>
            </div>
            <button className="btn-primary rounded-lg px-4 py-2 text-xs font-medium">
              {t.projects.newProject}
            </button>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.name}
                className="rounded-xl border border-white/5 bg-white/[0.025] p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-200">{project.name}</h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {lang === "zh" ? project.typeZh : project.typeEn}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] ${
                      project.progress === 100
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-purple-400/10 text-purple-400"
                    }`}
                  >
                    {t.projects.statuses[project.status]}
                  </span>
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-[11px] text-slate-600">
                    <span>{lang === "zh" ? "进度" : "Progress"}</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <AgentChat lang={lang} />
    </div>
  );
}

import { localizedName } from "@/lib/localized-text";
import { PLANS_CONFIG } from "@/config/plans";
import { cookies } from "next/headers";
import { Suspense } from "react";

import AiAnalysisPanel from "@/components/ai/AiAnalysisPanel";
import AiAssistantDrawer from "@/components/ai/AiAssistantDrawer";
import DashboardShell from "@/components/dashboard/DashboardShell";
import GlobalMarketsOverview from "@/components/markets/GlobalMarketsOverview";
import MarketBoard from "@/components/MarketBoard";
import SimulatorWorkbench from "@/components/simulator/SimulatorWorkbench";
import UsStockPanel from "@/components/UsStockPanel";
import WatchlistHub from "@/components/watchlist/WatchlistHub";
import type { ChatMarketContext } from "@/lib/chat";
import {
  getSimulationData,
  getUsMarketSnapshot,
  getWatchlistQuotes,
  type UsMarketSnapshot,
} from "@/lib/us-stocks";
import { FEATURED_SYMBOLS } from "@/lib/watchlist";
import {
  getViewerPlan,
  hasFullDashboardAccess,
} from "@/lib/access";
import { getDcaDataset } from "@/lib/dca";
import { getCnMarketSnapshot } from "@/lib/cn-markets";
import { getAsiaMarketSnapshot, ASIA_CURRENCY } from "@/lib/asia-markets";
import { getEuropeMarketSnapshot } from "@/lib/europe-markets";
import { parseDashboardView, type DashboardView } from "@/lib/dashboard-views";
import type { ViewerPlan } from "@/lib/access";
import type { Lang } from "@/lib/i18n";
import { getServerViewer } from "@/lib/server/viewer";
import { dict, parseLang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/lang-pref";
import { Reveal } from "@/components/ui/Reveal";

export const metadata = {
  title: "Dashboard",
  description:
    "FolioScope market dashboard with global indices, watchlists, backtesting and AI research.",
};

function emptySnapshot(): UsMarketSnapshot {
  return { demo: true, fetchedAt: Date.now(), indices: [], stocks: [] };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string | string[];
    tab?: string | string[];
    view?: string | string[];
  }>;
}) {
  const { tab: rawTab, view: rawView } = await searchParams;
  const store = await cookies();
  // Only an explicitly saved preference enables Chinese; otherwise use English.
  const lang = parseLang(store.get(LANG_COOKIE)?.value);
  const view = parseDashboardView(rawView);
  const watchlistTab =
    (Array.isArray(rawTab) ? rawTab[0] : rawTab) === "mine" ? "mine" : "featured";

  const viewer = await getServerViewer();
  const plan = getViewerPlan(viewer);

  return (
    <DashboardShell lang={lang} plan={plan} view={view}>
      {view === "simulator" && (
        <Suspense key={`simulator-${lang}`} fallback={<PanelLoading lang={lang} />}>
          <SimulatorPanel lang={lang} plan={plan} />
        </Suspense>
      )}
      <Suspense key={`${lang}-${view}-${watchlistTab}`} fallback={view === "simulator" ? null : <PanelLoading lang={lang} />}>
        <DashboardContent lang={lang} plan={plan} view={view} watchlistTab={watchlistTab} />
      </Suspense>
    </DashboardShell>
  );
}

function PanelLoading({ lang }: { lang: Lang }) {
  return <div role="status" className="glass rounded-2xl p-6 text-sm text-slate-400">{lang === "zh" ? "正在加载面板数据…" : "Loading panel data…"}</div>;
}

async function DashboardContent({ lang, plan, view, watchlistTab }: {
  lang: Lang; plan: ViewerPlan; view: DashboardView; watchlistTab: "mine" | "featured";
}) {
  const t = dict[lang];
  const showCn = lang === "zh";
  const [usData, dcaData, watchlistQuotes, europeData, asiaData, cnData] =
    await Promise.all([
      getUsMarketSnapshot(),
      getDcaDataset(),
      view === "us" || view === "watchlist"
        ? getWatchlistQuotes(FEATURED_SYMBOLS)
        : Promise.resolve([]),
      view === "all" || view === "europe"
        ? getEuropeMarketSnapshot()
        : Promise.resolve(null),
      view === "all" || view === "asia"
        ? getAsiaMarketSnapshot()
        : Promise.resolve(null),
      showCn && view === "all" ? getCnMarketSnapshot() : Promise.resolve(null),
    ]);

  const europe = europeData ?? emptySnapshot();
  const asia = asiaData ?? emptySnapshot();

  // The U.S. view carries all 14 curated names. Free viewers still see the
  // same per-market unlock rule as before; the simulator below is where the
  // complete 14-name pool is free.
  const usPanelSnapshot: UsMarketSnapshot = {
    ...usData,
    stocks: watchlistQuotes.length > 0 ? watchlistQuotes : usData.stocks,
  };

  // Live context for FolioScope AI. The simulator publishes its own live DCA
  // plan; these values match the fallback plan for first paint.
  const dcaTarget = dcaData.sp500.points.length > 0 ? "sp500" : "nasdaq";
  const dcaMonths = Math.max(
    1,
    Math.min(60, dcaData[dcaTarget].points.length || 60)
  );
  const contextQuotes = [
    ...usData.indices,
    ...europe.indices,
    ...asia.indices,
    ...(cnData?.indices ?? []),
  ].slice(0, 12);
  const chatContext: ChatMarketContext = {
    page: "dashboard",
    asOf: usData.fetchedAt,
    lang,
    indices: contextQuotes.map((quote) => ({
      symbol: quote.symbol,
      name: lang === "zh" ? quote.name : localizedName(quote, "en"),
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

  return (
    <>
      <Reveal key={`${lang}-${view}-${watchlistTab}`} scroll={false} delay={0.57}>
        {view === "all" && (
          <GlobalMarketsOverview
            lang={lang}
            us={usData}
            europe={europe}
            asia={asia}
            cn={showCn ? cnData : null}
          />
        )}

        {view === "us" && (
          <UsStockPanel lang={lang} plan={plan} snapshot={usPanelSnapshot} />
        )}

        {view === "europe" && (
          <MarketBoard
            lang={lang}
            plan={plan}
            market="europe"
            title={t.boards.europe.title}
            titleEn={t.boards.europe.titleEn}
            snapshot={europe}
            stockDetail={false}
            indexGridClass="sm:grid-cols-2 xl:grid-cols-3"
          />
        )}

        {view === "asia" && (
          <MarketBoard
            lang={lang}
            plan={plan}
            market="asia"
            title={t.boards.asia.title}
            titleEn={t.boards.asia.titleEn}
            snapshot={asia}
            stockCurrencies={ASIA_CURRENCY}
            stockDetail={false}
            indexGridClass="sm:grid-cols-2 xl:grid-cols-4"
          />
        )}

        {view === "watchlist" && (
          <section id="watchlist" className="min-w-0 scroll-mt-6">
            <WatchlistHub
              lang={lang}
              quotes={watchlistQuotes}
              plan={plan}
              initialTab={watchlistTab}
            />
          </section>
        )}

        {view === "ai" && <AiAnalysisPanel lang={lang} plan={plan} />}
      </Reveal>

      <AiAssistantDrawer lang={lang} marketContext={chatContext} compactTrigger={view === "simulator"} />
    </>
  );
}

async function SimulatorPanel({ lang, plan }: { lang: Lang; plan: ViewerPlan }) {
  const fullAccess = hasFullDashboardAccess(plan);
  const simData = await getSimulationData(PLANS_CONFIG[fullAccess ? "pro" : "free"].limits.historyBars);
  const allowedSymbols = new Set<string>(fullAccess ? Object.keys(simData.series) : FEATURED_SYMBOLS);
  const sim = {
    ...simData,
    series: Object.fromEntries(Object.entries(simData.series).filter(([symbol]) => allowedSymbols.has(symbol))),
  };
  const defaults = fullAccess ? ["AAPL", "MSFT", "NVDA", "AMZN", "JPM"] : ["AAPL", "MSFT", "NVDA", "GOOGL"];
  return (
    <Reveal key={`simulator-${lang}`} scroll={false} delay={0.57}>
      {Object.keys(sim.series).length === 0 && (
        <div role="status" className="glass mb-4 rounded-2xl p-5 text-sm text-amber-200">
          {lang === "zh" ? "历史行情暂时不可用，请稍后重试。" : "Historical market data is temporarily unavailable. Please try again."}{" "}
          <a className="underline" href={`/dashboard?lang=${lang}&view=simulator`}>
            {lang === "zh" ? "重新加载" : "Reload"}
          </a>
        </div>
      )}
      <SimulatorWorkbench lang={lang} plan={plan} data={sim} defaults={defaults} />
    </Reveal>
  );
}

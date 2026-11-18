import { cookies } from "next/headers";

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
import { parseDashboardView } from "@/lib/dashboard-views";
import { getServerViewer } from "@/lib/server/viewer";
import { dict, parseLang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/lang-pref";

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
  const { lang: rawLang, tab: rawTab, view: rawView } = await searchParams;
  const store = await cookies();
  // Honour an explicit ?lang= first, then a remembered cookie choice, else English.
  const lang = parseLang(rawLang ?? store.get(LANG_COOKIE)?.value);
  const t = dict[lang];
  const view = parseDashboardView(rawView);
  const watchlistTab =
    (Array.isArray(rawTab) ? rawTab[0] : rawTab) === "mine" ? "mine" : "featured";

  const viewer = await getServerViewer();
  const plan = getViewerPlan(viewer);
  const fullAccess = hasFullDashboardAccess(plan);

  const showCn = lang === "zh";
  const [usData, dcaData, watchlistQuotes, europeData, asiaData, cnData, simData] =
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
      view === "simulator" ? getSimulationData(3200) : Promise.resolve(null),
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

  // Free / anonymous viewers get the complete 14-name curated pool in the
  // simulator; Pro keeps the full dataset plus on-demand search additions.
  let sim: Awaited<ReturnType<typeof getSimulationData>> | null = null;
  if (simData) {
    const allowedSymbols = new Set<string>(
      fullAccess ? Object.keys(simData.series) : FEATURED_SYMBOLS
    );
    sim = {
      ...simData,
      series: Object.fromEntries(
        Object.entries(simData.series).filter(([symbol]) =>
          allowedSymbols.has(symbol)
        )
      ),
    };
  }
  const simDefaults = fullAccess
    ? ["AAPL", "MSFT", "NVDA", "AMZN", "JPM"]
    : ["AAPL", "MSFT", "NVDA", "GOOGL"];

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

  return (
    <>
      <DashboardShell lang={lang} plan={plan} view={view}>
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

        {view === "simulator" && sim && (
          <SimulatorWorkbench
            lang={lang}
            plan={plan}
            data={sim}
            defaults={simDefaults}
          />
        )}

        {view === "ai" && <AiAnalysisPanel lang={lang} plan={plan} />}
      </DashboardShell>

      <AiAssistantDrawer lang={lang} marketContext={chatContext} />
    </>
  );
}
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import AgentChat from "@/components/AgentChat";
import BackgroundEffects from "@/components/BackgroundEffects";
import LangToggle from "@/components/LangToggle";
import PriceChart from "@/components/PriceChart";
import {
  ChangeChip,
  MaValue,
  MacdValue,
  RsiValue,
  ValuationChip,
  fmtCap,
  fmtHands,
  fmtPrice,
  fmtVolume,
} from "@/components/market-ui";
import { buildChartSeries } from "@/lib/us-stocks";
import { getInstrumentDetail } from "@/lib/instruments";
import { getViewerPlan, isSymbolUnlocked } from "@/lib/access";
import { getSessionUser } from "@/lib/server/auth-service";
import { COOKIE_NAME } from "@/lib/server/auth";
import { dict, parseLang } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  return { title: `${symbol.toUpperCase()} · Markets` };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="text-[11px] text-slate-600">{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums text-slate-200">{value}</p>
    </div>
  );
}

export default async function MarketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const { symbol } = await params;
  const { lang: rawLang } = await searchParams;
  const lang = parseLang(rawLang);
  const tx = dict[lang].detail;
  const tm = dict[lang].markets;

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  let viewer = null;
  try {
    viewer = token ? await getSessionUser(token) : null;
  } catch {
    viewer = null;
  }
  const plan = getViewerPlan(viewer);

  const detail = await getInstrumentDetail(symbol.toUpperCase());
  if (!detail) notFound();

  const { quote, bars, demo, currency, market } = detail;
  const basePath = `/dashboard/markets/${quote.symbol}`;
  const px = (n: number) => `${currency}${fmtPrice(n)}`;

  // A-shares are only presented in the Chinese version of the site.
  if (lang === "en" && market === "cn") {
    return (
      <div className="relative min-h-screen">
        <BackgroundEffects />
        <header className="relative z-10 mx-auto max-w-5xl px-5 pt-6">
          <nav className="glass flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5">
            <Link
              href={`/dashboard?lang=${lang}`}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              {tx.backToDashboard}
            </Link>
            <Link href="/" className="text-xl font-bold gradient-text">
              GUI
            </Link>
            <LangToggle lang={lang} path={basePath} />
          </nav>
        </header>
        <main className="relative z-10 mx-auto max-w-3xl px-5 py-16">
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-3xl">🇨🇳</p>
            <h1 className="mt-4 text-xl font-semibold text-white">{tx.cnNoticeTitle}</h1>
            <p className="mt-2 text-sm text-slate-400">{tx.cnNoticeBody}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={`${basePath}?lang=zh`}
                className="btn-primary rounded-full px-6 py-2.5 text-sm font-medium text-white"
              >
                {tx.switchToChinese}
              </Link>
              <Link
                href={`/dashboard?lang=${lang}`}
                className="btn-secondary rounded-full px-6 py-2.5 text-sm text-white"
              >
                {tx.backToDashboard}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isSymbolUnlocked(market, quote.symbol, plan)) {
    return (
      <div className="relative min-h-screen">
        <BackgroundEffects />
        <header className="relative z-10 mx-auto max-w-5xl px-5 pt-6">
          <nav className="glass flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5">
            <Link
              href={`/dashboard?lang=${lang}`}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              {tx.backToDashboard}
            </Link>
            <Link href="/" className="text-xl font-bold gradient-text">
              GUI
            </Link>
            <LangToggle lang={lang} path={basePath} />
          </nav>
        </header>
        <main className="relative z-10 mx-auto max-w-3xl px-5 py-16">
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-3xl">🔒</p>
            <h1 className="mt-4 text-xl font-semibold text-white">{tx.lockedTitle}</h1>
            <p className="mt-2 text-sm text-slate-400">{tx.lockedBody}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={plan === "free" ? "/pricing" : "/register"}
                className="btn-primary rounded-full px-6 py-2.5 text-sm font-medium text-white"
              >
                {plan === "free" ? tm.upgradeCta : tm.registerCta}
              </Link>
              <Link
                href={`/dashboard?lang=${lang}`}
                className="btn-secondary rounded-full px-6 py-2.5 text-sm text-white"
              >
                {tx.backToDashboard}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const series = bars.length >= 2 ? buildChartSeries(bars, 60) : null;
  const valuation = quote.valuation;

  return (
    <div className="relative min-h-screen">
      <BackgroundEffects />

        <header className="relative z-10 mx-auto max-w-5xl px-5 pt-6">
        <nav className="glass flex items-center justify-between gap-3 rounded-2xl px-5 py-3.5">
          <Link
            href={`/dashboard?lang=${lang}`}
            className="text-sm text-slate-400 transition hover:text-white"
          >
            {tx.backToDashboard}
          </Link>
          <Link href="/" className="text-xl font-bold gradient-text">
            GUI
          </Link>
          <div className="flex items-center gap-2.5">
            <LangToggle lang={lang} path={basePath} />
            <span
              className={`rounded-full px-2.5 py-1 text-xs ${
                demo
                  ? "bg-amber-400/10 text-amber-400"
                  : "bg-emerald-400/10 text-emerald-400"
              }`}
            >
              {demo ? tm.demo : tm.live}
            </span>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-5">
        <article className="data-card rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {lang === "zh" ? quote.name : quote.nameEn || quote.name}
                {lang === "zh" && (
                  <span className="ml-2 text-base font-normal text-slate-500">
                    {quote.nameEn}
                  </span>
                )}
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                {quote.symbol} · {quote.code}
                {quote.quoteTime ? ` · ${tx.exchangeTime} ${quote.quoteTime}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold tabular-nums text-white">
                {px(quote.price)}
              </p>
              <div className="mt-2">
                <ChangeChip quote={quote} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label={tx.open} value={px(quote.open)} />
            <Stat label={tx.prevClose} value={px(quote.prevClose)} />
            <Stat label={tx.high} value={px(quote.high)} />
            <Stat label={tx.low} value={px(quote.low)} />
            <Stat
              label={tx.volume}
              value={market === "cn" ? fmtHands(quote.volume) : fmtVolume(quote.volume)}
            />
            <Stat
              label={tx.marketCap}
              value={quote.marketCapUsd ? fmtCap(quote.marketCapUsd, currency || "$") : "—"}
            />
            <Stat
              label={tx.pe}
              value={quote.pe !== null ? quote.pe.toFixed(2) : "—"}
            />
            <Stat
              label={tx.week52}
              value={
                quote.week52Low !== null && quote.week52High !== null
                  ? `${px(quote.week52Low)} – ${px(quote.week52High)}`
                  : "—"
              }
            />
          </div>

          {valuation && (
            <div
              className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs tabular-nums"
              title={`${tm.valuationBy}${valuation.asOf ? ` (${valuation.asOf})` : ""}`}
            >
              <span className="text-slate-600">
                {tm.peShort} <span className="text-slate-300">{valuation.pe.toFixed(2)}</span>
              </span>
              {valuation.pb !== null && (
                <span className="text-slate-600">
                  {tm.pbShort}{" "}
                  <span className="text-slate-300">{valuation.pb.toFixed(2)}</span>
                </span>
              )}
              {valuation.pePercentile !== null && (
                <span className="text-slate-600">
                  {tm.percentile}{" "}
                  <span className="text-slate-300">
                    {(valuation.pePercentile * 100).toFixed(0)}%
                  </span>
                </span>
              )}
              <ValuationChip percentile={valuation.pePercentile} lang={lang} />
            </div>
          )}

          {quote.tech ? (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/5 pt-4 text-xs tabular-nums">
              <MaValue label="MA5" value={quote.tech.ma5} price={quote.price} lang={lang} />
              <MaValue label="MA10" value={quote.tech.ma10} price={quote.price} lang={lang} />
              <MaValue label="MA20" value={quote.tech.ma20} price={quote.price} lang={lang} />
              <RsiValue value={quote.tech.rsi14} lang={lang} />
              <MacdValue tech={quote.tech} lang={lang} />
            </div>
          ) : (
            <p className="mt-4 border-t border-white/5 pt-4 text-xs text-slate-500">
              {tx.techUnavailable}
            </p>
          )}
        </article>

        <article className="data-card mt-5 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">{tx.dailyKline}</h2>
              <p className="mt-1 text-xs text-slate-500">{tx.klineSubtitle}</p>
            </div>
            <span className="rounded-lg border border-purple-400/20 bg-purple-500/5 px-3 py-1.5 text-xs text-slate-400">
              {tx.daily}
            </span>
          </div>
          <div className="mt-4">
            {series ? (
              <PriceChart series={series} lang={lang} />
            ) : (
              <p className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-slate-500">
                {tx.noKline}
              </p>
            )}
          </div>
        </article>
      </main>
      <AgentChat lang={lang} />
    </div>
  );
}

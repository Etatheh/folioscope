import BrandLogo from "@/components/BrandLogo";
import { localizedName } from "@/lib/localized-text";
import { getRequestLang } from "@/lib/server/lang";
import { dashboardViewHref } from "@/lib/dashboard-views";
import Link from "next/link";
import { notFound } from "next/navigation";
import AiAssistantDrawer from "@/components/ai/AiAssistantDrawer";
import LangToggle from "@/components/LangToggle";
import PriceChart from "@/components/PriceChart";
import StockReportButton from "@/components/stock/StockReportButton";
import {
  ChangeChip,
  MacdValue,
  RsiValue,
  fmtCap,
  fmtHands,
  fmtPrice,
  fmtVolume,
} from "@/components/market-ui";
import type { ChatMarketContext } from "@/lib/chat";
import { getInstrumentDetail } from "@/lib/instruments";
import { getViewerPlan, isSymbolUnlocked } from "@/lib/access";
import { isFeaturedSymbol } from "@/lib/watchlist";
import { getServerViewer } from "@/lib/server/viewer";
import { dict } from "@/lib/i18n";

function Stat({ label, value, position }: { label: string; value: string; position?: number }) {
  return (
    <div className="min-w-0 bg-[#0B1120] p-3">
      <p className="text-[11px] text-[#8B9BB4]">{label}</p>
      <p className="mt-1 whitespace-nowrap text-xs font-medium tabular-nums tracking-[-0.02em] text-[#F1F5F9] sm:text-sm">{value}</p>
      {position !== undefined && (
        <div className="relative mt-2 h-1 rounded-full bg-[#192b42]" aria-hidden="true">
          <span className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf866]" style={{ left: `${position}%` }} />
        </div>
      )}
    </div>
  );
}

export default async function InstrumentDetailView({symbol, from}: {
  symbol: string;
  from?: "us" | "preview";
}) {
  const lang = await getRequestLang();
  const boardHref = from === "preview" ? "/markets-preview" : dashboardViewHref(lang, from ?? "all");
  const tx = dict[lang].detail;
  const tm = dict[lang].markets;

  const viewer = await getServerViewer();
  const plan = getViewerPlan(viewer);

  const detail = await getInstrumentDetail(symbol.toUpperCase());
  if (!detail) {
    if (!isFeaturedSymbol(symbol)) notFound();
    return <main className="mx-auto max-w-5xl p-6">
      <Link href={boardHref} className="text-sm text-sky-200">{tx.backToDashboard}</Link>
      <p className="mt-5 text-slate-400">{symbol} · {lang === "zh" ? "行情数据暂不可用" : "Market data temporarily unavailable"}</p>
    </main>;
  }

  const { quote, bars, demo, currency, market } = detail;
  const basePath = from === "preview" ? "/markets-preview" : `/dashboard/markets/${encodeURIComponent(quote.symbol)}`;
  const px = (n: number) => `${currency}${fmtPrice(n)}`;

  // A-shares are only presented in the Chinese version of the site.
  if (lang === "en" && market === "cn") {
    return (
      <div className="relative min-h-screen bg-[#060A14]">
        <header className="relative z-10 mx-auto max-w-5xl px-5 pt-6">
          <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(148,190,255,0.07)] bg-[#050811] px-5 py-3.5">
            <Link
              href={boardHref}
              className="rounded-full px-2 py-1 text-sm text-[#64748B] transition hover:bg-[rgba(148,190,255,0.04)] hover:text-slate-200"
            >
              {tx.backToDashboard}
            </Link>
            <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-white">
              <BrandLogo />
              FolioScope
            </Link>
            <LangToggle lang={lang} path={basePath} />
          </nav>
        </header>
        <main className="relative z-10 mx-auto max-w-3xl px-5 py-16">
          <div className="rounded-2xl border border-[rgba(148,190,255,0.07)] bg-[#0B1120] p-10 text-center">
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
                href={boardHref}
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

  const featuredFree = market === "us" && isFeaturedSymbol(quote.symbol);

  if (!featuredFree && !isSymbolUnlocked(market, quote.symbol, plan)) {
    return (
      <div className="relative min-h-screen bg-[#060A14]">
        <header className="relative z-10 mx-auto max-w-5xl px-5 pt-6">
          <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(148,190,255,0.07)] bg-[#050811] px-5 py-3.5">
            <Link
              href={boardHref}
              className="rounded-full px-2 py-1 text-sm text-[#64748B] transition hover:bg-[rgba(148,190,255,0.04)] hover:text-slate-200"
            >
              {tx.backToDashboard}
            </Link>
            <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-white">
              <BrandLogo />
              FolioScope
            </Link>
            <LangToggle lang={lang} path={basePath} />
          </nav>
        </header>
        <main className="relative z-10 mx-auto max-w-3xl px-5 py-16">
          <div className="rounded-2xl border border-[rgba(148,190,255,0.07)] bg-[#0B1120] p-10 text-center">
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
                href={boardHref}
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

  const valuation = quote.valuation;

  const chatContext: ChatMarketContext = {
    page: "instrument",
    lang,
    indices: [],
    focused: {
      symbol: quote.symbol,
      name: lang === "zh" ? quote.name : localizedName(quote, "en"),
      price: quote.price,
      changePct: quote.changePct,
      currency,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      prevClose: quote.prevClose,
      pe: quote.pe,
      pb: valuation?.pb ?? null,
      pePercentile: valuation?.pePercentile ?? null,
      week52Low: quote.week52Low,
      week52High: quote.week52High,
      ma5: quote.tech?.ma5 ?? null,
      ma10: quote.tech?.ma10 ?? null,
      ma20: quote.tech?.ma20 ?? null,
      rsi14: quote.tech?.rsi14 ?? null,
      macd: quote.tech?.macd ?? null,
      macdCross: quote.tech?.macdCross ?? null,
    },
  };

  return (
    <div className="relative min-h-screen bg-[#060A14]">

        <header className="relative z-10 mx-auto max-w-5xl px-5 pt-6">
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(148,190,255,0.07)] bg-[#050811] px-5 py-3.5">
          <Link
            href={boardHref}
            className="rounded-full px-2 py-1 text-sm text-[#64748B] transition hover:bg-[rgba(148,190,255,0.04)] hover:text-slate-200"
          >
            {tx.backToDashboard}
          </Link>
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold text-white">
            <BrandLogo />
            FolioScope
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
              {demo ? tm.demo : detail.historical ? (lang === "zh" ? "最近收盘" : "Latest close") : tm.live}
            </span>
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-5">
        <article className="border border-[rgba(148,190,255,.08)] bg-[#0B1120] shadow-[inset_0_1px_0_rgba(165,205,255,.15)] rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {lang === "zh" ? quote.name : localizedName(quote, "en")}
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StockReportButton
                  symbol={quote.symbol}
                  lang={lang}
                  plan={plan}
                  variant="detail"
                />
              </div>
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

          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#94beff12] bg-[#94beff12] sm:grid-cols-4">
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
              position={quote.week52Low !== null && quote.week52High !== null && quote.week52High > quote.week52Low && quote.price > 0
                ? Math.max(0, Math.min(100, 100 * (quote.price - quote.week52Low) / (quote.week52High - quote.week52Low)))
                : undefined}
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
            </div>
          )}

          {quote.tech ? (
            <div className="mt-4 flex flex-wrap gap-2 [&>*]:rounded-full [&>*]:bg-[#132238] [&>*]:px-3 [&>*]:py-1 border-t border-white/5 pt-4 text-xs tabular-nums">
              <RsiValue value={quote.tech.rsi14} lang={lang} />
              <MacdValue tech={quote.tech} lang={lang} />
            </div>
          ) : (
            <p className="mt-4 border-t border-white/5 pt-4 text-xs text-slate-500">
              {tx.techUnavailable}
            </p>
          )}
        </article>

        <article className="border border-[rgba(148,190,255,.08)] bg-[#0B1120] shadow-[inset_0_1px_0_rgba(165,205,255,.15)] mt-5 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">{lang === "zh" ? "价格走势" : "Price chart"}</h2>
            </div>
          </div>
          <div className="mt-4">
            {bars.length >= 2 ? (
              <PriceChart
                bars={bars}
                symbol={quote.symbol}
                lang={lang}
                fallbackPrevClose={quote.prevClose}
              />
            ) : (
              <p className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-slate-500">
                {tx.noKline}
              </p>
            )}
          </div>
        </article>
      </main>
      <AiAssistantDrawer lang={lang} marketContext={chatContext} />
    </div>
  );
}

import Link from "next/link";
import type { UsQuote } from "@/lib/us-stocks";
import type { ViewerPlan } from "@/lib/access";
import { dict, type Lang } from "@/lib/i18n";
import AnimatedNumber from "./ui/AnimatedNumber";
import UnlockCtaButton from "./ui/UnlockCtaButton";
import {
  ChangeChip,
  MaValue,
  MacdValue,
  RsiValue,
  Sparkline,
  ValuationChip,
  fmtCap,
  fmtPrice,
} from "./market-ui";

export function UnlockCta({
  lang,
  plan,
  count,
}: {
  lang: Lang;
  plan: ViewerPlan;
  count: number;
}) {
  return <UnlockCtaButton lang={lang} plan={plan} count={count} />;
}

/**
 * Pick the display names for a quote. In Chinese the CJK name leads with the
 * English name as a subtitle; in English the English name leads and the CJK
 * name is hidden so the English board stays fully English.
 */
function names(quote: UsQuote, lang: Lang) {
  if (lang === "zh") return { primary: quote.name, secondary: quote.nameEn };
  return { primary: quote.nameEn || quote.name, secondary: null as string | null };
}

function CardShell({
  href,
  title,
  children,
}: {
  href?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const body = (
    <article className="data-card h-full rounded-xl p-4">
      {children}
    </article>
  );
  if (!href) return body;
  return (
    <Link href={href} title={title} className="block">
      {body}
    </Link>
  );
}

function DayRangeBar({ quote }: { quote: UsQuote }) {
  const span = quote.high - quote.low;
  const pct =
    span > 0 ? Math.min(100, Math.max(0, ((quote.price - quote.low) / span) * 100)) : 50;
  const up = quote.change >= 0;
  return (
    <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out ${
          up
            ? "bg-gradient-to-r from-emerald-500/50 to-emerald-400"
            : "bg-gradient-to-r from-rose-500/50 to-rose-400"
        }`}
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-[left] duration-500 ease-out"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

export function IndexCard({
  quote,
  lang,
  href,
}: {
  quote: UsQuote;
  lang: Lang;
  href?: string;
}) {
  const t = dict[lang].markets;
  const tech = quote.tech;
  const valuation = quote.valuation;
  const { primary, secondary } = names(quote, lang);
  return (
    <CardShell href={href} title={href ? `${t.viewDetail} · ${primary}` : undefined}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-200">{primary}</p>
          {secondary && (
            <p className="mt-0.5 truncate text-[11px] text-slate-600">{secondary}</p>
          )}
        </div>
        <ChangeChip quote={quote} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-xl font-semibold tabular-nums text-white">
          <AnimatedNumber value={quote.price} digits={2} group />
        </p>
        {tech && <Sparkline points={tech.sparkline} />}
      </div>
      <div className="mt-2 flex justify-between text-[11px] tabular-nums text-slate-600">
        <span>
          {t.high} {fmtPrice(quote.high)}
        </span>
        <span>
          {t.low} {fmtPrice(quote.low)}
        </span>
      </div>
      {valuation && (
        <div
          className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] tabular-nums"
          title={`${t.valuationBy}${valuation.asOf ? ` (${valuation.asOf})` : ""}`}
        >
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="text-slate-600">
              {t.peShort} <span className="text-slate-300">{valuation.pe.toFixed(2)}</span>
            </span>
            {valuation.pb !== null && (
              <span className="text-slate-600">
                {t.pbShort}{" "}
                <span className="text-slate-300">{valuation.pb.toFixed(2)}</span>
              </span>
            )}
            {valuation.pePercentile !== null && (
              <span className="text-slate-600" title={t.percentileTip}>
                {t.percentile}{" "}
                <span className="text-slate-300">
                  {(valuation.pePercentile * 100).toFixed(0)}%
                </span>
              </span>
            )}
          </div>
          <ValuationChip percentile={valuation.pePercentile} lang={lang} />
        </div>
      )}
      {tech && (
        <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-white/5 pt-2 text-[11px] tabular-nums">
          <MaValue label="MA5" value={tech.ma5} price={quote.price} lang={lang} />
          <MaValue label="MA20" value={tech.ma20} price={quote.price} lang={lang} />
          <RsiValue value={tech.rsi14} lang={lang} />
        </div>
      )}
    </CardShell>
  );
}

export function StockCard({
  quote,
  lang,
  currency = "",
  href,
}: {
  quote: UsQuote;
  lang: Lang;
  currency?: string;
  href?: string;
}) {
  const t = dict[lang].markets;
  const tech = quote.tech;
  const { primary, secondary } = names(quote, lang);
  return (
    <CardShell href={href} title={href ? `${t.viewDetail} · ${primary}` : undefined}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-200">
            {primary}
            <span className="ml-1 text-slate-600">· {quote.symbol}</span>
          </p>
          {secondary && (
            <p className="mt-0.5 truncate text-[11px] text-slate-600">{secondary}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {tech && <Sparkline points={tech.sparkline} />}
          <div className="text-right">
            <p className="text-base font-semibold tabular-nums text-white">
              {currency}
              <AnimatedNumber value={quote.price} digits={2} group />
            </p>
            <p
              className={`mt-0.5 text-xs tabular-nums ${
                quote.change >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              <AnimatedNumber value={quote.change} digits={2} signed /> (
              <AnimatedNumber value={quote.changePct} digits={2} signed />%)
            </p>
          </div>
        </div>
      </div>

      <DayRangeBar quote={quote} />

      {tech && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-white/5 pt-2 text-[11px] tabular-nums">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <MaValue label="MA5" value={tech.ma5} price={quote.price} lang={lang} />
            <MaValue label="MA10" value={tech.ma10} price={quote.price} lang={lang} />
            <MaValue label="MA20" value={tech.ma20} price={quote.price} lang={lang} />
            <RsiValue value={tech.rsi14} lang={lang} />
          </div>
          <MacdValue tech={tech} lang={lang} />
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] tabular-nums text-slate-600">
        <span>
          {t.open} {currency}
          {fmtPrice(quote.open)}
        </span>
        <span>
          {t.highLabel} {currency}
          {fmtPrice(quote.high)}
        </span>
        <span>
          {t.lowLabel} {currency}
          {fmtPrice(quote.low)}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] tabular-nums text-slate-600">
        <span>
          {t.marketCap} {quote.marketCapUsd ? fmtCap(quote.marketCapUsd, currency || "$") : "—"}
        </span>
        <span>{t.pe} {quote.pe !== null ? quote.pe.toFixed(2) : "—"}</span>
        {quote.week52High !== null && quote.week52Low !== null && (
          <span>
            {t.week52} {currency}
            {fmtPrice(quote.week52Low)}–{currency}
            {fmtPrice(quote.week52High)}
          </span>
        )}
      </div>
    </CardShell>
  );
}

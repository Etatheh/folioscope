import { localizedName } from "@/lib/localized-text";
import Link from "next/link";
import type { UsQuote } from "@/lib/us-stocks";
import type { ViewerPlan } from "@/lib/access";
import { dict, type Lang } from "@/lib/i18n";
import AnimatedNumber from "./ui/AnimatedNumber";
import StockReportButton from "./stock/StockReportButton";
import UnlockCtaButton from "./ui/UnlockCtaButton";
import {
  ChangeChip,
  MaValue,
  MacdValue,
  RsiValue,
  Sparkline,
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
  return { primary: localizedName(quote, "en"), secondary: null as string | null };
}

function CardShell({
  href,
  title,
  action,
  children,
}: {
  href?: string;
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const body = (
    <article className="group/quote flex h-full min-w-0 flex-col rounded-xl border border-[rgba(148,190,255,.08)] bg-[#0B1120] p-4 tabular-nums shadow-[inset_0_1px_0_rgba(165,205,255,.12)] transition-colors hover:border-[rgba(148,190,255,.18)] hover:bg-[#0E1629] focus-within:border-[rgba(56,189,248,.55)] focus-within:bg-[#0F1A30] focus-within:shadow-[inset_0_1px_0_rgba(125,211,252,.35),0_0_24px_-8px_rgba(56,189,248,.25)] [&_.text-slate-600]:text-[#64748B] [&_span.text-slate-600_span]:text-[#CBD5E1]">
      {href ? (
        <Link href={href} title={title} className="block flex-1 rounded-sm focus-visible:outline-sky-300">
          {children}
        </Link>
      ) : (
        children
      )}
      {action && (
        <div className="mt-2.5 flex justify-end border-t border-[rgba(148,190,255,.06)] pt-2">
          {action}
        </div>
      )}
    </article>
  );
  return body;
}

function DayRangeBar({ quote }: { quote: UsQuote }) {
  const span = quote.high - quote.low;
  const pct =
    span > 0 ? Math.min(100, Math.max(0, ((quote.price - quote.low) / span) * 100)) : 50;
  return (
    <div aria-hidden="true" className="relative mx-[3px] mt-3 h-[3px] rounded-full bg-[rgba(148,190,255,.12)]">
      <div className="h-full rounded-full bg-[#38BDF8]" style={{ width: `${pct}%` }} />
      <div className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#38BDF8] shadow-[0_0_5px_#38bdf855]" style={{ left: `${pct}%` }} />
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-200">{primary}</p>
          {secondary && (
            <p className="mt-0.5 truncate text-[11px] text-slate-600">{secondary}</p>
          )}
        </div>
        <div className="shrink-0">
          <ChangeChip quote={quote} />
        </div>
      </div>
      <div className="mt-3 min-w-0">
        <p className="min-w-0 truncate text-xl font-semibold tabular-nums text-white">
          <AnimatedNumber value={quote.price} digits={2} group />
        </p>
        {tech && <Sparkline points={tech.sparkline} change={quote.change} />}
      </div>
      <div className="mt-2 flex justify-between text-[11px] tabular-nums text-slate-600">
        <span>
          {t.high} <span className="text-[#CBD5E1]">{fmtPrice(quote.high)}</span>
        </span>
        <span>
          {t.low} <span className="text-[#CBD5E1]">{fmtPrice(quote.low)}</span>
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
        </div>
      )}
      {tech && (
        <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-[rgba(148,190,255,.06)] pt-2 text-[11px] tabular-nums">
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
  plan,
  currency = "",
  href,
}: {
  quote: UsQuote;
  lang: Lang;
  plan: ViewerPlan;
  currency?: string;
  href?: string;
}) {
  const t = dict[lang].markets;
  const tech = quote.tech;
  const { primary, secondary } = names(quote, lang);
  return (
    <CardShell
      href={href}
      title={href ? `${t.viewDetail} · ${primary}` : undefined}
      action={
        <StockReportButton
          symbol={quote.symbol}
          lang={lang}
          plan={plan}
          variant="chip"
        />
      }
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <p className="whitespace-nowrap text-base font-bold tracking-tight text-[#F1F5F9]">{quote.symbol}</p>
          <p title={primary} className="truncate text-xs text-[#8B9BB4]">{primary}</p>
          {secondary && <p title={secondary} className="truncate text-[11px] text-[#8B9BB4]">{secondary}</p>}
        </div>
        <div className="whitespace-nowrap text-right tabular-nums">
          <p className="text-lg font-semibold leading-tight tracking-tight text-[#F1F5F9]">
            {currency}<AnimatedNumber value={quote.price} digits={2} group />
          </p>
          <p className={`mt-0.5 text-xs ${quote.change >= 0 ? "text-[#34D399]" : "text-[#F87171]"}`}>
            <AnimatedNumber value={quote.change} digits={2} signed /> (<AnimatedNumber value={quote.changePct} digits={2} signed />%)
          </p>
        </div>
      </header>
      {tech && <Sparkline points={tech.sparkline} change={quote.change} />}

      <DayRangeBar quote={quote} />

      {tech && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-[rgba(148,190,255,.06)] pt-2 text-[11px] tabular-nums">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <MaValue label="MA5" value={tech.ma5} price={quote.price} lang={lang} />
            <MaValue label="MA10" value={tech.ma10} price={quote.price} lang={lang} />
            <MaValue label="MA20" value={tech.ma20} price={quote.price} lang={lang} />
            <RsiValue value={tech.rsi14} lang={lang} />
          </div>
          <MacdValue tech={tech} lang={lang} />
        </div>
      )}

      <dl className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2 border-t border-[rgba(148,190,255,.06)] pt-3 text-[11px] leading-relaxed tabular-nums [&_dd]:text-[#CBD5E1] [&_dt]:text-[#64748B]">
        <div><dt>{t.open}</dt><dd>{currency}{fmtPrice(quote.open)}</dd></div>
        <div><dt>{t.highLabel}</dt><dd>{currency}{fmtPrice(quote.high)}</dd></div>
        <div><dt>{t.lowLabel}</dt><dd>{currency}{fmtPrice(quote.low)}</dd></div>
        <div><dt>{t.marketCap}</dt><dd>{quote.marketCapUsd ? fmtCap(quote.marketCapUsd, currency || "$") : "—"}</dd></div>
        <div><dt>{t.pe}</dt><dd>{quote.pe !== null ? quote.pe.toFixed(2) : "—"}</dd></div>
        <div>
          <dt>{t.week52}</dt>
          <dd>{quote.week52Low !== null && quote.week52High !== null ? (
            <><span className="whitespace-nowrap">{currency}{fmtPrice(quote.week52Low)}</span>–<wbr /><span className="whitespace-nowrap">{currency}{fmtPrice(quote.week52High)}</span></>
          ) : "—"}</dd>
        </div>
      </dl>
    </CardShell>
  );
}

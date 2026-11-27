import Link from "next/link";
import { useEffect, useEffectEvent, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type MouseEventHandler, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ViewerPlan } from "@/lib/access";
import { usInstrumentHref } from "@/lib/dashboard-views";
import { dict, type Lang } from "@/lib/i18n";
import { localizedName } from "@/lib/localized-text";
import type { UsQuote } from "@/lib/us-stocks";
import { fmtCap, fmtPrice, fmtVolume, MaValue, RsiValue, MacdValue } from "../market-ui";
import StockReportButton from "../stock/StockReportButton";
import { QuotePrice, StockTrend } from "./StockCard";

function Details({ quote, lang, sparkline }: { quote: UsQuote; lang: Lang; sparkline?: number[] }) {
  const t = dict[lang].markets;
  const tech = quote.tech;
  const low = quote.week52Low;
  const high = quote.week52High;
  const position = low !== null && high !== null && high > low && quote.price > 0
    ? Math.max(0, Math.min(100, 100 * (quote.price - low) / (high - low))) : null;
  const metrics = [
    [t.open, fmtPrice(quote.open)], [t.highLabel, fmtPrice(quote.high)], [t.lowLabel, fmtPrice(quote.low)],
    [t.marketCap, quote.marketCapUsd === null ? "—" : fmtCap(quote.marketCapUsd)],
    [t.pe, quote.pe?.toFixed(2) ?? "—"], [dict[lang].detail.volume, fmtVolume(quote.volume)],
  ];
  return (
    <div className="space-y-7">
      <div>
        <QuotePrice quote={quote} />
        <StockTrend points={sparkline ?? tech?.sparkline ?? []} change={quote.change} height={144} lang={lang} />
        <div className="flex items-center justify-between text-xs text-[#8B9BB4]">
          <span>{t.week52}</span><span>{low !== null && high !== null ? `$${fmtPrice(low)} – $${fmtPrice(high)}` : "—"}</span>
        </div>
        <div className="relative mt-2 h-[3px] rounded-full bg-[#94beff20]">
          {position !== null && <span className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_6px_#38bdf866]" style={{left: `${position}%`}} />}
        </div>
      </div>
      <section>
        <h3 className="mb-3 text-sm font-semibold">{lang === "zh" ? "基本面" : "Fundamentals"}</h3>
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[#94beff14] bg-[#94beff14]">
          {metrics.map(([label, value]) => (
            <div key={label} className="bg-[#0B1120] px-3 py-3"><dt className="text-xs text-[#8B9BB4]">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>
          ))}
        </dl>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold">{lang === "zh" ? "技术指标" : "Technicals"}</h3>
        <div className="grid grid-cols-3 gap-3 border-t border-[#94beff14] pt-4 text-xs [&_.text-slate-600]:text-[#64748B] [&_.text-slate-600_span]:text-[#E2E8F0]">
          <MaValue label="MA5" value={tech?.ma5 ?? null} price={quote.price} lang={lang} />
          <MaValue label="MA10" value={tech?.ma10 ?? null} price={quote.price} lang={lang} />
          <MaValue label="MA20" value={tech?.ma20 ?? null} price={quote.price} lang={lang} />
          <RsiValue value={tech?.rsi14 ?? null} lang={lang} />
          <div className="col-span-2">{tech ? <MacdValue tech={tech} lang={lang} /> : <span className="text-[#64748B]">MACD —</span>}</div>
        </div>
      </section>
    </div>
  );
}

export default function StockDrawer({
  selected, lang, plan, preview = false, opener, onClose, onBackdropClick, navigation, sparkline,
}: {
  selected: UsQuote | null;
  lang: Lang;
  plan: ViewerPlan;
  preview?: boolean;
  opener: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onBackdropClick?: MouseEventHandler<HTMLDivElement>;
  navigation?: ReactNode;
  sparkline?: number[];
}) {
  const open = Boolean(selected);
  const titleId = useId();
  const dismiss = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const symbol = selected?.symbol;
  const restoreFocus = useEffectEvent(() => opener.current?.focus({ preventScroll: true }));

  useEffect(() => {
    if (symbol) dismiss.current?.focus({ preventScroll: true });
  }, [symbol]);

  useEffect(() => {
    if (!open) return;
    // A nested portal can return focus to the body when it closes.
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] === dismiss.current?.closest('[role="dialog"]')) {
        onClose();
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
      restoreFocus();
    };
  }, [onClose, open]);

  function handleKeys(event: ReactKeyboardEvent<HTMLElement>) {
    // The earnings report and upgrade dialogs render in their own portals.
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (event.key === "Tab") {
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  return typeof document !== "undefined" && createPortal(<AnimatePresence>
      {selected && (
        <motion.div key="stock-layer" className="fixed inset-0 z-[75]" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: reduced ? 0 : 0.15}}>
          <div aria-hidden="true" className="absolute inset-0 bg-black/30" onClick={onBackdropClick ?? onClose} />
          <motion.aside role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={handleKeys}
            initial={{x: reduced ? 0 : "100%"}} animate={{x: 0}} exit={{x: reduced ? 0 : "100%"}} transition={{duration: reduced ? 0 : 0.23, ease: "easeOut"}}
            className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-[#94beff24] bg-[rgba(8,13,26,.88)] text-[#E2E8F0] tabular-nums shadow-[-24px_0_48px_rgba(0,0,0,.5)] backdrop-blur-[20px] sm:w-[min(460px,100vw)]">
            <header className="flex items-start justify-between gap-2 border-b border-[#94beff14] p-5">
              <div className="min-w-0"><h2 id={titleId} className="text-2xl font-bold">{selected.symbol}</h2>
                <p className="text-sm text-[#8B9BB4]">{localizedName(selected, lang)}</p></div>
              <Link href={usInstrumentHref(selected.symbol, lang, preview)} className="shrink-0 rounded-lg border border-sky-300/20 px-2.5 py-2 text-xs text-sky-200">{lang === "zh" ? "完整图表" : "Full chart"} ↗</Link>
              <button ref={dismiss} type="button" aria-label={lang === "zh" ? "关闭" : "Close"} className="size-9 shrink-0 rounded-lg text-xl hover:bg-sky-100/5" onClick={onClose}>×</button>
            </header>
            <div key={selected.symbol} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5"><Details quote={selected} lang={lang} sparkline={sparkline} /></div>
            <footer className="border-t border-[#94beff14] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {navigation}
              <StockReportButton key={selected.symbol} symbol={selected.symbol} lang={lang} plan={plan} className="min-h-11 w-full justify-center text-sm" />
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>, document.body);
}

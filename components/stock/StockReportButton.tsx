"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { apiFetch } from "@/lib/client-api";
import { dict, type Lang } from "@/lib/i18n";
import { hasFullDashboardAccess, type ViewerPlan } from "@/lib/access";
import { useProfile, useViewerPlan } from "@/lib/use-profile";
import {
  type StockFinancials,
  type StockReport,
  type StockReportApiResponse,
} from "@/lib/stock-report";
import UpgradeModal from "@/components/ui/UpgradeModal";

type Variant = "chip" | "detail";

const emptySubscribe = () => () => {};

/** True only after hydration — keeps the portal out of the server render. */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const VARIANT_CLASS: Record<Variant, string> = {
  chip:
    "inline-flex items-center gap-1 rounded-full border border-purple-400/20 bg-purple-500/[0.07] px-2.5 py-1 text-[10px] font-medium text-purple-200 transition hover:border-purple-400/45 hover:bg-purple-500/15 hover:text-white",
  detail:
    "btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium text-white",
};

function fmtMoney(value: number | null, currency: string, lang: Lang): string {
  if (value === null) return "—";
  return `${currency}${new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function fmtPrice(value: number | null, currency: string, lang: Lang): string {
  if (value === null) return "—";
  return `${currency}${new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function fmtRatio(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

/** Yahoo returns margins/growth as fractions; EPS surprise as a percentage. */
function fmtFractionAsPct(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function fmtPct(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function ReportBody({
  report,
  financials,
  lang,
}: {
  report: StockReport;
  financials: StockFinancials;
  lang: Lang;
}) {
  const t = dict[lang].stockReport;
  const currency = financials.currency || "$";
  const metrics: { label: string; value: string; tone?: "good" | "bad" }[] = [
    {
      label: t.metrics.revenueGrowth,
      value: fmtFractionAsPct(financials.revenueGrowth),
      tone:
        financials.revenueGrowth === null
          ? undefined
          : financials.revenueGrowth >= 0
            ? "good"
            : "bad",
    },
    { label: t.metrics.grossMargin, value: fmtFractionAsPct(financials.grossMargin) },
    {
      label: t.metrics.freeCashflow,
      value: fmtMoney(financials.freeCashflow, currency, lang),
    },
    { label: t.metrics.pe, value: fmtRatio(financials.pe) },
    { label: t.metrics.pb, value: fmtRatio(financials.pb) },
    {
      label: t.metrics.week52,
      value:
        financials.week52Low !== null && financials.week52High !== null
          ? `${fmtPrice(financials.week52Low, currency, lang)} – ${fmtPrice(
              financials.week52High,
              currency,
              lang
            )}`
          : "—",
    },
    { label: t.metrics.price, value: fmtPrice(financials.price, currency, lang) },
    {
      label: t.metrics.marketCap,
      value: fmtMoney(financials.marketCap, currency, lang),
    },
  ];

  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-xl border border-purple-400/15 bg-purple-500/[0.06] p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300">
          {t.sections.summary}
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
          {report.summary[lang]}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
          >
            <p className="text-[10px] text-slate-600">{metric.label}</p>
            <p
              className={`mt-1 text-sm font-medium tabular-nums ${
                metric.tone === "good"
                  ? "text-emerald-300"
                  : metric.tone === "bad"
                    ? "text-rose-300"
                    : "text-slate-200"
              }`}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {t.epsTitle}
        </h3>
        {financials.epsQuarters.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">{t.noEps}</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full min-w-[360px] text-left text-xs tabular-nums">
              <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Q</th>
                  <th className="px-3 py-2 text-right font-medium">{t.actual}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.estimate}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.surprise}</th>
                </tr>
              </thead>
              <tbody>
                {financials.epsQuarters.map((quarter) => (
                  <tr key={quarter.period} className="border-t border-white/5">
                    <th scope="row" className="px-3 py-2 font-normal text-slate-300">
                      {quarter.period}
                    </th>
                    <td className="px-3 py-2 text-right text-slate-200">
                      {fmtRatio(quarter.actual)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {fmtRatio(quarter.estimate)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        quarter.surprisePct === null
                          ? "text-slate-500"
                          : quarter.surprisePct >= 0
                            ? "text-emerald-300"
                            : "text-rose-300"
                      }`}
                    >
                      {fmtPct(quarter.surprisePct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">
          {t.sections.highlights}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {report.highlights[lang].map((item, index) => (
            <li
              key={`${index}-${item}`}
              className="flex gap-2 text-sm leading-relaxed text-slate-300"
            >
              <span aria-hidden className="mt-0.5 text-emerald-400">
                +
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300/80">
          {t.sections.valuation}
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
          {report.valuation[lang]}
        </p>
      </section>

      <section className="rounded-xl border border-rose-400/15 bg-rose-500/[0.04] p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-300/80">
          {t.sections.risks}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {report.risks[lang].map((item, index) => (
            <li
              key={`${index}-${item}`}
              className="flex gap-2 text-sm leading-relaxed text-slate-300"
            >
              <span aria-hidden className="mt-0.5 text-rose-400">
                !
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-white/5 pt-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {t.sections.verdict}
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
          {report.verdict[lang]}
        </p>
      </section>
    </div>
  );
}

function ReportDialog({
  open,
  onClose,
  lang,
  symbol,
  loading,
  error,
  data,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  symbol: string;
  loading: boolean;
  error: string | null;
  data: StockReportApiResponse & { ok: true } | null;
  onRetry: () => void;
}) {
  const t = dict[lang].stockReport;
  const [reportLang, setReportLang] = useState<Lang>(lang);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const mounted = useIsClient();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 60);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  const dataTime = data?.financials.asOf
    ? new Date(data.financials.asOf).toLocaleString(
        reportLang === "zh" ? "zh-CN" : "en-US",
        { dateStyle: "medium", timeStyle: "short" }
      )
    : null;
  const generatedTime = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleString(
        reportLang === "zh" ? "zh-CN" : "en-US",
        { dateStyle: "medium", timeStyle: "short" }
      )
    : null;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="stock-report-backdrop"
          className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-[#03060d]/75 px-4 py-8 backdrop-blur-md"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-report-title"
            initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="glass-panel relative my-auto max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-5 text-slate-200 sm:p-6"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-purple-500/20 blur-[70px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-blue-500/15 blur-[70px]"
            />

            <header className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300">
                  {t.badge} · {symbol}
                </p>
                <h2
                  id="stock-report-title"
                  className="mt-1.5 text-lg font-semibold tracking-tight text-white sm:text-xl"
                >
                  {t.title}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">{t.subtitle}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                ×
              </button>
            </header>

            {loading && (
              <div className="relative mt-6 space-y-3" aria-live="polite" aria-busy="true">
                <p className="text-xs text-slate-400">{t.loading}</p>
                <div className="h-3 w-11/12 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-full animate-pulse rounded bg-white/[0.07]" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.07]" />
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-14 animate-pulse rounded-xl bg-white/[0.04]"
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="relative mt-6 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] p-4">
                <p className="text-sm text-rose-200">{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium text-rose-100 transition hover:border-rose-300/45"
                >
                  {t.retry}
                </button>
              </div>
            )}

            {!loading && !error && data?.ok && (
              <>
                <div className="relative mt-4 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
                    {(["zh", "en"] as const).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setReportLang(code)}
                        aria-pressed={reportLang === code}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                          reportLang === code
                            ? "bg-gradient-to-r from-blue-500/30 to-purple-500/35 text-white"
                            : "text-slate-500 hover:text-slate-200"
                        }`}
                      >
                        {code === "zh" ? t.langZh : t.langEn}
                      </button>
                    ))}
                  </div>
                  {data.cached && (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] text-emerald-300">
                      {t.cached}
                    </span>
                  )}
                  {data.model && (
                    <span className="rounded-full border border-purple-400/15 bg-purple-500/[0.06] px-2.5 py-1 text-[10px] text-slate-400">
                      {data.model}
                    </span>
                  )}
                </div>

                <ReportBody
                  report={data.report}
                  financials={data.financials}
                  lang={reportLang}
                />

                <footer className="relative mt-5 border-t border-white/5 pt-3 text-[10px] leading-relaxed text-slate-600">
                  <p>
                    {generatedTime ? `${t.generated} ${generatedTime}` : ""}
                    {dataTime ? ` · ${t.dataAsOf} ${dataTime}` : ""}
                  </p>
                  <p className="mt-1">{t.disclaimer}</p>
                </footer>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function StockReportButton({
  symbol,
  lang,
  plan,
  variant = "chip",
  className = "",
}: {
  symbol: string;
  lang: Lang;
  /** Server-rendered viewer plan; live Supabase/legacy session overrides it. */
  plan?: ViewerPlan;
  variant?: Variant;
  className?: string;
}) {
  const t = dict[lang].stockReport;
  const { ready } = useProfile();
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<(StockReportApiResponse & { ok: true }) | null>(
    null
  );

  // Live tier (including `profiles.tier === "admin"`) overrides the server plan.
  const effectivePlan: ViewerPlan = useViewerPlan(plan ?? "anon");
  const hasAccess = hasFullDashboardAccess(effectivePlan);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/ai/stock-report?symbol=${encodeURIComponent(symbol)}&lang=${lang}`
      );
      const payload = (await response.json().catch(() => null)) as
        | StockReportApiResponse
        | null;

      if (response.status === 403) {
        setOpen(false);
        setUpgradeOpen(true);
        return;
      }

      if (!response.ok || !payload || payload.ok !== true) {
        setError(
          response.status === 401
            ? t.unauthorized
            : payload && payload.ok === false
              ? payload.error
              : t.error
        );
        return;
      }

      setData(payload);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [lang, symbol, t.error, t.unauthorized]);

  const handleClick = () => {
    if (!ready) return;
    if (!hasAccess) {
      setUpgradeOpen(true);
      return;
    }
    setOpen(true);
    if (!data) void load();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!ready}
        className={`${VARIANT_CLASS[variant]} ${className}`}
        title={t.button}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        >
          <path
            d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3ZM18.5 14l.9 2.4 2.1.8-2.1.8-.9 2.4-.9-2.4-2.1-.8 2.1-.8.9-2.4Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t.button}
      </button>

      <ReportDialog
        key={lang}
        open={open}
        onClose={() => setOpen(false)}
        lang={lang}
        symbol={symbol}
        loading={loading}
        error={error}
        data={data}
        onRetry={load}
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        lang={lang}
        source={`stock-report:${symbol}`}
      />
    </>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";

import { apiFetch } from "@/lib/client-api";
import type { ViewerPlan } from "@/lib/access";
import { dict, type Lang } from "@/lib/i18n";
import type { MarketSearchHit, MarketSearchResponse } from "@/lib/market-search";
import { useProfile } from "@/lib/use-profile";
import { BACKTEST_ADD_EVENT, queueBacktestSymbol } from "@/lib/watchlist";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import ProBadge from "@/components/ui/ProBadge";
import UpgradeModal from "@/components/ui/UpgradeModal";
import LoadedStockCard from "@/components/simulator/LoadedStockCard";
import FavoriteButton from "./FavoriteButton";
import QuoteCard from "./QuoteCard";

const SEARCH_DEBOUNCE_MS = 280;
const EXAMPLES = ["PLTR", "SOXL", "COIN"];

function changeTone(value: number) {
  return value >= 0 ? "text-emerald-400" : "text-rose-400";
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Full U.S. market search.
 *
 * Pro/Admin users get live market suggestions and can push a hit into
 * the watchlist, the current board, or the backtest pool. Everyone else sees a
 * blurred teaser that opens the auth / upgrade flow.
 */
export default function MarketSearch({
  lang,
  plan,
  backtest,
}: {
  lang: Lang;
  plan: ViewerPlan;
  backtest?: { selectedSymbols: readonly string[]; syncingSymbol: string | null };
}) {
  const t = dict[lang].watchlist;
  const { user, ready, isPro } = useProfile();
  const { openAuthModal } = useAuthModal();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<MarketSearchHit[]>([]);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState<MarketSearchHit | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const requestId = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const gate = () => {
    if (!ready) return;
    if (!user) {
      openAuthModal({ mode: "login", lang });
      return;
    }
    setUpgradeOpen(true);
  };

  const changeQuery = (value: string) => {
    requestId.current += 1;
    setQuery(value);
    setResults([]);
    setSearched(false);
    setError(false);
    setLoading(false);
    setOpen(Boolean(value.trim()));
  };

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const term = query.trim();
    if (!isPro || term.length === 0) return;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await apiFetch(
          `/api/market/search?q=${encodeURIComponent(term)}`
        );
        if (currentRequest !== requestId.current) return;

        const payload = (await response.json().catch(() => null)) as
          | MarketSearchResponse
          | null;

        if (response.ok && payload?.ok === true) {
          setResults(payload.results);
          setSearched(true);
        } else {
          setResults([]);
          setSearched(true);
          setError(true);
        }
      } catch {
        if (currentRequest === requestId.current) {
          setResults([]);
          setSearched(true);
          setError(true);
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [isPro, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const loadToBoard = (hit: MarketSearchHit) => {
    setLoaded(hit);
    setOpen(false);
    window.setTimeout(() => {
      document
        .getElementById("market-search-loaded")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  const syncToBacktest = (symbol: string, scrollToWorkbench = true) => {
    window.dispatchEvent(
      new CustomEvent(BACKTEST_ADD_EVENT, { detail: { symbol, scrollToWorkbench } })
    );

    // The simulator listens for the event, but search also lives in the
    // watchlist view now. When its workbench is not mounted, hand the symbol
    // over and navigate there so the click is never a silent no-op.
    if (!document.getElementById("simulator-workbench")) {
      queueBacktestSymbol(symbol);
      window.location.href = `/dashboard?lang=${lang}&view=simulator`;
    }
  };

  const dropdownVisible =
    open &&
    query.trim().length > 0 &&
    (loading || searched || results.length > 0 || error);

  if (!isPro) {
    return (
      <div className="relative mt-4">
        <button
          type="button"
          onClick={gate}
          className="glass flex w-full items-center gap-2.5 rounded-2xl border-white/10 px-3.5 py-2.5 text-left transition hover:border-amber-300/30"
        >
          <span className="text-slate-500">
            <SearchIcon />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
            {t.searchPlaceholder}
          </span>
          <ProBadge label="PRO" title={t.proLockedBody} />
        </button>

        <button
          type="button"
          onClick={gate}
          aria-label={t.upgrade}
          className="relative mt-2 block w-full overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-400/[0.05] via-white/[0.02] to-purple-500/[0.08] p-3 text-left"
        >
          <div aria-hidden className="pointer-events-none space-y-2 blur-[5px]">
            {EXAMPLES.map((symbol, index) => (
              <div
                key={symbol}
                className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2"
              >
                <span className="text-xs font-semibold text-white">{symbol}</span>
                <span className="h-2 w-28 rounded-full bg-white/15" />
                <span className="text-xs tabular-nums text-white">
                  ${(index + 1) * 97 + 24}.{index === 1 ? "40" : "18"}
                </span>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#070b13]/45 p-4 text-center">
            <span className="text-base" aria-hidden>
              🔒
            </span>
            <span className="text-sm font-semibold text-amber-100">
              {t.searchLockedTitle}
            </span>
            <span className="max-w-md text-[11px] leading-relaxed text-slate-400">
              {t.searchLockedBody}
            </span>
            <span className="btn-primary mt-1 rounded-full px-4 py-1.5 text-[11px] font-semibold text-white">
              {t.upgrade}
            </span>
          </div>
        </button>

        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          lang={lang}
          source="market-search"
        />
      </div>
    );
  }

  return (
    <>
    <div ref={wrapRef} className="relative mt-4">
      <div className="group/search glass flex items-center gap-2.5 rounded-2xl border-white/10 px-3.5 py-2.5 transition focus-within:border-purple-400/45 focus-within:shadow-[0_0_28px_-12px_rgba(168,85,247,0.85)]">
        <span className="text-slate-500 transition group-focus-within/search:text-purple-300">
          <SearchIcon />
        </span>
        <input
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              loadToBoard(results[0]);
            }
          }}
          aria-label={t.searchAria}
          placeholder={t.searchPlaceholder}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
        />
        {loading && (
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-300" />
        )}
        {query && !loading && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => changeQuery("")}
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-600 transition hover:bg-white/5 hover:text-slate-300"
          >
            ×
          </button>
        )}
        <ProBadge label="PRO" title={t.proLockedBody} />
      </div>

      {!query && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
          {t.searchHint}
          {EXAMPLES.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => changeQuery(symbol)}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-500 transition hover:border-purple-400/30 hover:text-slate-200"
            >
              {symbol}
            </button>
          ))}
        </p>
      )}

      {dropdownVisible && (
        <div className="glass-panel absolute inset-x-0 top-[calc(100%+0.4rem)] z-40 max-h-[22rem] overflow-y-auto rounded-2xl p-1.5 shadow-2xl shadow-black/50">
          {loading && results.length === 0 && (
            <p className="px-3 py-3 text-[11px] text-slate-500">{t.searching}</p>
          )}
          {!loading && error && (
            <p className="px-3 py-3 text-[11px] text-rose-300">{t.searchError}</p>
          )}
          {!loading && !error && searched && results.length === 0 && (
            <p className="px-3 py-3 text-[11px] text-slate-500">{t.noResult}</p>
          )}
          {results.map((hit) => (
            <div
              key={hit.symbol}
              className="flex items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]"
            >
              <button
                type="button"
                onClick={() => loadToBoard(hit)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-100">
                    {hit.symbol}
                  </span>
                  <span className="rounded border border-white/10 px-1 py-0.5 text-[8px] uppercase tracking-wider text-slate-500">
                    {hit.quoteType === "ETF" ? "ETF" : "US"}
                  </span>
                  <span className="truncate text-[10px] text-slate-600">
                    {hit.exchange}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                  {lang === "zh" ? hit.name : hit.nameEn}
                </span>
              </button>

              <div className="shrink-0 text-right">
                <p className="text-xs font-medium tabular-nums text-white">
                  ${hit.quote.price.toFixed(2)}
                </p>
                <p
                  className={`text-[10px] tabular-nums ${changeTone(
                    hit.quote.changePct
                  )}`}
                >
                  {hit.quote.changePct >= 0 ? "+" : ""}
                  {hit.quote.changePct.toFixed(2)}%
                </p>
              </div>

              <FavoriteButton symbol={hit.symbol} lang={lang} size="sm" />

              <button
                type="button"
                onClick={() => syncToBacktest(hit.symbol)}
                title={t.syncBacktest}
                aria-label={t.syncBacktest}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-purple-400/35 hover:text-purple-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {loaded && !backtest && (
        <div
          id="market-search-loaded"
          className="mt-6 rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.08] via-white/[0.02] to-blue-500/[0.05] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-purple-300/80">
                {t.loadedToBoard}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {loaded.symbol} · {loaded.exchange}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => syncToBacktest(loaded.symbol)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-slate-300 transition hover:border-purple-400/35 hover:text-white"
              >
                {t.syncBacktest}
              </button>
              <button
                type="button"
                aria-label={t.close}
                onClick={() => setLoaded(null)}
                className="grid h-7 w-7 place-items-center rounded-full text-slate-500 transition hover:bg-white/5 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
          <div className="mt-3 max-w-sm">
            <QuoteCard quote={loaded.quote} lang={lang} plan={plan} />
          </div>
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        lang={lang}
        source="market-search"
      />
    </div>
    {loaded && backtest && (
      <LoadedStockCard key={loaded.symbol} hit={loaded} lang={lang} plan={plan}
        added={backtest.selectedSymbols.includes(loaded.symbol)}
        syncing={backtest.syncingSymbol === loaded.symbol}
        onAdd={() => syncToBacktest(loaded.symbol, false)}
        onRemove={() => setLoaded(null)} />
    )}
    </>
  );
}

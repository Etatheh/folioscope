"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/client-api";
import { dict, type Lang } from "@/lib/i18n";
import { useProfile } from "@/lib/use-profile";
import type { UsQuote } from "@/lib/us-stocks";
import {
  BACKTEST_ADD_EVENT,
  FEATURED_SYMBOLS,
  isFeaturedSymbol,
  normalizeSymbol,
  symbolLabel,
} from "@/lib/watchlist";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import ProBadge from "@/components/ui/ProBadge";
import UpgradeModal from "@/components/ui/UpgradeModal";
import { fmtPrice } from "@/components/market-ui";
import FavoriteButton from "./FavoriteButton";
import { useWatchlist } from "./WatchlistProvider";

const SEARCH_DEBOUNCE_MS = 380;

export default function MarketSearch({
  lang,
  featuredQuotes,
}: {
  lang: Lang;
  featuredQuotes: UsQuote[];
}) {
  const t = dict[lang].watchlist;
  const { user, ready, isPro } = useProfile();
  const { openAuthModal } = useAuthModal();
  const { symbols: savedSymbols, has } = useWatchlist();

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [asyncResult, setAsyncResult] = useState<UsQuote | null>(null);
  const [serverLockedSymbol, setServerLockedSymbol] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const requestId = useRef(0);

  const featuredMap = useMemo(
    () => new Map(featuredQuotes.map((quote) => [quote.symbol, quote])),
    [featuredQuotes]
  );

  const symbol = normalizeSymbol(query);
  const normalizedQuery = query.trim().toUpperCase();

  const derivedLocked =
    !isPro && symbol && !isFeaturedSymbol(symbol) && symbol.length >= 2
      ? symbol
      : null;
  const lockedSymbol = derivedLocked ?? serverLockedSymbol;
  const localResult =
    symbol && isFeaturedSymbol(symbol) ? featuredMap.get(symbol) : undefined;
  const result = localResult ?? asyncResult;

  const changeQuery = (value: string) => {
    requestId.current += 1;
    setQuery(value);
    setAsyncResult(null);
    setServerLockedSymbol(null);
    setNotFound(false);
    setError(false);
    setSearching(false);
  };

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    const pool = [...FEATURED_SYMBOLS, ...savedSymbols];
    const seen = new Set<string>();
    return pool
      .filter((item) => {
        if (seen.has(item)) return false;
        seen.add(item);
        if (item.includes(normalizedQuery)) return true;
        const zh = symbolLabel(item, "zh");
        const en = symbolLabel(item, "en");
        return (
          zh.toUpperCase().includes(normalizedQuery) ||
          en.toUpperCase().includes(normalizedQuery)
        );
      })
      .slice(0, 6);
  }, [normalizedQuery, savedSymbols]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    if (!symbol) return;

    const featured = isFeaturedSymbol(symbol);

    // Non-Pro visitors get a locked blur preview instead of a network request.
    if (!isPro && !featured) return;

    // Featured cards already carry a server quote; use it for an instant result.
    if (featured && featuredMap.has(symbol)) return;

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiFetch(
          `/api/markets/quote?symbol=${encodeURIComponent(symbol)}`
        );
        if (currentRequest !== requestId.current) return;

        if (response.ok) {
          const data = (await response.json()) as { quote?: UsQuote };
          if (data.quote) {
            setAsyncResult(data.quote);
            setServerLockedSymbol(null);
            setNotFound(false);
          } else {
            setNotFound(true);
          }
        } else if (response.status === 401 || response.status === 403) {
          setAsyncResult(null);
          setServerLockedSymbol(symbol);
        } else if (response.status === 404) {
          setAsyncResult(null);
          setNotFound(true);
        } else {
          setAsyncResult(null);
          setError(true);
        }
      } catch {
        if (currentRequest === requestId.current) {
          setAsyncResult(null);
          setError(true);
        }
      } finally {
        if (currentRequest === requestId.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [featuredMap, isPro, symbol]);

  const requireUpgrade = () => {
    if (!ready) return;
    if (!user) {
      openAuthModal({ mode: "login", lang });
      return;
    }
    setUpgradeOpen(true);
  };

  const syncToBacktest = (target: string) => {
    if (!isPro) {
      requireUpgrade();
      return;
    }
    window.dispatchEvent(
      new CustomEvent(BACKTEST_ADD_EVENT, { detail: { symbol: target } })
    );
  };

  const showSuggestions = focused && normalizedQuery.length > 0 && suggestions.length > 0;

  return (
    <div className="relative mt-4">
      <div className="group/search relative">
        <div className="glass flex items-center gap-2.5 rounded-2xl border-white/10 px-3.5 py-2.5 transition focus-within:border-purple-400/45 focus-within:shadow-[0_0_28px_-12px_rgba(168,85,247,0.85)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            className="h-4 w-4 shrink-0 text-slate-500 transition group-focus-within/search:text-purple-300"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 140)}
            aria-label={t.searchAria}
            placeholder={t.searchPlaceholder}
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => changeQuery("")}
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-600 transition hover:bg-white/5 hover:text-slate-300"
            >
              ×
            </button>
          )}
          <ProBadge label="PRO" className="ml-0.5" title={t.proLockedBody} />
        </div>

        {showSuggestions && (
          <div className="glass-panel absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-xl p-1.5 shadow-2xl shadow-black/50">
            {suggestions.map((item) => {
              const label = symbolLabel(item, lang);
              return (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => changeQuery(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-purple-500/10"
                >
                  <span className="text-xs font-medium text-slate-200">{item}</span>
                  <span className="truncate text-[11px] text-slate-500">
                    {label !== item ? `${label} · ` : ""}
                    {isFeaturedSymbol(item) ? "Free" : "Pro"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {searching && (
        <p className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
          {t.searching}
        </p>
      )}

      {!searching && error && (
        <p className="mt-2 text-[11px] text-rose-300">{t.searchError}</p>
      )}

      {!searching && notFound && (
        <p className="mt-2 text-[11px] text-slate-500">{t.noResult}</p>
      )}

      {result && !searching && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.09] via-white/[0.02] to-blue-500/[0.06] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-purple-300/80">
                {t.searchResult}
              </p>
              <p className="mt-1 flex items-baseline gap-2 text-sm font-semibold text-white">
                {result.symbol}
                {(() => {
                  const label = lang === "zh" ? result.name : result.nameEn || result.name;
                  return label && label.toUpperCase() !== result.symbol ? (
                    <span className="truncate text-xs font-normal text-slate-400">
                      {label}
                    </span>
                  ) : null;
                })()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums text-white">
                ${fmtPrice(result.price)}
              </p>
              <p
                className={`text-[11px] tabular-nums ${
                  result.change >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {result.change >= 0 ? "+" : ""}
                {result.change.toFixed(2)} (
                {result.change >= 0 ? "+" : ""}
                {result.changePct.toFixed(2)}%)
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FavoriteButton symbol={result.symbol} lang={lang} />
            <span className="text-[11px] text-slate-400">
              {has(result.symbol) ? t.added : t.addWatchlist}
            </span>
            <span className="mx-1 h-3 w-px bg-white/10" aria-hidden />
            <button
              type="button"
              onClick={() => syncToBacktest(result.symbol)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-purple-400/30 hover:text-white"
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
              {t.syncBacktest}
            </button>
            <Link
              href={`/dashboard/markets/${encodeURIComponent(result.symbol)}?lang=${lang}`}
              className="ml-auto text-[11px] text-purple-300 transition hover:text-purple-200"
            >
              {t.viewDetail} →
            </Link>
          </div>
        </div>
      )}

      {lockedSymbol && !searching && (
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-400/[0.06] via-white/[0.02] to-purple-500/[0.08] p-4">
          <div
            aria-hidden
            className="pointer-events-none select-none blur-[5px]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/60">
                  {t.searchResult}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {lockedSymbol}
                  {symbolLabel(lockedSymbol, lang) !== lockedSymbol && (
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {symbolLabel(lockedSymbol, lang)}
                    </span>
                  )}
                </p>
              </div>
              <p className="text-lg font-semibold tabular-nums text-white">$•••</p>
            </div>
            <div className="mt-3 h-1.5 w-2/3 rounded-full bg-white/15" />
            <div className="mt-2 h-2 w-1/2 rounded-full bg-white/10" />
          </div>

          <button
            type="button"
            onClick={requireUpgrade}
            aria-label={t.upgrade}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#070b13]/35 p-4 text-center"
          >
            <span className="text-lg" aria-hidden>
              🔒
            </span>
            <span className="block text-sm font-semibold text-amber-100">
              {t.proLockedTitle}
            </span>
            <span className="block max-w-sm text-[11px] leading-relaxed text-slate-400">
              {t.proLockedBody}
            </span>
            <span className="btn-primary mt-1 rounded-full px-4 py-1.5 text-[11px] font-semibold text-white">
              {t.upgrade}
            </span>
          </button>
        </div>
      )}

      {!query && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
          {t.searchHint}
          {FEATURED_SYMBOLS.slice(0, 4).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => changeQuery(item)}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-500 transition hover:border-purple-400/30 hover:text-slate-200"
            >
              {item}
            </button>
          ))}
        </p>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        lang={lang}
        source="market-search"
      />
    </div>
  );
}
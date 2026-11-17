"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { dict, type Lang } from "@/lib/i18n";
import { resolveClientLang } from "@/lib/lang-pref";
import { useSession } from "@/lib/use-session";
import { normalizeSymbol, type WatchlistEntry } from "@/lib/watchlist";
import {
  loadWatchlist,
  persistWatchlistChange,
  type WatchlistSource,
} from "@/lib/watchlist-store";
import { showToast } from "@/components/ui/ToastHost";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

type ToggleResult = {
  ok: boolean;
  saved?: boolean;
  reason?: "auth" | "pending" | "error";
};

type WatchlistState = {
  key: string;
  entries: WatchlistEntry[];
  source: WatchlistSource;
};

type WatchlistContextValue = {
  entries: WatchlistEntry[];
  symbols: string[];
  count: number;
  loading: boolean;
  source: WatchlistSource;
  pending: string[];
  has: (symbol: string) => boolean;
  isPending: (symbol: string) => boolean;
  toggle: (symbol: string, lang?: Lang) => Promise<ToggleResult>;
  refresh: () => void;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

/**
 * One cloud watchlist for the whole app.
 *
 * Favorites are applied optimistically before the Supabase request resolves,
 * so hearts respond instantly; failures roll the state back and surface a
 * toast. Anonymous visitors are routed to the auth dialog instead of writing.
 */
export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useSession();
  const { openAuthModal } = useAuthModal();
  const [snapshot, setSnapshot] = useState<WatchlistState | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [nonce, setNonce] = useState(0);

  const userKey = user?.id ?? user?.email ?? "";
  const current = useMemo(
    () => (user && snapshot?.key === userKey ? snapshot : null),
    [snapshot, user, userKey]
  );
  const entries = useMemo(() => current?.entries ?? [], [current]);
  const source = current?.source ?? "server";
  const loading = Boolean(ready && user && !current);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    const key = user.id ?? user.email ?? "user";

    loadWatchlist(user)
      .then((result) => {
        if (cancelled) return;
        setSnapshot({ key, entries: result.entries, source: result.source });
      })
      .catch(() => {
        if (cancelled) return;
        setSnapshot({ key, entries: [], source: "local" });
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, nonce]);

  const symbols = useMemo(() => entries.map((entry) => entry.symbol), [entries]);

  const has = useCallback(
    (symbol: string) => entries.some((entry) => entry.symbol === symbol),
    [entries]
  );

  const isPending = useCallback(
    (symbol: string) => pending.includes(symbol),
    [pending]
  );

  const toggle = useCallback(
    async (rawSymbol: string, lang?: Lang): Promise<ToggleResult> => {
      const symbol = normalizeSymbol(rawSymbol);
      if (!symbol) return { ok: false, reason: "error" };

      const t = dict[lang ?? resolveClientLang()].watchlist;

      if (!ready) return { ok: false, reason: "pending" };

      if (!user) {
        openAuthModal({ mode: "login", lang });
        return { ok: false, reason: "auth" };
      }

      if (pending.includes(symbol)) return { ok: false, reason: "pending" };

      const saved = entries.some((entry) => entry.symbol === symbol);
      const optimistic: WatchlistEntry = { symbol, createdAt: Date.now() };
      const key = user.id ?? user.email ?? "user";

      const update = (mutate: (list: WatchlistEntry[]) => WatchlistEntry[]) => {
        setSnapshot((currentState) => {
          const base: WatchlistState =
            currentState?.key === key
              ? currentState
              : { key, entries: [], source: "server" };
          return { ...base, entries: mutate(base.entries) };
        });
      };

      setPending((currentPending) => [...currentPending, symbol]);
      update((list) =>
        saved
          ? list.filter((entry) => entry.symbol !== symbol)
          : [...list, optimistic]
      );

      try {
        const persisted = await persistWatchlistChange(
          user,
          saved ? "remove" : "add",
          symbol
        );
        if (!persisted) throw new Error("watchlist write failed");

        showToast(saved ? t.removedToast(symbol) : t.savedToast(symbol));
        return { ok: true, saved: !saved };
      } catch {
        update((list) =>
          saved
            ? list.some((entry) => entry.symbol === symbol)
              ? list
              : [...list, optimistic]
            : list.filter((entry) => entry.symbol !== symbol)
        );
        showToast(t.errorToast);
        return { ok: false, reason: "error" };
      } finally {
        setPending((currentPending) =>
          currentPending.filter((item) => item !== symbol)
        );
      }
    },
    [entries, openAuthModal, pending, ready, user]
  );

  const refresh = useCallback(() => {
    setSnapshot(null);
    setNonce((value) => value + 1);
  }, []);

  const value = useMemo<WatchlistContextValue>(
    () => ({
      entries,
      symbols,
      count: symbols.length,
      loading,
      source,
      pending,
      has,
      isPending,
      toggle,
      refresh,
    }),
    [
      entries,
      symbols,
      loading,
      source,
      pending,
      has,
      isPending,
      toggle,
      refresh,
    ]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist(): WatchlistContextValue {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used inside <WatchlistProvider>");
  }
  return context;
}
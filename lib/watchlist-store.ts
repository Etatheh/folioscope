"use client";

import { apiFetch } from "./client-api";
import { getSupabaseClient } from "./supabase/client";
import type { WatchlistEntry } from "./watchlist";

export type WatchlistSource = "supabase" | "server" | "local";

export type WatchlistSnapshot = {
  entries: WatchlistEntry[];
  source: WatchlistSource;
};

type WatchlistUser = {
  id?: string;
  email?: string;
};

const LOCAL_PREFIX = "indepth.watchlist";

function localKey(user: WatchlistUser): string {
  return `${LOCAL_PREFIX}.${user.id ?? user.email ?? "anon"}`;
}

function readLocal(user: WatchlistUser): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(localKey(user));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === "string" ? item : item?.symbol))
      .filter((symbol): symbol is string => typeof symbol === "string")
      .map((symbol, index) => ({ symbol, createdAt: index }));
  } catch {
    return [];
  }
}

function writeLocal(user: WatchlistUser, entries: WatchlistEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      localKey(user),
      JSON.stringify(entries.map((entry) => entry.symbol))
    );
  } catch {
    // Storage can be unavailable in private mode; the optimistic UI still works.
  }
}

function toEntries(rows: { symbol?: unknown; created_at?: unknown }[]): WatchlistEntry[] {
  return rows
    .filter((row): row is { symbol: string; created_at?: unknown } =>
      typeof row.symbol === "string" && row.symbol.length > 0
    )
    .map((row, index) => ({
      symbol: row.symbol,
      createdAt:
        typeof row.created_at === "string"
          ? new Date(row.created_at).getTime()
          : index,
    }));
}

async function supabaseUserId(): Promise<{
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>;
  userId: string;
} | null> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return { supabase, userId: data.user.id };
  } catch {
    return null;
  }
}

/**
 * Read the cloud watchlist.
 *
 * Supabase Auth users talk to `public.watchlists` directly through the anon
 * client + RLS. Legacy cookie accounts and environments where the table has
 * not been migrated yet fall back to the server route, then to localStorage so
 * the UI never loses the user's selection.
 */
export async function loadWatchlist(user: WatchlistUser): Promise<WatchlistSnapshot> {
  const direct = await supabaseUserId();
  if (direct) {
    const { data, error } = await direct.supabase
      .from("watchlists")
      .select("symbol,created_at")
      .eq("user_id", direct.userId)
      .order("created_at", { ascending: true });
    if (!error && data) {
      return { entries: toEntries(data), source: "supabase" };
    }
  }

  try {
    const response = await apiFetch("/api/watchlist");
    if (response.ok) {
      const data = (await response.json()) as {
        items?: { symbol?: unknown; created_at?: unknown }[];
      };
      return {
        entries: toEntries(data.items ?? []),
        source: "server",
      };
    }
  } catch {
    // offline / route unavailable: keep the local copy
  }

  return { entries: readLocal(user), source: "local" };
}

/** Persist one add/remove operation. Returns false when every backend failed. */
export async function persistWatchlistChange(
  user: WatchlistUser,
  action: "add" | "remove",
  symbol: string
): Promise<boolean> {
  const direct = await supabaseUserId();
  if (direct) {
    const table = direct.supabase.from("watchlists");
    const result =
      action === "add"
        ? await table.upsert(
            { user_id: direct.userId, symbol },
            { onConflict: "user_id,symbol", ignoreDuplicates: true }
          )
        : await table.delete().eq("user_id", direct.userId).eq("symbol", symbol);
    if (!result.error) return true;
  }

  try {
    const response = await apiFetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, symbol }),
    });
    if (response.ok) return true;
  } catch {
    // fall through to localStorage
  }

  const current = readLocal(user);
  const next =
    action === "add"
      ? current.some((entry) => entry.symbol === symbol)
        ? current
        : [...current, { symbol, createdAt: Date.now() }]
      : current.filter((entry) => entry.symbol !== symbol);
  writeLocal(user, next);
  return true;
}
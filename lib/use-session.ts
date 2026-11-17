"use client";

import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";

import { getSession, type SessionUser } from "./auth";
import { getSupabaseClient } from "./supabase/client";

export type SessionMode = "local" | "server" | "supabase";

type ServerUser = {
  id?: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
  createdAt?: string;
  isAdmin?: boolean;
};

function adaptServer(user: ServerUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.nickname,
    plan: user.plan,
    createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
    isAdmin: user.isAdmin,
  };
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

/** Map a Supabase auth user (Google/Microsoft/email) onto the local shape. */
function adaptSupabase(user: User): SessionUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? "";
  const name =
    firstString(meta.full_name, meta.name, meta.user_name, email.split("@")[0]) ??
    email ??
    "User";
  const avatarUrl = firstString(meta.avatar_url, meta.picture);
  const provider = firstString(appMeta.provider);

  return {
    id: user.id,
    email,
    name,
    plan: meta.plan === "pro" ? "pro" : "free",
    createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
    isAdmin: appMeta.role === "admin" || meta.role === "admin" || meta.is_admin === true,
    avatarUrl,
    provider,
  };
}

type SessionSnapshot = {
  legacyUser: SessionUser | null;
  legacyReady: boolean;
  legacyMode: SessionMode;
  supabaseUser: SessionUser | null;
  supabaseReady: boolean;
};

const INITIAL: SessionSnapshot = {
  legacyUser: null,
  legacyReady: false,
  legacyMode: "local",
  supabaseUser: null,
  supabaseReady: false,
};

// A single app-wide session store. Many cards render an auth-aware button at
// once, and a per-hook fetch would otherwise hit /api/auth/me dozens of times.
let snapshot: SessionSnapshot = INITIAL;
let started = false;
const listeners = new Set<() => void>();

function patch(partial: Partial<SessionSnapshot>) {
  snapshot = { ...snapshot, ...partial };
  for (const listener of listeners) listener();
}

function startSessionStore() {
  if (started || typeof window === "undefined") return;
  started = true;

  const applyLocal = () => {
    patch({
      legacyUser: getSession(),
      legacyMode: "local",
      legacyReady: true,
    });
  };

  (async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.status === 503) {
        applyLocal();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { user: ServerUser };
        patch({
          legacyUser: adaptServer(data.user),
          legacyMode: "server",
          legacyReady: true,
        });
        return;
      }
      // 401 → server mode, anonymous
      patch({ legacyUser: null, legacyMode: "server", legacyReady: true });
    } catch {
      applyLocal();
    }
  })();

  window.addEventListener("gui-session-change", applyLocal);
  window.addEventListener("storage", applyLocal);

  // Live Supabase auth state: OAuth callbacks, email login and sign-out.
  (async () => {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      patch({ supabaseReady: true });
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      patch({
        supabaseUser: data.session?.user ? adaptSupabase(data.session.user) : null,
        supabaseReady: true,
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        patch({
          supabaseUser: session?.user ? adaptSupabase(session.user) : null,
          supabaseReady: true,
        });
      });
    } catch {
      patch({ supabaseReady: true });
    }
  })();
}

function subscribe(listener: () => void) {
  startSessionStore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Session hook with three backends:
 * - supabase: Google/Microsoft/email auth through supabase-js
 * - server mode: httpOnly cookie verified through /api/auth/me
 * - local mode: demo localStorage accounts (when Supabase is not configured)
 *
 * A Supabase session always wins; otherwise the legacy cookie/local session is
 * used so existing accounts keep working. All hook instances share one store.
 */
export function useSession() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => INITIAL);
  const user = state.supabaseUser ?? state.legacyUser;

  return {
    user,
    ready: state.legacyReady && state.supabaseReady,
    mode: (state.supabaseUser ? "supabase" : state.legacyMode) as SessionMode,
  };
}
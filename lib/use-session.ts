"use client";

import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";

import { getSession, type SessionUser } from "./auth";
import { getSupabaseClient } from "./supabase/client";

export type SessionMode = "local" | "server" | "supabase";

type ServerTier = "free" | "pro" | "admin";

type ServerUser = {
  id?: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
  tier?: ServerTier;
  createdAt?: string;
  isAdmin?: boolean;
};

/** Collapse plan + admin flags into the shared tier rule. */
function resolveTier(user: {
  plan?: "free" | "pro";
  tier?: ServerTier;
  isAdmin?: boolean;
}): ServerTier {
  if (user.tier === "admin" || user.isAdmin) return "admin";
  if (user.tier === "pro" || user.plan === "pro") return "pro";
  return "free";
}

function adaptServer(user: ServerUser): SessionUser {
  const tier = resolveTier(user);
  return {
    id: user.id,
    email: user.email,
    name: user.nickname,
    plan: tier === "free" ? "free" : "pro",
    tier,
    createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
    isAdmin: tier === "admin",
  };
}

/**
 * Keep the Supabase-shaped user but overwrite its plan/admin flags with the
 * authoritative server result. This is how an ADMIN_EMAILS developer gets the
 * ADMIN badge even before `profiles.tier` is read.
 */
function mergeServerAccess(user: SessionUser, server: ServerUser): SessionUser {
  const tier = resolveTier(server);
  return {
    ...user,
    plan: tier === "free" ? "free" : "pro",
    tier,
    isAdmin: tier === "admin",
  };
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

/** Map a Supabase auth user (Google/GitHub/email) onto the local shape. */
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
  const isAdmin =
    appMeta.role === "admin" || meta.role === "admin" || meta.is_admin === true;
  const tier: ServerTier = isAdmin ? "admin" : meta.plan === "pro" ? "pro" : "free";

  return {
    id: user.id,
    email,
    name,
    plan: tier === "free" ? "free" : "pro",
    tier,
    createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
    isAdmin: tier === "admin",
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

/**
 * Ask the server for the authoritative tier of a Supabase session. The server
 * owns ADMIN_EMAILS, so this is the only reliable way for the nav bar to show
 * ADMIN when the token itself carries no admin role.
 */
async function hydrateServerAccess(token: string) {
  try {
    const response = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { user?: ServerUser };
    const current = snapshot.supabaseUser;
    if (!data.user || !current || current.id !== data.user.id) return;
    patch({ supabaseUser: mergeServerAccess(current, data.user) });
  } catch {
    // Keep the token/session metadata as-is when the probe fails.
  }
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
      if (data.session?.access_token) {
        void hydrateServerAccess(data.session.access_token);
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        patch({
          supabaseUser: session?.user ? adaptSupabase(session.user) : null,
          supabaseReady: true,
        });
        if (session?.access_token) {
          void hydrateServerAccess(session.access_token);
        }
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
 * - supabase: Google/GitHub/email auth through supabase-js
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
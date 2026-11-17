"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { getSession, type SessionUser } from "./auth";
import { getSupabaseClient } from "./supabase/client";

export type SessionMode = "local" | "server" | "supabase";

type ServerUser = {
  email: string;
  nickname: string;
  plan: "free" | "pro";
  createdAt?: string;
  isAdmin?: boolean;
};

function adaptServer(user: ServerUser): SessionUser {
  return {
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
    email,
    name,
    plan: meta.plan === "pro" ? "pro" : "free",
    createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
    isAdmin: appMeta.role === "admin" || meta.role === "admin" || meta.is_admin === true,
    avatarUrl,
    provider,
  };
}

/**
 * Session hook with three backends:
 * - supabase: Google/Microsoft/email auth through supabase-js
 * - server mode: httpOnly cookie verified through /api/auth/me
 * - local mode: demo localStorage accounts (when Supabase is not configured)
 *
 * A Supabase session always wins; otherwise the legacy cookie/local session is
 * used so existing accounts keep working.
 */
export function useSession() {
  const [legacyUser, setLegacyUser] = useState<SessionUser | null>(null);
  const [legacyReady, setLegacyReady] = useState(false);
  const [legacyMode, setLegacyMode] = useState<SessionMode>("local");
  const [supabaseUser, setSupabaseUser] = useState<SessionUser | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applyLocal = () => {
      if (cancelled) return;
      setLegacyUser(getSession());
      setLegacyMode("local");
      setLegacyReady(true);
    };

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 503) {
          applyLocal();
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { user: ServerUser };
          setLegacyUser(adaptServer(data.user));
          setLegacyMode("server");
          setLegacyReady(true);
          return;
        }
        // 401 → server mode, anonymous
        setLegacyUser(null);
        setLegacyMode("server");
        setLegacyReady(true);
      } catch {
        applyLocal();
      }
    })();

    const onLocalChange = () => applyLocal();
    window.addEventListener("gui-session-change", onLocalChange);
    window.addEventListener("storage", onLocalChange);
    return () => {
      cancelled = true;
      window.removeEventListener("gui-session-change", onLocalChange);
      window.removeEventListener("storage", onLocalChange);
    };
  }, []);

  // Live Supabase auth state: OAuth callbacks, email login and sign-out.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const supabase = await getSupabaseClient();
      if (cancelled) return;
      if (!supabase) {
        setSupabaseReady(true);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setSupabaseUser(data.session?.user ? adaptSupabase(data.session.user) : null);
        setSupabaseReady(true);

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (cancelled) return;
          setSupabaseUser(session?.user ? adaptSupabase(session.user) : null);
          setSupabaseReady(true);
        });
        unsubscribe = () => listener.subscription.unsubscribe();
      } catch {
        if (!cancelled) setSupabaseReady(true);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const user = supabaseUser ?? legacyUser;

  return {
    user,
    ready: legacyReady && supabaseReady,
    mode: (supabaseUser ? "supabase" : legacyMode) as SessionMode,
  };
}
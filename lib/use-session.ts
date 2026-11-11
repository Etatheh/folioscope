"use client";

import { useEffect, useState } from "react";
import { getSession, type SessionUser } from "./auth";

export type SessionMode = "local" | "server";

type ServerUser = {
  email: string;
  nickname: string;
  plan: "free" | "pro";
  createdAt?: string;
};

function adapt(user: ServerUser): SessionUser {
  return {
    email: user.email,
    name: user.nickname,
    plan: user.plan,
    createdAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
  };
}

/**
 * Session hook with two backends:
 * - server mode: httpOnly cookie verified through /api/auth/me
 * - local mode: demo localStorage accounts (when Supabase is not configured)
 */
export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<SessionMode>("local");

  useEffect(() => {
    let cancelled = false;

    const applyLocal = () => {
      if (cancelled) return;
      setUser(getSession());
      setMode("local");
      setReady(true);
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
          setUser(adapt(data.user));
          setMode("server");
          setReady(true);
          return;
        }
        // 401 → server mode, anonymous
        setUser(null);
        setMode("server");
        setReady(true);
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

  return { user, ready, mode };
}

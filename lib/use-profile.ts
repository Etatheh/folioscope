"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseClient } from "./supabase/client";
import { useSession } from "./use-session";

export type ProfileTier = "free" | "pro" | "admin";

export type ViewerProfile = {
  tier: ProfileTier;
};

type CloudTier = { key: string; tier: ProfileTier };

/**
 * Resolve the viewer's *profile tier*.
 *
 * The session is the instant source of truth (cookie accounts and Supabase
 * OAuth both expose plan/isAdmin). When a Supabase session exists we also read
 * `profiles.tier`, which is the same field the account dialog uses.
 */
export function useProfile() {
  const { user, ready } = useSession();
  const [cloud, setCloud] = useState<CloudTier | null>(null);
  const userKey = user?.id ?? user?.email ?? "";

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const supabase = await getSupabaseClient();
        if (!supabase || !user.id) return;
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user || auth.user.id !== user.id) return;

        const { data } = await supabase
          .from("profiles")
          .select("tier")
          .eq("id", auth.user.id)
          .maybeSingle();

        const tier = data?.tier;
        if (
          !cancelled &&
          (tier === "free" || tier === "pro" || tier === "admin")
        ) {
          setCloud({ key: userKey, tier });
        }
      } catch {
        // profiles table unavailable: the session plan is enough
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user, userKey]);

  const profile = useMemo<ViewerProfile | null>(() => {
    if (!user) return null;
    const sessionTier: ProfileTier = user.isAdmin
      ? "admin"
      : user.plan === "pro"
        ? "pro"
        : "free";
    const cloudTier = cloud?.key === userKey ? cloud.tier : null;
    return { tier: cloudTier ?? sessionTier };
  }, [cloud, user, userKey]);

  // Mirrors the product rule: paid Pro and developer/admin accounts unlock all.
  const isPro = profile?.tier === "pro" || profile?.tier === "admin";

  return {
    user,
    ready,
    profile,
    isPro,
  };
}
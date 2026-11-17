"use client";

import { useEffect, useMemo, useState } from "react";

import {
  highestTier,
  isAdminTier,
  isProTier,
  tierToViewerPlan,
  type ViewerPlan,
} from "./access";
import { getSupabaseClient } from "./supabase/client";
import { useSession } from "./use-session";

export type ProfileTier = "free" | "pro" | "admin";

const PLAN_RANK: Record<ViewerPlan, number> = {
  anon: 0,
  free: 1,
  pro: 2,
  admin: 3,
};

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
    const sessionTier: ProfileTier =
      user.tier ??
      (user.isAdmin ? "admin" : user.plan === "pro" ? "pro" : "free");
    const cloudTier = cloud?.key === userKey ? cloud.tier : null;
    // Never let a stale `profiles.tier` downgrade a session-level admin/Pro.
    return { tier: highestTier(sessionTier, cloudTier) };
  }, [cloud, user, userKey]);

  // Single paid-access rule shared with the API routes.
  const isPro = isProTier(profile?.tier);
  const isAdmin = isAdminTier(profile?.tier);

  return {
    user,
    ready,
    profile,
    isPro,
    isAdmin,
  };
}

/**
 * Live viewer plan for client components that also receive a server-rendered
 * plan. The highest of the two wins, so Supabase Pro/Admin sessions unlock the
 * dashboard even when the server only sees an anonymous cookie.
 */
export function useViewerPlan(fallback: ViewerPlan): ViewerPlan {
  const { user, ready, profile } = useProfile();
  if (!ready || !user) return fallback;
  const live = tierToViewerPlan(profile?.tier);
  return PLAN_RANK[live] > PLAN_RANK[fallback] ? live : fallback;
}
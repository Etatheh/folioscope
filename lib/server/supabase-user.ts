import type { User } from "@supabase/supabase-js";

import { highestTier, isProTier } from "@/lib/access";
import { isAdminEmail, type AuthUser } from "./auth-service";
import { readSupabaseEnv } from "./env";
import { pgSelect } from "./rest";

async function loadProfileTier(userId: string): Promise<string | null> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) return null;

  try {
    const rows = await pgSelect<{ tier: string }>(
      env,
      "profiles",
      `id=eq.${encodeURIComponent(userId)}&select=tier`
    );
    return rows[0]?.tier ?? null;
  } catch {
    // profiles is optional; auth metadata remains the fallback.
    return null;
  }
}

/**
 * Convert a Supabase auth user into the app's `AuthUser` shape.
 *
 * The tier is the strongest of:
 *   1. ADMIN_EMAILS / app_metadata admin flags
 *   2. auth metadata plan
 *   3. `profiles.tier`
 * so the navbar, Account Settings and API routes all agree.
 */
export async function authUserFromSupabaseUser(user: User): Promise<AuthUser> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? "";

  const admin =
    (email ? isAdminEmail(email) : false) ||
    appMeta.role === "admin" ||
    meta.role === "admin" ||
    meta.is_admin === true;
  const pro = meta.plan === "pro" || appMeta.plan === "pro";
  const baseTier = admin ? "admin" : pro ? "pro" : "free";
  const profileTier = await loadProfileTier(user.id);
  const tier = highestTier(baseTier, profileTier);

  const nickname =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    email.split("@")[0] ||
    "User";

  return {
    id: user.id,
    email,
    nickname,
    plan: isProTier(tier) ? "pro" : "free",
    tier,
    createdAt: user.created_at ?? new Date().toISOString(),
    isAdmin: tier === "admin",
  };
}
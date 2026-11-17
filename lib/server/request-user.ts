import { cookies } from "next/headers";

import { highestTier, isProTier } from "@/lib/access";
import { getSessionUser, type AuthUser } from "./auth-service";
import { COOKIE_NAME } from "./auth";
import { readSupabaseEnv } from "./env";
import { pgSelect } from "./rest";

function isAdminEmail(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return false;
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  ).has(email.toLowerCase());
}

/** Verify a Supabase access token sent by the browser client. */
async function getBearerUser(
  request: Request
): Promise<{ user: AuthUser; token: string } | null> {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const env = readSupabaseEnv();
  if (!env) return null;

  try {
    const response = await fetch(`${env.url}/auth/v1/user`, {
      headers: {
        apikey: env.publicKey,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      id?: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
      app_metadata?: Record<string, unknown>;
    };
    if (!data.id || !data.email) return null;

    const meta = data.user_metadata ?? {};
    const appMeta = data.app_metadata ?? {};
    const admin =
      isAdminEmail(data.email) ||
      appMeta.role === "admin" ||
      meta.role === "admin" ||
      meta.is_admin === true;
    const pro = meta.plan === "pro" || appMeta.plan === "pro";
    const nickname =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      data.email.split("@")[0] ||
      "User";
    const baseTier = admin ? "admin" : pro ? "pro" : "free";

    // `profiles.tier` is the paid tier shown by Account Settings. Merge it with
    // the auth metadata so API routes see exactly the same tier as the UI.
    let profileTier: string | null = null;
    if (env?.secretKey) {
      try {
        const rows = await pgSelect<{ tier: string }>(
          env,
          "profiles",
          `id=eq.${encodeURIComponent(data.id)}&select=tier`
        );
        profileTier = rows[0]?.tier ?? null;
      } catch {
        // profiles is optional; auth metadata remains the fallback.
      }
    }

    const tier = highestTier(baseTier, profileTier);
    const isAdmin = tier === "admin";

    return {
      user: {
        id: data.id,
        email: data.email,
        nickname,
        plan: isProTier(tier) ? "pro" : "free",
        tier,
        createdAt: new Date().toISOString(),
        isAdmin,
      },
      token,
    };
  } catch {
    return null;
  }
}

/** Cookie session fallback for the existing email/password accounts. */
async function getCookieUser(): Promise<AuthUser | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await getSessionUser(token);
  } catch {
    return null;
  }
}

export type RequestSession = {
  user: AuthUser;
  source: "supabase" | "cookie";
  /** Supabase access token, when authenticated through Bearer. */
  token?: string;
};

/** Supabase bearer token first, then the legacy cookie session. */
export async function resolveRequestUser(
  request: Request
): Promise<RequestSession | null> {
  const bearer = await getBearerUser(request);
  if (bearer) {
    return { user: bearer.user, source: "supabase", token: bearer.token };
  }
  const cookieUser = await getCookieUser();
  if (cookieUser) return { user: cookieUser, source: "cookie" };
  return null;
}
import { cookies } from "next/headers";

import { getSessionUser, type AuthUser } from "./auth-service";
import { COOKIE_NAME } from "./auth";
import { readSupabaseEnv } from "./env";

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
    };
    if (!data.id || !data.email) return null;

    const meta = data.user_metadata ?? {};
    const admin = isAdminEmail(data.email);
    const pro = meta.plan === "pro";
    const nickname =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      data.email.split("@")[0] ||
      "User";

    return {
      user: {
        id: data.id,
        email: data.email,
        nickname,
        plan: admin || pro ? "pro" : "free",
        createdAt: new Date().toISOString(),
        isAdmin: admin,
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
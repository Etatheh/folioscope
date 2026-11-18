import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser, type AuthUser } from "./auth-service";
import { COOKIE_NAME } from "./auth";
import { readSupabaseEnv } from "./env";
import { authUserFromSupabaseUser } from "./supabase-user";

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

    const data = (await response.json()) as User;
    if (!data.id || !data.email) return null;

    return { user: await authUserFromSupabaseUser(data), token };
  } catch {
    return null;
  }
}

/** Supabase SSR cookies written by the browser client or /auth/callback. */
async function getSupabaseCookieUser(): Promise<AuthUser | null> {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return null;
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return await authUserFromSupabaseUser(user);
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

/** Supabase bearer token first, then Supabase SSR cookies, then legacy cookie. */
export async function resolveRequestUser(
  request: Request
): Promise<RequestSession | null> {
  const bearer = await getBearerUser(request);
  if (bearer) {
    return { user: bearer.user, source: "supabase", token: bearer.token };
  }

  const supabaseCookieUser = await getSupabaseCookieUser();
  if (supabaseCookieUser) {
    return { user: supabaseCookieUser, source: "supabase" };
  }

  const cookieUser = await getCookieUser();
  if (cookieUser) return { user: cookieUser, source: "cookie" };
  return null;
}
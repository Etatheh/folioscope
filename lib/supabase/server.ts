import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { readSupabaseEnv } from "@/lib/server/env";

/**
 * Supabase client for Route Handlers and Server Components.
 *
 * Reads the auth cookies written by `createBrowserClient()` (or by
 * `/auth/callback`) so a browser login is visible to every server request.
 * A fresh client must be created for each request.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  const env = readSupabaseEnv();
  if (!env) return null;

  const cookieStore = await cookies();

  return createServerClient(env.url, env.publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot write cookies; the proxy refreshes them.
        }
      },
    },
  });
}

/** Current Supabase user from SSR cookies, or null when signed out. */
export async function getSupabaseServerUser(): Promise<User | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}
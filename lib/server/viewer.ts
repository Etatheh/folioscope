import { cookies } from "next/headers";

import { getSupabaseServerUser } from "@/lib/supabase/server";
import { COOKIE_NAME } from "./auth";
import { getSessionUser, type AuthUser } from "./auth-service";
import { authUserFromSupabaseUser } from "./supabase-user";
import { localAdminUser } from "./local-admin";

/**
 * Resolve the viewer inside Server Components.
 *
 * Prefers the Supabase SSR cookie session, then the legacy httpOnly cookie.
 * This is what keeps `/dashboard` from rendering an anonymous plan right after
 * a Supabase login.
 */
export async function getServerViewer(): Promise<AuthUser | null> {
  const local = localAdminUser((await cookies()).get(COOKIE_NAME)?.value);
  if (local) return local;
  try {
    const supabaseUser = await getSupabaseServerUser();
    if (supabaseUser) return await authUserFromSupabaseUser(supabaseUser);
  } catch {
    // Fall through to the legacy cookie session.
  }

  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await getSessionUser(token);
  } catch {
    return null;
  }
}

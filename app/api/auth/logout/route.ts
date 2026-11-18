import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logoutBySession } from "@/lib/server/auth-service";
import { COOKIE_NAME } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST() {
  // Clear the Supabase SSR auth cookies as well as the legacy session.
  try {
    const supabase = await getSupabaseServerClient();
    if (supabase) await supabase.auth.signOut();
  } catch (error) {
    console.error("[auth/logout] supabase", error);
  }

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      await logoutBySession(token);
    } catch (error) {
      console.error("[auth/logout]", error);
    }
  }
  store.delete(COOKIE_NAME);
  return Response.json({ ok: true });
}

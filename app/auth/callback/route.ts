import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

/**
 * OAuth / PKCE callback.
 *
 * Supabase redirects here with a one-time `code`. Exchanging it server-side
 * writes the session into cookies, so the next request (dashboard) is already
 * authenticated on the server.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback", url.origin)
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL("/login?error=auth_not_configured", url.origin)
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback]", error.message);
    return NextResponse.redirect(
      new URL("/login?error=auth_callback", url.origin)
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
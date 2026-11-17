"use client";

import { getSupabaseClient } from "./supabase/client";

/**
 * fetch() that forwards the Supabase access token when one exists.
 *
 * The legacy cookie session is sent automatically, so the same API routes work
 * for Supabase OAuth users and for the older email/password accounts.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  let token: string | undefined;
  try {
    const supabase = await getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    }
  } catch {
    token = undefined;
  }

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });
}
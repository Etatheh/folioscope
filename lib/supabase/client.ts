"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type PublicConfig = { url: string; key: string };

let clientPromise: Promise<SupabaseClient | null> | null = null;

function envConfig(): PublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

async function fetchConfig(): Promise<PublicConfig | null> {
  const fromEnv = envConfig();
  if (fromEnv) return fromEnv;

  try {
    const response = await fetch("/api/auth/config", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      configured?: boolean;
      url?: string;
      key?: string;
    };
    if (!data.configured || !data.url || !data.key) return null;
    return { url: data.url.replace(/\/+$/, ""), key: data.key };
  } catch {
    return null;
  }
}

/**
 * Lazily create a single browser Supabase client.
 *
 * `createBrowserClient` from `@supabase/ssr` persists the auth session in
 * cookies (not localStorage), so the proxy, Server Components and Route
 * Handlers see the same login. Returns `null` when the backend is not
 * configured, so every caller can fall back to the legacy cookie/local path.
 */
export function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!clientPromise) {
    clientPromise = fetchConfig()
      .then((config) => {
        if (!config) return null;
        return createBrowserClient(config.url, config.key);
      })
      .catch(() => null);
  }
  return clientPromise;
}

/** Sign out of Supabase if a session exists. Resolves `false` when unavailable. */
export async function signOutOfSupabase(): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;
    await supabase.auth.signOut();
    return true;
  } catch {
    return false;
  }
}
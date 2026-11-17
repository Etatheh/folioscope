// Minimal PostgREST client (zero dependencies, uses fetch).
// Tables are accessed with the service-role key, so RLS is bypassed server-side.

import type { SupabaseEnv } from "./env";
import { restKey } from "./env";

export class RestError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(
  env: SupabaseEnv,
  path: string,
  init?: RequestInit
): Promise<T> {
  const key = restKey(env);
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  // 写入类请求需要返回受影响的行（PostgREST 默认不返回）
  if (init?.method === "POST" || init?.method === "PATCH") {
    headers.Prefer = "return=representation";
  }
  const response = await fetch(`${env.url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    let code: string | undefined;
    try {
      const parsed = JSON.parse(text) as { message?: string; code?: string };
      message = parsed.message ?? text;
      code = parsed.code;
    } catch {
      // keep raw text
    }
    throw new RestError(response.status, code, message);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

export function pgSelect<T>(env: SupabaseEnv, table: string, query: string): Promise<T[]> {
  return request<T[]>(env, `${table}?${query}`, { method: "GET" });
}

export function pgInsert<T>(env: SupabaseEnv, table: string, row: object): Promise<T[]> {
  return request<T[]>(env, table, { method: "POST", body: JSON.stringify(row) });
}

/** Insert or replace a row using a unique column (PostgREST upsert). */
export function pgUpsert<T>(
  env: SupabaseEnv,
  table: string,
  row: object,
  onConflict: string
): Promise<T[]> {
  return request<T[]>(
    env,
    `${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      body: JSON.stringify(row),
      headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    }
  );
}

export function pgUpdate<T>(env: SupabaseEnv, table: string, query: string, patch: object): Promise<T[]> {
  return request<T[]>(env, `${table}?${query}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function pgDelete(env: SupabaseEnv, table: string, query: string): Promise<void> {
  return request<void>(env, `${table}?${query}`, { method: "DELETE" });
}

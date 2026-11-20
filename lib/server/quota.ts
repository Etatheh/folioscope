import { PLANS_CONFIG } from "@/config/plans";

// Server-side daily quota for the AI assistant.
// Storage: Supabase when configured (needed on serverless deployments),
// local SQLite in development without Supabase.

import { pgInsert, pgSelect, pgUpdate } from "./rest";
import { readSupabaseEnv } from "./env";
import { getDb } from "./db";

export const DAILY_LIMITS = {
  free: PLANS_CONFIG.free.limits.aiQuestionsPerDay,
  pro: PLANS_CONFIG.pro.limits.aiQuestionsPerDay,
} as const;

export type Usage = { used: number; limit: number; remaining: number };

function allowLocalFallback(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function localUsage(userId: string, date: string): number {
  const row = getDb()
    .prepare("select count from usage_daily where user_id = ? and date = ?")
    .get(userId, date) as { count: number } | undefined;
  return row?.count ?? 0;
}

function localIncrement(userId: string, date: string): number {
  const db = getDb();
  db.prepare(
    `insert into usage_daily (user_id, date, count) values (?, ?, 1)
     on conflict (user_id, date) do update set count = count + 1`
  ).run(userId, date);
  return localUsage(userId, date);
}

async function supabaseUsage(userId: string, date: string): Promise<number> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) throw new Error("supabase not configured");
  const rows = await pgSelect<{ count: number }>(
    env,
    "usage_daily",
    `user_id=eq.${userId}&date=eq.${date}&select=count`
  );
  return rows[0]?.count ?? 0;
}

async function supabaseIncrement(
  userId: string,
  date: string,
  current: number
): Promise<number> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) throw new Error("supabase not configured");
  if (current === 0) {
    const rows = await pgInsert<{ count: number }>(env, "usage_daily", {
      user_id: userId,
      date,
      count: 1,
    });
    return rows[0]?.count ?? 1;
  }
  const rows = await pgUpdate<{ count: number }>(
    env,
    "usage_daily",
    `user_id=eq.${userId}&date=eq.${date}`,
    { count: current + 1 }
  );
  return rows[0]?.count ?? current + 1;
}

export async function getUsage(userId: string, plan: "free" | "pro"): Promise<Usage> {
  const date = todayKey();
  const env = readSupabaseEnv();
  let used = 0;
  if (env?.secretKey) {
    try {
      used = await supabaseUsage(userId, date);
    } catch {
      if (!allowLocalFallback()) throw new Error("usage store unavailable");
      used = localUsage(userId, date);
    }
  } else {
    if (!allowLocalFallback()) throw new Error("usage store unavailable");
    used = localUsage(userId, date);
  }
  const limit = DAILY_LIMITS[plan];
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export async function incrementUsage(userId: string): Promise<number> {
  const date = todayKey();
  const env = readSupabaseEnv();
  if (env?.secretKey) {
    try {
      const current = await supabaseUsage(userId, date);
      return await supabaseIncrement(userId, date, current);
    } catch {
      if (!allowLocalFallback()) throw new Error("usage store unavailable");
      return localIncrement(userId, date);
    }
  }
  if (!allowLocalFallback()) throw new Error("usage store unavailable");
  return localIncrement(userId, date);
}

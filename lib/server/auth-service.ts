// Auth service with two backends:
// 1. Supabase Postgres via PostgREST (preferred when SUPABASE_URL + secret key set)
// 2. Local SQLite (automatic fallback: tables auto-created, zero configuration)

import { randomUUID } from "node:crypto";

import { readSupabaseEnv } from "./env";
import { pgDelete, pgInsert, pgSelect, pgUpdate, RestError } from "./rest";
import { SESSION_TTL_MS, hashPassword, hashToken, issueToken, verifyPassword } from "./auth";
import {
  dbDeleteExpiredSessions,
  dbDeleteSession,
  dbFindSessionUserId,
  dbFindUserByEmail,
  dbFindUserById,
  dbInsertSession,
  dbInsertUser,
  dbUpdatePlan,
} from "./db";

export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
  createdAt: string;
};

export type AuthSuccess = { ok: true; user: AuthUser; token: string };
export type AuthFailure = { ok: false; status: number; error: string };

type Lang = "zh" | "en";

function msg(lang: Lang, zh: string, en: string): string {
  return lang === "zh" ? zh : en;
}

type UserRow = {
  id: string;
  email: string;
  nickname: string;
  plan: string;
  created_at: string;
};

function userFromRow(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    plan: row.plan === "pro" ? "pro" : "free",
    createdAt: row.created_at,
  };
}

function isMissingTable(error: unknown): boolean {
  return error instanceof RestError && error.code === "PGRST205";
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError; // fetch network failure
}

/** SQLite fallback is a dev convenience only (serverless has no durable FS). */
function allowLocalFallback(): boolean {
  return process.env.NODE_ENV !== "production";
}

// ---------------------------------------------------------------------------
// Supabase (PostgREST) implementation
// ---------------------------------------------------------------------------

async function restRegister(
  email: string,
  password: string,
  nickname: string,
  lang: Lang
): Promise<AuthSuccess | AuthFailure> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) throw new Error("supabase not configured");

  const existing = await pgSelect<{ id: string }>(
    env,
    "users",
    `email=eq.${encodeURIComponent(email)}&select=id`
  );
  if (existing.length > 0) {
    return {
      ok: false,
      status: 409,
      error: msg(lang, "该邮箱已注册，请直接登录", "This email is already registered — please log in"),
    };
  }

  const rows = await pgInsert<UserRow>(env, "users", {
    email,
    password_hash: hashPassword(password),
    nickname,
  });
  const user = rows[0];
  if (!user) throw new Error("users insert returned no rows");

  const token = issueToken();
  await pgInsert(env, "sessions", {
    token: hashToken(token),
    user_id: user.id,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  return { ok: true, user: userFromRow(user), token };
}

async function restLogin(
  email: string,
  password: string,
  lang: Lang
): Promise<AuthSuccess | AuthFailure> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) throw new Error("supabase not configured");

  const rows = await pgSelect<UserRow & { password_hash: string }>(
    env,
    "users",
    `email=eq.${encodeURIComponent(email)}&select=id,email,nickname,plan,created_at,password_hash`
  );
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return {
      ok: false,
      status: 401,
      error: msg(lang, "邮箱或密码错误", "Incorrect email or password"),
    };
  }

  const token = issueToken();
  await pgInsert(env, "sessions", {
    token: hashToken(token),
    user_id: user.id,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  return { ok: true, user: userFromRow(user), token };
}

async function restSessionUser(token: string): Promise<AuthUser | null> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) throw new Error("supabase not configured");

  const nowIso = new Date().toISOString();
  const sessions = await pgSelect<{ user_id: string }>(
    env,
    "sessions",
    `token=eq.${hashToken(token)}&expires_at=gt.${encodeURIComponent(nowIso)}&select=user_id`
  );
  const session = sessions[0];
  if (!session) return null;

  const users = await pgSelect<UserRow>(
    env,
    "users",
    `id=eq.${session.user_id}&select=id,email,nickname,plan,created_at`
  );
  return users[0] ? userFromRow(users[0]) : null;
}

async function restUpgrade(token: string): Promise<AuthUser | null> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) throw new Error("supabase not configured");

  const nowIso = new Date().toISOString();
  const sessions = await pgSelect<{ user_id: string }>(
    env,
    "sessions",
    `token=eq.${hashToken(token)}&expires_at=gt.${encodeURIComponent(nowIso)}&select=user_id`
  );
  const session = sessions[0];
  if (!session) return null;

  const rows = await pgUpdate<UserRow>(env, "users", `id=eq.${session.user_id}`, {
    plan: "pro",
  });
  if (rows[0]) return userFromRow(rows[0]);
  // 兜底：若 PATCH 未返回行，重新查询一次
  const fresh = await pgSelect<UserRow>(
    env,
    "users",
    `id=eq.${session.user_id}&select=id,email,nickname,plan,created_at`
  );
  return fresh[0] ? userFromRow(fresh[0]) : null;
}

// ---------------------------------------------------------------------------
// Local SQLite implementation
// ---------------------------------------------------------------------------

function localRegister(
  email: string,
  password: string,
  nickname: string,
  lang: Lang
): AuthSuccess | AuthFailure {
  if (dbFindUserByEmail(email)) {
    return {
      ok: false,
      status: 409,
      error: msg(lang, "该邮箱已注册，请直接登录", "This email is already registered — please log in"),
    };
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  try {
    dbInsertUser({
      id,
      email,
      password_hash: hashPassword(password),
      nickname,
      plan: "free",
      created_at: now,
    });
  } catch {
    return {
      ok: false,
      status: 409,
      error: msg(lang, "该邮箱已注册，请直接登录", "This email is already registered — please log in"),
    };
  }

  const token = issueToken();
  dbInsertSession(
    randomUUID(),
    hashToken(token),
    id,
    new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    now
  );
  return {
    ok: true,
    user: { id, email, nickname, plan: "free", createdAt: now },
    token,
  };
}

function localLogin(email: string, password: string, lang: Lang): AuthSuccess | AuthFailure {
  const row = dbFindUserByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return {
      ok: false,
      status: 401,
      error: msg(lang, "邮箱或密码错误", "Incorrect email or password"),
    };
  }
  const now = new Date().toISOString();
  dbDeleteExpiredSessions(now);
  const token = issueToken();
  dbInsertSession(
    randomUUID(),
    hashToken(token),
    row.id,
    new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    now
  );
  return { ok: true, user: userFromRow(row), token };
}

function localSessionUser(token: string): AuthUser | null {
  const userId = dbFindSessionUserId(hashToken(token), new Date().toISOString());
  if (!userId) return null;
  const user = dbFindUserById(userId);
  return user ? userFromRow(user) : null;
}

function localUpgrade(token: string): AuthUser | null {
  const userId = dbFindSessionUserId(hashToken(token), new Date().toISOString());
  if (!userId) return null;
  const updated = dbUpdatePlan(userId, "pro");
  return updated ? userFromRow(updated) : null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function registerAccount(
  email: string,
  password: string,
  nickname: string,
  lang: Lang = "en"
): Promise<AuthSuccess | AuthFailure> {
  const env = readSupabaseEnv();
  if (env?.secretKey) {
    try {
      return await restRegister(email, password, nickname, lang);
    } catch (error) {
      if ((isMissingTable(error) || isNetworkError(error)) && allowLocalFallback()) {
        return localRegister(email, password, nickname, lang);
      }
      throw error;
    }
  }
  if (!allowLocalFallback()) throw new Error("Supabase is required in production");
  return localRegister(email, password, nickname, lang);
}

export async function loginAccount(
  email: string,
  password: string,
  lang: Lang = "en"
): Promise<AuthSuccess | AuthFailure> {
  const env = readSupabaseEnv();
  if (env?.secretKey) {
    try {
      return await restLogin(email, password, lang);
    } catch (error) {
      if ((isMissingTable(error) || isNetworkError(error)) && allowLocalFallback()) {
        return localLogin(email, password, lang);
      }
      throw error;
    }
  }
  if (!allowLocalFallback()) throw new Error("Supabase is required in production");
  return localLogin(email, password, lang);
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
  const env = readSupabaseEnv();
  if (env?.secretKey) {
    try {
      return await restSessionUser(token);
    } catch (error) {
      if ((isMissingTable(error) || isNetworkError(error)) && allowLocalFallback()) {
        return localSessionUser(token);
      }
      return null;
    }
  }
  if (!allowLocalFallback()) return null;
  return localSessionUser(token);
}

export async function upgradeBySession(token: string): Promise<AuthUser | null> {
  const env = readSupabaseEnv();
  if (env?.secretKey) {
    try {
      return await restUpgrade(token);
    } catch (error) {
      if ((isMissingTable(error) || isNetworkError(error)) && allowLocalFallback()) {
        return localUpgrade(token);
      }
      return null;
    }
  }
  if (!allowLocalFallback()) return null;
  return localUpgrade(token);
}

/**
 * Applies a billing result (Lemon Squeezy webhook) to the account owning
 * `email`. Returns the updated user, or null when no account matches — the
 * webhook then reports `upgraded: false` instead of failing the delivery.
 */
export async function setPlanByEmail(
  email: string,
  plan: "free" | "pro"
): Promise<AuthUser | null> {
  const candidates = [...new Set([email.trim(), email.trim().toLowerCase()])].filter(Boolean);
  if (candidates.length === 0) return null;

  const env = readSupabaseEnv();
  if (env?.secretKey) {
    try {
      for (const candidate of candidates) {
        const filter = `email=eq.${encodeURIComponent(candidate)}`;
        const rows = await pgUpdate<UserRow>(env, "users", filter, { plan });
        if (rows[0]) return userFromRow(rows[0]);
        const fresh = await pgSelect<UserRow>(
          env,
          "users",
          `${filter}&select=id,email,nickname,plan,created_at`
        );
        if (fresh[0]) return userFromRow(fresh[0]);
      }
      return null;
    } catch (error) {
      if (!((isMissingTable(error) || isNetworkError(error)) && allowLocalFallback())) {
        return null;
      }
    }
  }

  if (!allowLocalFallback()) return null;
  for (const candidate of candidates) {
    const row = dbFindUserByEmail(candidate);
    if (!row) continue;
    const updated = dbUpdatePlan(row.id, plan);
    return updated ? userFromRow(updated) : null;
  }
  return null;
}

export async function logoutBySession(token: string): Promise<void> {
  const env = readSupabaseEnv();
  if (env?.secretKey) {
    try {
      const nowIso = new Date().toISOString();
      await pgDelete(env, "sessions", `token=eq.${hashToken(token)}&expires_at=gt.${encodeURIComponent(nowIso)}`);
    } catch {
      // ignore: local delete below still runs
    }
  }
  dbDeleteSession(hashToken(token));
}

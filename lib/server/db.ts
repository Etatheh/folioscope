import fs from "node:fs";
import path from "node:path";

// Local SQLite store (built-in node:sqlite).
// Loaded lazily: production (serverless) deployments never touch SQLite, and
// older Node runtimes that lack node:sqlite simply won't reach this code.

export type DbUser = {
  id: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
  created_at: string;
};

// Minimal structural typing for the built-in module (see types/node-sqlite.d.ts)
type SqliteModule = typeof import("node:sqlite");

let sqlite: SqliteModule | null = null;
let db: import("node:sqlite").DatabaseSync | null = null;

/**
 * Resolves node:sqlite through process.getBuiltinModule instead of require().
 * The bundler rewrites require() inside server bundles (it fails with
 * "Unsupported external type Url for commonjs reference"), while
 * getBuiltinModule is a plain runtime lookup and needs no resolution.
 */
function loadSqlite(): SqliteModule {
  if (!sqlite) {
    const getBuiltinModule = (
      process as unknown as { getBuiltinModule?: (id: string) => unknown }
    ).getBuiltinModule;
    const builtin = getBuiltinModule?.("node:sqlite") as SqliteModule | undefined;
    if (!builtin) {
      throw new Error("node:sqlite is not available in this Node runtime");
    }
    sqlite = builtin;
  }
  return sqlite;
}

export function getDb(): import("node:sqlite").DatabaseSync {
  if (db) return db;
  const { DatabaseSync } = loadSqlite();
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(path.join(dir, "app.db"));
  db.exec(`
    create table if not exists users (
      id text primary key,
      email text not null unique,
      password_hash text not null,
      nickname text not null,
      plan text not null default 'free' check (plan in ('free', 'pro')),
      created_at text not null
    );
    create table if not exists sessions (
      id text primary key,
      token text not null unique,
      user_id text not null references users (id) on delete cascade,
      expires_at text not null,
      created_at text not null
    );
    create index if not exists sessions_user_idx on sessions (user_id);
    create index if not exists sessions_token_idx on sessions (token);
    create table if not exists usage_daily (
      user_id text not null,
      date text not null,
      count integer not null default 0,
      primary key (user_id, date)
    );
  `);
  return db;
}

export function dbFindUserByEmail(
  email: string
): (DbUser & { password_hash: string }) | undefined {
  const row = getDb()
    .prepare(
      "select id, email, nickname, plan, created_at, password_hash from users where email = ?"
    )
    .get(email) as (DbUser & { password_hash: string }) | undefined;
  return row;
}

export function dbInsertUser(user: DbUser & { password_hash: string }) {
  getDb()
    .prepare(
      "insert into users (id, email, password_hash, nickname, plan, created_at) values (?, ?, ?, ?, ?, ?)"
    )
    .run(user.id, user.email, user.password_hash, user.nickname, user.plan, user.created_at);
}

export function dbFindUserById(id: string): DbUser | undefined {
  return getDb()
    .prepare("select id, email, nickname, plan, created_at from users where id = ?")
    .get(id) as DbUser | undefined;
}

export function dbInsertSession(
  id: string,
  tokenHash: string,
  userId: string,
  expiresAt: string,
  createdAt: string
) {
  getDb()
    .prepare("insert into sessions (id, token, user_id, expires_at, created_at) values (?, ?, ?, ?, ?)")
    .run(id, tokenHash, userId, expiresAt, createdAt);
}

export function dbFindSessionUserId(tokenHash: string, nowIso: string): string | undefined {
  const row = getDb()
    .prepare("select user_id from sessions where token = ? and expires_at > ?")
    .get(tokenHash, nowIso) as { user_id: string } | undefined;
  return row?.user_id;
}

export function dbDeleteSession(tokenHash: string) {
  getDb().prepare("delete from sessions where token = ?").run(tokenHash);
}

export function dbDeleteExpiredSessions(nowIso: string) {
  getDb().prepare("delete from sessions where expires_at <= ?").run(nowIso);
}

export function dbUpdatePlan(userId: string, plan: string): DbUser | undefined {
  getDb().prepare("update users set plan = ? where id = ?").run(plan, userId);
  return dbFindUserById(userId);
}

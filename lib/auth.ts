import { resolveClientLang } from "./lang-pref";
// Demo account store (shell auth).
// No backend yet: users and sessions live in localStorage on this browser only.
// Password is checked only for presence — do NOT use this for real accounts.

import type { AccessTier } from "./access";

export type PlanId = "free" | "pro";

export type SessionUser = {
  /** Supabase auth user id / app user id, used for profile updates. */
  id?: string;
  email: string;
  name: string;
  plan: PlanId;
  /** Effective access tier: free / pro / admin. */
  tier?: AccessTier;
  createdAt: number;
  isAdmin?: boolean;
  /** Google/GitHub OAuth avatar (from `user_metadata.avatar_url`). */
  avatarUrl?: string;
  /** OAuth provider id, e.g. "google". */
  provider?: string;
};

const SESSION_KEY = "gui.session";
const USERS_KEY = "gui.users";
const EVENT = "gui-session-change";

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

function readUsers(): SessionUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SessionUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: SessionUser[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function persistSession(user: SessionUser | null) {
  if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(SESSION_KEY);
  emit();
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export type AuthResult = { ok: true; user: SessionUser } | { ok: false; error: string };

export function register(email: string, name: string, password: string): AuthResult {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: resolveClientLang() === "zh" ? "请输入有效的邮箱地址" : "Please enter a valid email address." };
  if (name.trim().length < 2) return { ok: false, error: resolveClientLang() === "zh" ? "昵称至少 2 个字符" : "Your name must contain at least 2 characters." };
  if (password.length < 6) return { ok: false, error: resolveClientLang() === "zh" ? "密码至少 6 位" : "Your password must contain at least 6 characters." };
  const users = readUsers();
  if (users.some((u) => u.email === e)) return { ok: false, error: resolveClientLang() === "zh" ? "该邮箱已注册，请直接登录" : "This email is already registered. Please log in." };
  const user: SessionUser = {
    email: e,
    name: name.trim(),
    plan: "free",
    tier: "free",
    createdAt: Date.now(),
  };
  writeUsers([...users, user]);
  persistSession(user);
  return { ok: true, user };
}

export function login(email: string, password: string): AuthResult {
  const e = email.trim().toLowerCase();
  if (!e) return { ok: false, error: resolveClientLang() === "zh" ? "请输入邮箱" : "Please enter your email address." };
  if (!password) return { ok: false, error: resolveClientLang() === "zh" ? "请输入密码" : "Please enter your password." };
  const user = readUsers().find((u) => u.email === e);
  if (!user) return { ok: false, error: resolveClientLang() === "zh" ? "该邮箱尚未注册" : "No account was found for this email address." };
  persistSession(user);
  return { ok: true, user };
}

export function logout() {
  persistSession(null);
}

export function upgradeToPro() {
  const session = getSession();
  if (!session) return;
  const users = readUsers().map((u) =>
    u.email === session.email ? { ...u, plan: "pro" as const, tier: "pro" as const } : u
  );
  writeUsers(users);
  persistSession({ ...session, plan: "pro", tier: "pro" });
}

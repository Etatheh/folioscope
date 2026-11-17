// Password hashing (scrypt) and session token helpers.

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const COOKIE_NAME = "gui_session";

export type StoredUser = {
  id: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
  created_at: string;
};

export type PublicUser = {
  id: string;
  email: string;
  nickname: string;
  plan: "free" | "pro";
  tier: "free" | "pro" | "admin";
  createdAt: string;
  isAdmin?: boolean;
};

/** Returns "scrypt$<salt>$<hash>" */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = parts[1];
  const expected = Buffer.from(parts[2], "hex");
  try {
    const actual = scryptSync(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Raw session token (goes into the httpOnly cookie). */
export function issueToken(): string {
  return randomBytes(32).toString("hex");
}

/** Only the SHA-256 of the token is stored in the database. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function publicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    plan: user.plan,
    tier: user.plan,
    createdAt: user.created_at,
  };
}

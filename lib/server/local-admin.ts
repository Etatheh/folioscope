import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AuthUser } from "./auth-service";

const prefix = "local-admin.";

function settings() {
  if (process.env.NODE_ENV !== "development") return null;
  const email = process.env.LOCAL_ADMIN_EMAIL;
  const password = process.env.LOCAL_ADMIN_PASSWORD;
  const secret = process.env.LOCAL_ADMIN_SECRET;
  return email && password && secret ? { email, password, secret } : null;
}

function equal(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function localAdminLogin(email: string, password: string): string | null {
  const config = settings();
  if (!config || !equal(email.toLowerCase(), config.email.toLowerCase()) || !equal(password, config.password)) return null;
  const payload = `${Date.now() + 86400000}.${randomBytes(24).toString("hex")}`;
  return `${prefix}${payload}.${signature(payload, config.secret)}`;
}

export function localAdminUser(token: string | undefined): AuthUser | null {
  const config = settings();
  if (!config || !token?.startsWith(prefix)) return null;
  const parts = token.slice(prefix.length).split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || Number(parts[0]) <= Date.now()) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!equal(parts[2], signature(payload, config.secret))) return null;
  return { id: "local-admin", email: config.email, nickname: "Local Admin", plan: "pro", tier: "admin", isAdmin: true, createdAt: new Date(0).toISOString() };
}

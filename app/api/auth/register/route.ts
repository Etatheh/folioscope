import { cookies } from "next/headers";

import { registerAccount } from "@/lib/server/auth-service";
import { COOKIE_NAME, SESSION_TTL_MS } from "@/lib/server/auth";

export const runtime = "nodejs";

type Body = { email?: unknown; password?: unknown; nickname?: unknown; lang?: unknown };

const MSG = {
  en: {
    invalidEmail: "Enter a valid email address",
    shortNick: "Nickname must be at least 2 characters",
    shortPass: "Password must be at least 6 characters",
    badRequest: "Invalid request",
    internal: "Registration failed, please try again later",
  },
  zh: {
    invalidEmail: "请输入有效的邮箱地址",
    shortNick: "昵称至少 2 个字符",
    shortPass: "密码至少 6 位",
    badRequest: "请求格式错误",
    internal: "注册失败，请稍后再试",
  },
} as const;

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const lang = body.lang === "zh" ? "zh" : "en";
  const t = MSG[lang];

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: t.invalidEmail }, { status: 400 });
  }
  if (nickname.length < 2) {
    return Response.json({ ok: false, error: t.shortNick }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ ok: false, error: t.shortPass }, { status: 400 });
  }

  try {
    const result = await registerAccount(email, password, nickname, lang);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: result.status });
    }
    const store = await cookies();
    store.set(COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
      secure: process.env.NODE_ENV === "production",
    });
    return Response.json({ ok: true, user: result.user });
  } catch (error) {
    console.error("[auth/register]", error);
    return Response.json({ ok: false, error: t.internal }, { status: 500 });
  }
}

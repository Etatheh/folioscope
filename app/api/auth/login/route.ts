import { cookies } from "next/headers";

import { loginAccount } from "@/lib/server/auth-service";
import { COOKIE_NAME, SESSION_TTL_MS } from "@/lib/server/auth";
import { localAdminLogin } from "@/lib/server/local-admin";

export const runtime = "nodejs";

type Body = { email?: unknown; password?: unknown; lang?: unknown };

const MSG = {
  en: { missing: "Email and password are required", badRequest: "Invalid request", internal: "Login failed, please try again later" },
  zh: { missing: "请输入邮箱和密码", badRequest: "请求格式错误", internal: "登录失败，请稍后再试" },
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
  if (!email || !password) {
    return Response.json({ ok: false, error: t.missing }, { status: 400 });
  }

  try {
    const localToken = localAdminLogin(email, password);
    if (localToken) {
      const store = await cookies();
      store.set(COOKIE_NAME, localToken, { httpOnly: true, sameSite: "strict", path: "/", maxAge: 86400 });
      return Response.json({ ok: true });
    }
    const result = await loginAccount(email, password, lang);
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
    console.error("[auth/login]", error);
    return Response.json({ ok: false, error: t.internal }, { status: 500 });
  }
}

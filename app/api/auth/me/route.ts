import { cookies } from "next/headers";

import { resolveRequestUser } from "@/lib/server/request-user";
import { COOKIE_NAME } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * Current viewer, resolved from either a Supabase Bearer token or the legacy
 * httpOnly cookie. Always returns an explicit `tier` so every client shares the
 * same paid-access rule: `tier === "pro" || tier === "admin"`.
 */
export async function GET(request: Request) {
  const store = await cookies();

  try {
    const session = await resolveRequestUser(request);
    const user = session?.user ?? null;
    if (!user) {
      store.delete(COOKIE_NAME);
      return Response.json({ ok: false, error: "未登录" }, { status: 401 });
    }

    const tier =
      user.tier ?? (user.isAdmin ? "admin" : user.plan === "pro" ? "pro" : "free");
    return Response.json({ ok: true, user: { ...user, tier } });
  } catch (error) {
    console.error("[auth/me]", error);
    return Response.json({ ok: false, error: "读取会话失败" }, { status: 500 });
  }
}
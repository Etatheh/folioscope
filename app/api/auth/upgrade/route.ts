import { cookies } from "next/headers";

import { upgradeBySession } from "@/lib/server/auth-service";
import { COOKIE_NAME } from "@/lib/server/auth";

export const runtime = "nodejs";

/** Demo-only upgrade endpoint: sets plan='pro' for the current user. */
export async function POST() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  try {
    const user = await upgradeBySession(token);
    if (!user) {
      return Response.json({ ok: false, error: "会话已过期" }, { status: 401 });
    }
    return Response.json({ ok: true, user });
  } catch (error) {
    console.error("[auth/upgrade]", error);
    return Response.json({ ok: false, error: "升级失败" }, { status: 500 });
  }
}

import { cookies } from "next/headers";

import { getSessionUser } from "@/lib/server/auth-service";
import { COOKIE_NAME } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  try {
    const user = await getSessionUser(token);
    if (!user) {
      store.delete(COOKIE_NAME);
      return Response.json({ ok: false, error: "会话已过期" }, { status: 401 });
    }
    return Response.json({ ok: true, user });
  } catch (error) {
    console.error("[auth/me]", error);
    return Response.json({ ok: false, error: "读取会话失败" }, { status: 500 });
  }
}

import { cookies } from "next/headers";

import {
  getSessionUser,
  upgradeBySession,
} from "@/lib/server/auth-service";
import { COOKIE_NAME } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * Demo upgrade endpoint — **admin only**.
 *
 * Production upgrades go through the Lemon Squeezy webhook (verified by
 * signature). This endpoint exists solely so that developers listed in
 * ADMIN_EMAILS can activate Pro on their own account during local
 * development. Any non-admin caller gets 403.
 */
export async function POST() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  // Verify session and check admin status.
  let viewer = null;
  try {
    viewer = await getSessionUser(token);
  } catch {
    viewer = null;
  }

  if (!viewer) {
    return Response.json({ ok: false, error: "会话已过期" }, { status: 401 });
  }

  // Only admin (developer) accounts may use the self-service upgrade.
  if (!viewer.isAdmin) {
    return Response.json(
      { ok: false, error: "无权限：此接口仅限开发者使用", code: "ADMIN_ONLY" },
      { status: 403 }
    );
  }

  try {
    const user = await upgradeBySession(token);
    if (!user) {
      return Response.json({ ok: false, error: "升级失败" }, { status: 500 });
    }
    return Response.json({ ok: true, user });
  } catch (error) {
    console.error("[auth/upgrade]", error);
    return Response.json({ ok: false, error: "升级失败" }, { status: 500 });
  }
}

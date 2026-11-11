import { cookies } from "next/headers";

import { logoutBySession } from "@/lib/server/auth-service";
import { COOKIE_NAME } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      await logoutBySession(token);
    } catch (error) {
      console.error("[auth/logout]", error);
    }
  }
  store.delete(COOKIE_NAME);
  return Response.json({ ok: true });
}

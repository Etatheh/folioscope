import { cookies } from "next/headers";

import { buildCheckoutUrl, isBillingConfigured } from "@/lib/billing";
import { COOKIE_NAME } from "@/lib/server/auth";
import { getSessionUser } from "@/lib/server/auth-service";

export const runtime = "nodejs";

/** Lets the upgrade dialog know whether a real checkout is available yet. */
export async function GET() {
  return Response.json({ ok: true, configured: isBillingConfigured() });
}

/**
 * Creates a Lemon Squeezy checkout link for the signed-in account.
 *
 * 200 { url }        → redirect the browser to the hosted checkout
 * 200 { alreadyPro } → nothing to buy
 * 401                → not signed in
 * 503 { demo: true } → billing keys missing; the client falls back to the
 *                      in-app demo upgrade so the Pro UI stays testable
 */
export async function POST() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  let user = null;
  try {
    user = token ? await getSessionUser(token) : null;
  } catch {
    user = null;
  }

  if (!user) {
    return Response.json({ ok: false, error: "请先登录" }, { status: 401 });
  }
  if (user.plan === "pro") {
    return Response.json({ ok: true, alreadyPro: true });
  }
  if (!isBillingConfigured()) {
    return Response.json(
      { ok: false, configured: false, demo: true, error: "支付尚未配置" },
      { status: 503 }
    );
  }

  const url = buildCheckoutUrl({ email: user.email, userId: user.id });
  if (!url) {
    return Response.json(
      { ok: false, configured: false, demo: true, error: "结算链接无效" },
      { status: 503 }
    );
  }

  return Response.json({ ok: true, url });
}

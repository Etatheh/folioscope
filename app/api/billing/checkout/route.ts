import { getRequestLang } from "@/lib/server/lang";
import { cookies } from "next/headers";

import { isProTier } from "@/lib/access";
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
  const lang = await getRequestLang();
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  let user = null;
  try {
    user = token ? await getSessionUser(token) : null;
  } catch {
    user = null;
  }

  if (!user) {
    return Response.json({ ok: false, error: lang === "zh" ? "请先登录" : "Please log in to continue." }, { status: 401 });
  }
  if (isProTier(user.tier)) {
    return Response.json({ ok: true, alreadyPro: true });
  }
  if (!isBillingConfigured()) {
    return Response.json(
      { ok: false, configured: false, demo: true, error: lang === "zh" ? "支付尚未配置" : "Billing is not configured." },
      { status: 503 }
    );
  }

  const url = buildCheckoutUrl({ email: user.email, userId: user.id });
  if (!url) {
    return Response.json(
      { ok: false, configured: false, demo: true, error: lang === "zh" ? "结算链接无效" : "The checkout link is unavailable." },
      { status: 503 }
    );
  }

  return Response.json({ ok: true, url });
}

import {
  getAppUrl,
  getCreemApiBase,
  getCreemApiKey,
  getProductId,
  isMonthlyConfigured,
  isYearlyConfigured,
  type BillingCycle,
} from "@/lib/creem";
import { resolveRequestUser } from "@/lib/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutBody = {
  billingCycle?: unknown;
};

type CreemCheckoutResponse = {
  checkout_url?: string;
  url?: string;
  checkout?: { checkout_url?: string; url?: string };
  id?: string;
  message?: string;
};

function readCycle(value: unknown): BillingCycle {
  return value === "yearly" ? "yearly" : "monthly";
}

/**
 * Lets the pricing UI know which billing cycles are actually sellable.
 * Never returns keys or product IDs — only booleans.
 */
export async function GET() {
  return Response.json(
    {
      ok: true,
      configured: isMonthlyConfigured() || isYearlyConfigured(),
      monthly: isMonthlyConfigured(),
      yearly: isYearlyConfigured(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Creates a Creem hosted checkout for the signed-in account.
 *
 * 200 { ok, checkout_url } → redirect the browser to Creem
 * 400                      → invalid billing cycle / product not configured
 * 401                      → not signed in
 * 502                      → Creem rejected the request
 * 503 { demo: true }       → keys missing (client may fall back to demo)
 */
export async function POST(request: Request) {
  const session = await resolveRequestUser(request);
  if (!session) {
    return Response.json(
      { ok: false, error: "请先登录", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const user = session.user;

  let body: CheckoutBody = {};
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    // An empty body is valid and defaults to monthly.
  }
  const billingCycle = readCycle(body.billingCycle);

  const apiKey = getCreemApiKey();
  const productId = getProductId(billingCycle);
  if (!apiKey || !productId) {
    return Response.json(
      {
        ok: false,
        configured: false,
        demo: true,
        error:
          billingCycle === "yearly"
            ? "Yearly billing is not configured"
            : "Billing is not configured",
        code: "NOT_CONFIGURED",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const payload = {
    product_id: productId,
    request_id: `${user.id}_${Date.now()}`,
    customer: { email: user.email },
    success_url: `${getAppUrl(request)}/?checkout=success`,
    metadata: { user_id: user.id },
  };

  try {
    const response = await fetch(`${getCreemApiBase()}/v1/checkouts`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await response
      .json()
      .catch(() => null)) as CreemCheckoutResponse | null;

    if (!response.ok) {
      console.error("[checkout] Creem error", response.status, data);
      return Response.json(
        {
          ok: false,
          error: data?.message || "Unable to create checkout session",
          code: "CREEM_ERROR",
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const checkoutUrl =
      data?.checkout_url ?? data?.checkout?.checkout_url ?? data?.url;
    if (!checkoutUrl) {
      console.error("[checkout] Creem response missing checkout_url", data);
      return Response.json(
        { ok: false, error: "Checkout URL missing", code: "NO_CHECKOUT_URL" },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json(
      { ok: true, checkout_url: checkoutUrl, url: checkoutUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[checkout]", error);
    return Response.json(
      { ok: false, error: "Checkout request failed", code: "NETWORK_ERROR" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
import { getRequestLang } from "@/lib/server/lang";
import { getCreemApiBase, getCreemApiKey } from "@/lib/creem";
import { readSupabaseEnv } from "@/lib/server/env";
import { pgSelect } from "@/lib/server/rest";
import { resolveRequestUser } from "@/lib/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

type PortalResponse = {
  customer_portal_link?: string;
  portal_url?: string;
  url?: string;
  message?: string;
};

/** Service-role lookup of the Creem customer id for the current account. */
async function loadCustomerId(
  userId: string,
  email: string
): Promise<string | null> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) return null;

  const rows = await pgSelect<{ creem_customer_id?: string | null }>(
    env,
    "profiles",
    `id=eq.${encodeURIComponent(userId)}&select=creem_customer_id`
  );
  const byId = rows[0]?.creem_customer_id?.trim();
  if (byId) return byId;

  if (email) {
    const byEmail = await pgSelect<{ creem_customer_id?: string | null }>(
      env,
      "profiles",
      `email=eq.${encodeURIComponent(email)}&select=creem_customer_id`
    );
    const found = byEmail[0]?.creem_customer_id?.trim();
    if (found) return found;
  }

  return null;
}

/**
 * Opens the Creem customer billing portal for the signed-in account.
 *
 * 200 { ok, url }  → redirect the browser to Creem
 * 401              → not signed in
 * 400              → no Creem customer id on file (never bought a plan)
 * 503              → billing keys missing
 * 502              → Creem rejected the request
 */
export async function POST(request: Request) {
  const lang = await getRequestLang();
  const session = await resolveRequestUser(request);
  if (!session) {
    return Response.json(
      { ok: false, error: lang === "zh" ? "请先登录" : "Please log in to continue.", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  const user = session.user;

  const apiKey = getCreemApiKey();
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "Billing is not configured", code: "NOT_CONFIGURED" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  let customerId: string | null;
  try {
    customerId = await loadCustomerId(user.id, user.email);
  } catch (error) {
    console.error("[portal] profile lookup failed", error);
    return Response.json(
      { ok: false, error: "Profile lookup failed", code: "PROFILE_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!customerId) {
    return Response.json(
      {
        ok: false,
        error: "No active Creem customer on file",
        code: "NO_CUSTOMER",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const response = await fetch(`${getCreemApiBase()}/v1/customers/billing`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customer_id: customerId }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await response
      .json()
      .catch(() => null)) as PortalResponse | null;

    if (!response.ok) {
      console.error("[portal] Creem error", response.status, data);
      return Response.json(
        {
          ok: false,
          error: data?.message || "Unable to open billing portal",
          code: "CREEM_ERROR",
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const url =
      data?.customer_portal_link ?? data?.portal_url ?? data?.url ?? null;
    if (!url) {
      console.error("[portal] Creem response missing portal link", data);
      return Response.json(
        { ok: false, error: "Portal link missing", code: "NO_PORTAL_URL" },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json(
      { ok: true, url },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[portal]", error);
    return Response.json(
      { ok: false, error: "Portal request failed", code: "NETWORK_ERROR" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

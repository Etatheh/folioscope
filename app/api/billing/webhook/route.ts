import crypto from "node:crypto";

import { getWebhookSecret } from "@/lib/billing";
import { setPlanByEmail } from "@/lib/server/auth-service";

export const runtime = "nodejs";

const UPGRADE_EVENTS = new Set([
  "order_created",
  "subscription_created",
  "subscription_resumed",
  "subscription_payment_success",
]);

const DOWNGRADE_EVENTS = new Set(["subscription_expired"]);

type LemonPayload = {
  meta?: {
    event_name?: string;
    custom_data?: { user_id?: string };
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      user_email?: string;
      status?: string;
      first_order_item?: { product_name?: string };
    };
  };
};

function verifySignature(raw: string, signature: string, secret: string): boolean {
  const digest = crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(signature.trim().toLowerCase(), "utf8");
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

/**
 * Lemon Squeezy webhook receiver.
 *
 * Setup: Settings → Webhooks → URL `/api/billing/webhook`, signing secret in
 * LEMON_SQUEEZY_WEBHOOK_SECRET, events `order_created` + the subscription
 * lifecycle events. The checkout links carry `checkout[custom][user_id]`, and
 * every payload repeats the buyer email, so the account can be matched either
 * way.
 */
export async function POST(request: Request) {
  const secret = getWebhookSecret();
  if (!secret) {
    return Response.json(
      { ok: false, error: "LEMON_SQUEEZY_WEBHOOK_SECRET is not configured" },
      { status: 503 }
    );
  }

  const raw = await request.text();
  const signature = request.headers.get("x-signature") ?? "";
  if (!signature || !verifySignature(raw, signature, secret)) {
    return Response.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let payload: LemonPayload;
  try {
    payload = JSON.parse(raw) as LemonPayload;
  } catch {
    return Response.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const event = payload.meta?.event_name ?? "";
  const attributes = payload.data?.attributes ?? {};
  const email = attributes.user_email?.trim();

  if (UPGRADE_EVENTS.has(event)) {
    if (!email) {
      return Response.json({ ok: true, event, upgraded: false, reason: "missing email" });
    }
    const user = await setPlanByEmail(email, "pro");
    return Response.json({ ok: true, event, upgraded: Boolean(user) }, { status: 200 });
  }

  if (DOWNGRADE_EVENTS.has(event)) {
    if (!email) {
      return Response.json({ ok: true, event, downgraded: false, reason: "missing email" });
    }
    const user = await setPlanByEmail(email, "free");
    return Response.json({ ok: true, event, downgraded: Boolean(user) }, { status: 200 });
  }

  // Acknowledge unknown events so Lemon Squeezy does not retry them forever.
  return Response.json({ ok: true, event, ignored: true });
}

import crypto from "node:crypto";

import { getWebhookSecret, toIsoTimestamp } from "@/lib/creem";
import { readSupabaseEnv } from "@/lib/server/env";
import { pgInsert, pgSelect, pgUpdate } from "@/lib/server/rest";
import { setPlanByEmail } from "@/lib/server/auth-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Json = Record<string, unknown>;

type CreemEvent = {
  id?: string;
  eventType?: string;
  event_type?: string;
  type?: string;
  object?: unknown;
  data?: unknown;
  metadata?: unknown;
};

const UPGRADE_EVENTS = new Set([
  "checkout.completed",
  "subscription.active",
  "subscription.paid",
]);
const CANCELED_EVENTS = new Set(["subscription.canceled"]);
const EXPIRED_EVENTS = new Set(["subscription.expired"]);

function asObject(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function eventName(payload: CreemEvent): string {
  return (
    asString(payload.eventType) ??
    asString(payload.event_type) ??
    asString(payload.type) ??
    ""
  );
}

function resource(payload: CreemEvent): Json {
  return (
    asObject(payload.object) ??
    asObject(payload.data) ??
    asObject((payload as unknown) as Json) ??
    {}
  );
}

/** Reads `metadata.user_id` from the resource, nested checkout, or envelope. */
function readMetadata(res: Json, payload: CreemEvent): Json {
  const nested = asObject(res.checkout);
  return (
    asObject(res.metadata) ??
    asObject(nested?.metadata) ??
    asObject(payload.metadata) ??
    {}
  );
}

function readUserId(metadata: Json): string | null {
  return (
    asString(metadata.user_id) ??
    asString(metadata.userId) ??
    asString(metadata.userID) ??
    null
  );
}

function readEmail(res: Json, nested: Json | null): string | null {
  const customer = asObject(res.customer) ?? asObject(nested?.customer);
  return (
    asString(customer?.email) ??
    asString(res.customer_email) ??
    asString(res.email) ??
    asString(nested?.customer_email) ??
    null
  );
}

function readCustomerId(res: Json, nested: Json | null): string | null {
  const customerRaw = res.customer ?? nested?.customer;
  const customer = asObject(customerRaw);
  return (
    asString(customer?.id) ??
    (typeof customerRaw === "string" ? asString(customerRaw) : null) ??
    asString(res.customer_id) ??
    null
  );
}

function readSubscriptionId(
  res: Json,
  nested: Json | null,
  isSubscriptionEvent: boolean
): string | null {
  const subscriptionRaw = res.subscription ?? nested?.subscription;
  const subscription = asObject(subscriptionRaw);
  return (
    asString(subscription?.id) ??
    (typeof subscriptionRaw === "string" ? asString(subscriptionRaw) : null) ??
    asString(res.subscription_id) ??
    (isSubscriptionEvent ? asString(res.id) : null)
  );
}

function readPeriodEnd(res: Json, subscription: Json | null): string | null {
  return (
    toIsoTimestamp(res.current_period_end_date) ??
    toIsoTimestamp(res.current_period_end) ??
    toIsoTimestamp(res.current_period_end_at) ??
    toIsoTimestamp(res.period_end) ??
    toIsoTimestamp(res.renews_at) ??
    toIsoTimestamp(subscription?.current_period_end_date) ??
    toIsoTimestamp(subscription?.current_period_end) ??
    null
  );
}

function verifySignature(
  raw: string,
  signature: string,
  secret: string
): boolean {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(raw, "utf8")
    .digest("hex");
  const normalizedSignature = signature.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedSignature)) return false;
  const expected = Buffer.from(digest, "hex");
  const received = Buffer.from(normalizedSignature, "hex");
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

type ProfileTier = "free" | "pro" | "admin";

function normalizeTier(value: unknown): ProfileTier {
  return value === "admin" ? "admin" : value === "pro" ? "pro" : "free";
}

/**
 * Applies a subscription patch to `public.profiles`.
 *
 * Tries the auth user id first (the checkout metadata carries it), then the
 * customer email. Returns true when at least one row was updated.
 */
async function patchProfile(
  userId: string | null,
  email: string | null,
  patch: Json
): Promise<boolean> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) return false;

  if (userId) {
    const rows = await pgUpdate<{ id: string }>(
      env,
      "profiles",
      `id=eq.${encodeURIComponent(userId)}`,
      patch
    );
    if (rows && rows.length > 0) return true;
  }

  if (email) {
    const rows = await pgUpdate<{ id: string }>(
      env,
      "profiles",
      `email=eq.${encodeURIComponent(email)}`,
      patch
    );
    if (rows && rows.length > 0) return true;
  }

  // First purchase before the profile row exists: create it (the id must be a
  // real auth.users id, otherwise the FK rejects it and we simply skip).
  if (userId) {
    try {
      await pgInsert(env, "profiles", {
        id: userId,
        email,
        ...patch,
      });
      return true;
    } catch (error) {
      console.warn("[webhooks/creem] profile insert skipped", error);
    }
  }

  return false;
}

async function currentTier(
  userId: string | null,
  email: string | null
): Promise<ProfileTier> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) return "free";

  if (userId) {
    const rows = await pgSelect<{ tier?: string }>(
      env,
      "profiles",
      `id=eq.${encodeURIComponent(userId)}&select=tier`
    );
    if (rows[0]) return normalizeTier(rows[0].tier);
  }
  if (email) {
    const rows = await pgSelect<{ tier?: string }>(
      env,
      "profiles",
      `email=eq.${encodeURIComponent(email)}&select=tier`
    );
    if (rows[0]) return normalizeTier(rows[0].tier);
  }
  return "free";
}

async function findUserIdByCustomer(
  customerId: string | null
): Promise<string | null> {
  if (!customerId) return null;
  const env = readSupabaseEnv();
  if (!env?.secretKey) return null;
  try {
    const rows = await pgSelect<{ id: string }>(
      env,
      "profiles",
      `creem_customer_id=eq.${encodeURIComponent(customerId)}&select=id`
    );
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Creem webhook receiver.
 *
 * Setup: Creem Dashboard → Webhooks → URL `/api/webhooks/creem`, signing secret
 * copied into CREEM_WEBHOOK_SECRET. The signature header is `creem-signature`
 * and is the hex HMAC-SHA256 of the raw request body.
 */
export async function POST(request: Request) {
  const secret = getWebhookSecret();
  if (!secret) {
    return Response.json(
      { ok: false, error: "CREEM_WEBHOOK_SECRET is not configured" },
      { status: 503 }
    );
  }

  const raw = await request.text();
  const signature = request.headers.get("creem-signature") ?? "";
  if (!signature || !verifySignature(raw, signature, secret)) {
    return Response.json(
      { ok: false, error: "invalid signature" },
      { status: 401 }
    );
  }

  let payload: CreemEvent;
  try {
    payload = JSON.parse(raw) as CreemEvent;
  } catch {
    return Response.json(
      { ok: false, error: "invalid JSON" },
      { status: 400 }
    );
  }

  const event = eventName(payload);
  const res = resource(payload);
  const nested = asObject(res.checkout);
  const metadata = readMetadata(res, payload);

  let userId = readUserId(metadata);
  const email = readEmail(res, nested);
  const customerId = readCustomerId(res, nested);
  const subscription = asObject(res.subscription);
  const isSubscriptionEvent = event.startsWith("subscription.");
  const subscriptionId = readSubscriptionId(res, nested, isSubscriptionEvent);
  const periodEnd = readPeriodEnd(res, subscription);

  if (!userId && customerId) {
    userId = await findUserIdByCustomer(customerId);
  }

  const hasIdentity = Boolean(userId || email);

  try {
    if (UPGRADE_EVENTS.has(event)) {
      if (!hasIdentity) {
        return Response.json({
          ok: true,
          event,
          updated: false,
          reason: "no user identity in payload",
        });
      }

      const tier = await currentTier(userId, email);
      const patch: Json = {
        plan_tier: "pro",
        subscription_status: "active",
        // Keep the legacy tier column in sync so every existing access check
        // (isProTier) unlocks immediately. Admins are never downgraded.
        tier: tier === "admin" ? "admin" : "pro",
      };
      if (customerId) patch.creem_customer_id = customerId;
      if (subscriptionId) patch.creem_subscription_id = subscriptionId;
      if (periodEnd) patch.current_period_end = periodEnd;

      const updated = await patchProfile(userId, email, patch);
      if (email) await setPlanByEmail(email, "pro").catch(() => null);

      return Response.json({ ok: true, event, updated });
    }

    if (CANCELED_EVENTS.has(event)) {
      if (!hasIdentity) {
        return Response.json({
          ok: true,
          event,
          updated: false,
          reason: "no user identity in payload",
        });
      }

      // Keep Pro until current_period_end; only the status changes.
      const patch: Json = {
        plan_tier: "pro",
        subscription_status: "canceled",
      };
      if (customerId) patch.creem_customer_id = customerId;
      if (subscriptionId) patch.creem_subscription_id = subscriptionId;
      if (periodEnd) patch.current_period_end = periodEnd;

      const updated = await patchProfile(userId, email, patch);
      return Response.json({ ok: true, event, updated });
    }

    if (EXPIRED_EVENTS.has(event)) {
      if (!hasIdentity) {
        return Response.json({
          ok: true,
          event,
          updated: false,
          reason: "no user identity in payload",
        });
      }

      const tier = await currentTier(userId, email);
      const patch: Json = {
        plan_tier: "free",
        subscription_status: "expired",
        tier: tier === "admin" ? "admin" : "free",
      };
      if (customerId) patch.creem_customer_id = customerId;
      if (subscriptionId) patch.creem_subscription_id = subscriptionId;
      if (periodEnd) patch.current_period_end = periodEnd;

      const updated = await patchProfile(userId, email, patch);
      if (email) await setPlanByEmail(email, "free").catch(() => null);

      return Response.json({ ok: true, event, updated });
    }

    // Acknowledge unknown events so Creem does not retry them forever.
    return Response.json({ ok: true, event, ignored: true });
  } catch (error) {
    console.error("[webhooks/creem]", error);
    return Response.json(
      { ok: false, error: "Failed to apply subscription state" },
      { status: 500 }
    );
  }
}

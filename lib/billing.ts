// Lemon Squeezy checkout configuration.
//
// Two supported setups (either one is enough):
//   1. LEMON_SQUEEZY_CHECKOUT_URL — a ready-made checkout link.
//   2. LEMON_SQUEEZY_STORE_ID + LEMON_SQUEEZY_PRO_VARIANT_ID — the URL is built
//      from the store subdomain and the "Pro" variant id.
//
// Nothing here talks to the network: the API route only hands the browser a
// checkout URL, and the webhook route verifies what Lemon Squeezy sends back.

const STORE_HOST = /^[a-z0-9-]+$/i;

export type CheckoutOptions = {
  email?: string | null;
  userId?: string | null;
  /** Allow embedding the checkout in an iframe (kept off by default). */
  embed?: boolean;
};

/** Base checkout URL, or null when billing has not been configured yet. */
export function getCheckoutBaseUrl(): string | null {
  const direct = process.env.LEMON_SQUEEZY_CHECKOUT_URL?.trim();
  if (direct) return direct;

  const store = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
  const variant = process.env.LEMON_SQUEEZY_PRO_VARIANT_ID?.trim();
  if (!store || !variant || !STORE_HOST.test(store)) return null;
  return `https://${store}.lemonsqueezy.com/checkout/buy/${encodeURIComponent(variant)}`;
}

export function isBillingConfigured(): boolean {
  return getCheckoutBaseUrl() !== null;
}

/**
 * Adds prefill + attribution parameters on top of the base checkout URL.
 * Lemon Squeezy echoes `checkout[custom][*]` back in every webhook payload,
 * which is how the webhook knows which account to upgrade.
 */
export function buildCheckoutUrl(options: CheckoutOptions = {}): string | null {
  const base = getCheckoutBaseUrl();
  if (!base) return null;

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }

  if (options.email) url.searchParams.set("checkout[email]", options.email);
  if (options.userId) {
    url.searchParams.set("checkout[custom][user_id]", options.userId);
  }
  if (options.embed) url.searchParams.set("embed", "1");

  return url.toString();
}

export function getWebhookSecret(): string | null {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  return secret || null;
}

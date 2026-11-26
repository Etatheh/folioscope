// Creem subscription billing helpers.
//
// Environment variables (server-only, never exposed to the browser):
//   CREEM_API_KEY              — "creem_test_..." or "creem_..." (live)
//   CREEM_WEBHOOK_SECRET       — "whsec_..." signing secret
//   CREEM_MONTHLY_PRODUCT_ID   — "prod_..." monthly product
//   CREEM_YEARLY_PRODUCT_ID    — "prod_..." yearly product
//
// The API key prefix decides the environment, so a test key can never create
// live charges and vice versa.

export type BillingCycle = "monthly" | "yearly";

const TEST_HOST = "https://test-api.creem.io";
const LIVE_HOST = "https://api.creem.io";

export function getCreemApiKey(): string | null {
  const key = process.env.CREEM_API_KEY?.trim();
  return key || null;
}

/** Test keys start with `creem_test_`; everything else is treated as live. */
export function isCreemTestMode(): boolean {
  const key = getCreemApiKey();
  return Boolean(key && key.startsWith("creem_test_"));
}

export function getCreemApiBase(): string {
  return isCreemTestMode() ? TEST_HOST : LIVE_HOST;
}

export function getWebhookSecret(): string | null {
  const secret = process.env.CREEM_WEBHOOK_SECRET?.trim();
  return secret || null;
}

export function getProductId(cycle: BillingCycle): string | null {
  const raw =
    cycle === "yearly"
      ? process.env.CREEM_YEARLY_PRODUCT_ID
      : process.env.CREEM_MONTHLY_PRODUCT_ID;
  const id = raw?.trim();
  return id || null;
}

export function isMonthlyConfigured(): boolean {
  return Boolean(getCreemApiKey() && getProductId("monthly"));
}

export function isYearlyConfigured(): boolean {
  return Boolean(getCreemApiKey() && getProductId("yearly"));
}

export function isCreemConfigured(): boolean {
  return isMonthlyConfigured() || isYearlyConfigured();
}

/** Public app origin used as the hosted-checkout success URL. */

/** Normalizes the various Creem date fields into an ISO timestamp. */
export function toIsoTimestamp(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    // Creem may send Unix seconds; anything below year 2286 is treated as seconds.
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

import { PLANS_CONFIG, getBillingCopy, getPlanFeatures } from "@/config/plans";
export type { PlanId } from "@/config/plans";
export const PLANS = (["free", "pro"] as const).map(id => ({
  ...PLANS_CONFIG[id], ...getBillingCopy(id, "monthly"),
  tagline: PLANS_CONFIG[id].tagline.en, features: getPlanFeatures(id),
}));
export type Plan = (typeof PLANS)[number];
export const PRO_PRICE = getBillingCopy("pro", "monthly").price + "/month";

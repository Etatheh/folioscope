"use client";

import { useEffect } from "react";

import { resolveClientLang } from "@/lib/lang-pref";
import { apiFetch } from "@/lib/client-api";
import { showToast } from "@/components/ui/ToastHost";

const POLL_INTERVAL_MS = 1_500;
const MAX_ATTEMPTS = 10;

/**
 * Handles Creem's `?checkout=success` return URL.
 *
 * The redirect after payment can beat the webhook that writes the plan, so we
 * poll `/api/auth/me` until it reports Pro, then do a *full* navigation to the
 * dashboard. A full reload (not `router.push`) is required because the app-wide
 * session store is initialised once per document load; a client-side navigation
 * would keep the stale "free" snapshot.
 *
 * Renders nothing — it is mounted once in the root layout.
 */
export default function CheckoutReturn() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;

    // Strip the marker so refreshes / back navigation don't replay the flow.
    url.searchParams.delete("checkout");
    const cleaned = `${url.pathname}${url.search}${url.hash}` || "/";
    window.history.replaceState(null, "", cleaned);

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const zh = resolveClientLang() === "zh";
    // ToastHost is mounted before this component, so the listener exists.
    showToast(zh ? "支付成功，正在激活 Pro 套餐…" : "Payment successful — activating your Pro plan…");

    const check = async () => {
      attempts += 1;
      try {
        const response = await apiFetch("/api/auth/me", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as {
            user?: { tier?: string };
          };
          const tier = data.user?.tier;
          if (tier === "pro" || tier === "admin") {
            if (!cancelled) window.location.replace("/dashboard");
            return;
          }
        }
      } catch {
        // Network hiccups are normal right after a hosted checkout; keep polling.
      }

      if (cancelled) return;
      if (attempts < MAX_ATTEMPTS) {
        timer = window.setTimeout(check, POLL_INTERVAL_MS);
      } else {
        showToast(
          zh ? "已收到付款，支付通知处理完成后将自动解锁 Pro。" : "Payment received. Pro will unlock as soon as the webhook finishes."
        );
      }
    };

    void check();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
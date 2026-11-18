"use client";

import { useEffect } from "react";

/**
 * OAuth providers occasionally bounce users back to the home page with
 * `?error=...`. The app already surfaces the message elsewhere, so strip the
 * stale query string from the address bar without a refresh or navigation.
 */
export default function ClearErrorParam() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("error")) return;

    const cleaned = `${url.pathname}${url.hash}` || "/";
    window.history.replaceState(null, "", cleaned);
  }, []);

  return null;
}
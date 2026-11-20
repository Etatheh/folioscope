import type { Lang } from "./i18n";

/** Cookie name used to remember an explicit language choice across pages. */
export const LANG_COOKIE = "lang";
export const LANG_STORAGE_KEY = "folioscope.lang";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** Persist an explicit language choice so server-rendered pages can honour it. */
export function setLangCookie(lang: Lang) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Cookie persistence still works when local storage is unavailable.
  }
}

/** Read the persisted choice (client-side). Returns null when unset. */
export function getLangCookie(): Lang | null {
  const v = readCookie(LANG_COOKIE);
  return v === "zh" || v === "en" ? v : null;
}

/**
 * Only an explicitly saved preference can enable Chinese.
 * Browser locale, request headers and URL parameters never select a language.
 */
export function resolveClientLang(): Lang {
  return getLangCookie() ?? "en";
}

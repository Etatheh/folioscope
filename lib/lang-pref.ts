import type { Lang } from "./i18n";

/** Cookie name used to remember an explicit language choice across pages. */
export const LANG_COOKIE = "lang";

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
}

/** Read the persisted choice (client-side). Returns null when unset. */
export function getLangCookie(): Lang | null {
  const v = readCookie(LANG_COOKIE);
  return v === "zh" || v === "en" ? v : null;
}

function browserLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

/**
 * Resolve the UI language for client-rendered pages:
 * explicit `?lang=` query → saved cookie → browser preference → English.
 */
export function resolveClientLang(query?: string | null): Lang {
  if (query === "zh" || query === "en") return query;
  return getLangCookie() ?? browserLang();
}

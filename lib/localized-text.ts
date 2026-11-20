import type { Lang } from "./i18n";

export function containsCjk(value: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(value);
}

/** Never fall back to a provider's Chinese name on an English market board. */
export function localizedName(quote: { name: string; nameEn?: string; symbol: string }, lang: Lang): string {
  if (lang === "zh") return quote.name || quote.nameEn || quote.symbol;
  if (quote.nameEn && !containsCjk(quote.nameEn)) return quote.nameEn;
  return quote.name && !containsCjk(quote.name) ? quote.name : quote.symbol;
}

/** Upstream error details may use a different language than the interface. */
export function localizedError(message: unknown, lang: Lang, fallback: string): string {
  if (typeof message !== "string" || !message.trim()) return fallback;
  return lang === "en" && containsCjk(message) ? fallback : message;
}

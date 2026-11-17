import type { Lang } from "@/lib/i18n";

const CJK = /[㐀-鿿]/;

/** First character for the fallback avatar; English avoids a CJK glyph. */
export function avatarInitial(name: string, email: string, lang: Lang): string {
  const first = name.slice(0, 1);
  if (lang === "en" && CJK.test(first)) {
    return (email.slice(0, 1) || first || "U").toUpperCase();
  }
  return (first || "U").toUpperCase();
}

export default function UserAvatar({
  name,
  email,
  avatarUrl,
  lang,
  className = "h-8 w-8",
  textClassName = "text-xs",
}: {
  name: string;
  email: string;
  avatarUrl?: string;
  lang: Lang;
  className?: string;
  textClassName?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`${className} shrink-0 rounded-full object-cover ring-1 ring-white/20`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${className} ${textClassName} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white shadow-lg shadow-purple-500/20`}
    >
      {avatarInitial(name, email, lang)}
    </span>
  );
}
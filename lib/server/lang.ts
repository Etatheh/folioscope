import { cookies } from "next/headers";
import { parseLang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/lang-pref";

/** English until a visitor explicitly saves another language using the toggle. */
export async function getRequestLang() {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value);
}

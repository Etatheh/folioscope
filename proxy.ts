import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { readSupabaseEnv } from "@/lib/server/env";

/** Only allow same-origin relative redirects. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

/**
 * Next.js 16 renamed Middleware to Proxy.
 *
 * Refreshes the Supabase SSR session cookies on every page request and applies
 * the optimistic `/dashboard` route guard. API routes resolve cookies
 * themselves via `resolveRequestUser`.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = readSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const redirectWithCookies = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  // Legacy email/password accounts still use the hashed `gui_session` cookie;
  // let the dashboard page validate it instead of forcing them back to login.
  const hasLegacySession = request.cookies.has("gui_session");

  if (!user && !hasLegacySession && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", `${pathname}${search}`);
    return redirectWithCookies(url);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const target = safeNext(request.nextUrl.searchParams.get("redirect"));
    return redirectWithCookies(new URL(target, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on pages, skip API routes and static assets.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff|woff2|ttf|otf)$).*)",
  ],
};
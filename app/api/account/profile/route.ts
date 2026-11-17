import { isProTier } from "@/lib/access";
import { readSupabaseEnv } from "@/lib/server/env";
import { pgInsert, pgUpdate } from "@/lib/server/rest";
import { resolveRequestUser } from "@/lib/server/request-user";

export const runtime = "nodejs";

function cleanAvatar(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url.slice(0, 600) : null;
}

/**
 * Persist profile edits with the service-role key.
 *
 * The browser only gets an anon/publishable key, and the live `profiles`
 * policies are read-only. Writing here keeps the operation server-side while
 * still saving to the Supabase `profiles` table.
 */
export async function POST(request: Request) {
  const session = await resolveRequestUser(request);
  if (!session) {
    return Response.json(
      { ok: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (session.source !== "supabase") {
    return Response.json(
      { ok: false, error: "Supabase session required", code: "SUPABASE_REQUIRED" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  let body: { nickname?: unknown; avatarUrl?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON", code: "BAD_JSON" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
  if (nickname.length < 2 || nickname.length > 32) {
    return Response.json(
      { ok: false, error: "Invalid nickname", code: "INVALID_NICKNAME" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const env = readSupabaseEnv();
  if (!env?.secretKey) {
    return Response.json(
      { ok: false, error: "Supabase is not configured", code: "NOT_CONFIGURED" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const patch = {
    email: session.user.email,
    full_name: nickname,
    avatar_url: cleanAvatar(body.avatarUrl),
  };

  try {
    const rows = await pgUpdate<{ id: string }>(
      env,
      "profiles",
      `id=eq.${session.user.id}`,
      patch
    );

    if (!rows || rows.length === 0) {
      await pgInsert(env, "profiles", {
        id: session.user.id,
        ...patch,
        tier: session.user.tier,
        ai_credits: isProTier(session.user.tier) ? 200 : 5,
      });
    }

    return Response.json(
      {
        ok: true,
        profile: { full_name: nickname, avatar_url: patch.avatar_url },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[account/profile]", error);
    return Response.json(
      { ok: false, error: "Profile update failed", code: "PROFILE_UPDATE_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
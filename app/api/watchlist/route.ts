import { readSupabaseEnv } from "@/lib/server/env";
import { pgDelete, pgInsert, pgSelect, RestError } from "@/lib/server/rest";
import { resolveRequestUser } from "@/lib/server/request-user";
import { normalizeSymbol } from "@/lib/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WatchlistRow = { symbol: string; created_at?: string };

const NO_STORE = { "Cache-Control": "no-store" };

function unavailable(message: string, code: string, status = 503) {
  return Response.json(
    { ok: false, error: message, code },
    { status, headers: NO_STORE }
  );
}

async function listRows(userId: string): Promise<WatchlistRow[]> {
  const env = readSupabaseEnv();
  if (!env?.secretKey) throw new RestError(503, "NOT_CONFIGURED", "Supabase is not configured");
  return pgSelect<WatchlistRow>(
    env,
    "watchlists",
    `select=symbol,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`
  );
}

/** Cloud watchlist for cookie sessions; Supabase Auth users normally use RLS directly. */
export async function GET(request: Request) {
  const session = await resolveRequestUser(request);
  if (!session) return unavailable("Unauthorized", "UNAUTHORIZED", 401);

  try {
    const items = await listRows(session.user.id);
    return Response.json({ ok: true, items }, { headers: NO_STORE });
  } catch (error) {
    console.error("[watchlist:GET]", error);
    return unavailable("Watchlist storage unavailable", "WATCHLIST_UNAVAILABLE");
  }
}

export async function POST(request: Request) {
  const session = await resolveRequestUser(request);
  if (!session) return unavailable("Unauthorized", "UNAUTHORIZED", 401);

  let body: { action?: unknown; symbol?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return unavailable("Invalid JSON", "BAD_JSON", 400);
  }

  const symbol = typeof body.symbol === "string" ? normalizeSymbol(body.symbol) : null;
  if (!symbol) return unavailable("Invalid symbol", "INVALID_SYMBOL", 400);

  const action =
    body.action === "add" || body.action === "remove" || body.action === "toggle"
      ? body.action
      : null;
  if (!action) return unavailable("Invalid action", "INVALID_ACTION", 400);

  const env = readSupabaseEnv();
  if (!env?.secretKey) {
    return unavailable("Watchlist storage unavailable", "WATCHLIST_UNAVAILABLE");
  }

  try {
    const userId = session.user.id;
    const existing = await listRows(userId);
    const saved = existing.some((row) => row.symbol === symbol);
    const shouldSave = action === "toggle" ? !saved : action === "add";

    if (shouldSave) {
      // Idempotent: delete first so repeated clicks cannot duplicate rows.
      await pgDelete(
        env,
        "watchlists",
        `user_id=eq.${encodeURIComponent(userId)}&symbol=eq.${encodeURIComponent(symbol)}`
      );
      await pgInsert(env, "watchlists", { user_id: userId, symbol });
    } else {
      await pgDelete(
        env,
        "watchlists",
        `user_id=eq.${encodeURIComponent(userId)}&symbol=eq.${encodeURIComponent(symbol)}`
      );
    }

    const items = await listRows(userId);
    return Response.json(
      { ok: true, items, saved: shouldSave },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("[watchlist:POST]", error);
    return unavailable("Watchlist storage unavailable", "WATCHLIST_UNAVAILABLE");
  }
}
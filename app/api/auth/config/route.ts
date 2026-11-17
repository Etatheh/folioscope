import { readSupabaseEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/**
 * Public Supabase configuration for the browser client.
 *
 * Only the publishable/anon key is ever returned — the service-role secret
 * stays on the server. Returning this through a route (instead of requiring
 * NEXT_PUBLIC_* duplicates) keeps a single source of truth in the env file.
 */
export async function GET() {
  const env = readSupabaseEnv();
  if (!env) {
    return Response.json(
      { configured: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return Response.json(
    {
      configured: true,
      url: env.url,
      key: env.publicKey,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
import { blogPresets, type BlogPresetId } from "@/lib/blog-backtests";
import { runBlogBacktest } from "@/lib/server/blog-backtest";

export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ preset: string }> }) {
  const { preset } = await params;
  if (!Object.hasOwn(blogPresets, preset)) return new Response(null, { status: 404 });
  try {
    const result = await runBlogBacktest(blogPresets[preset as BlogPresetId]);
    return Response.json(result, { headers: { "Cache-Control": "public, max-age=300, s-maxage=21600, stale-while-revalidate=86400" } });
  } catch {
    return Response.json({ error: "Historical prices are temporarily unavailable." }, {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
}

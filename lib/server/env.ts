// Server-only env helpers for the Supabase-backed auth.
//
// 支持新旧两套 Supabase 密钥命名：
//   旧版：SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY
//   新版：SUPABASE_PUBLISHABLE_KEY (sb_publishable_...) + SUPABASE_SECRET_KEY (sb_secret_...)
//
// users/sessions 表开启了 RLS 且无公开策略，因此服务端写库必须用 secret key。

export type SupabaseEnv = {
  url: string;
  publicKey: string;
  secretKey: string | null;
};

export function readSupabaseEnv(): SupabaseEnv | null {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const publicKey =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "";
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    null;
  if (!rawUrl || !publicKey) return null;
  // 兼容用户直接粘贴 .../rest/v1/ 的情况
  const url = rawUrl
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/, "")
    .replace(/\/+$/, "");
  return { url, publicKey, secretKey };
}

/** The key used for server-side REST calls (secret bypasses RLS). */
export function restKey(env: SupabaseEnv): string {
  return env.secretKey ?? env.publicKey;
}

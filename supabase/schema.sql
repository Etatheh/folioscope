-- GUI Markets · 自建账号体系（Supabase Postgres）
-- 在 Supabase 控制台 → SQL Editor 中整段运行一次。

-- 用户表：邮箱唯一，密码只存 scrypt 哈希
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  nickname text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- 会话表：token 存 SHA-256 哈希（不是明文），过期时间用于失效
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references public.users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- AI 助手每日配额（服务端计数）
create table if not exists public.usage_daily (
  user_id uuid not null references public.users (id) on delete cascade,
  date text not null,
  count integer not null default 0,
  primary key (user_id, date)
);

-- 开启行级安全（不创建任何公开策略：只允许服务端用 service_role 访问，anon 无法读写）
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.usage_daily enable row level security;

-- AI 个股财报深度分析 · 24 小时缓存
-- 每位股票一行；symbol 为主键，重新生成时由 PostgREST upsert 覆盖。
-- 独立迁移脚本：supabase/ai_stock_reports.sql
create table if not exists public.ai_stock_reports (
  symbol text primary key,
  report jsonb not null,
  financials jsonb not null,
  model text not null default 'deepseek-chat',
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists ai_stock_reports_expires_at_idx
  on public.ai_stock_reports (expires_at);

alter table public.ai_stock_reports enable row level security;

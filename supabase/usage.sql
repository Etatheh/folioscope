-- FolioScope · usage_daily（AI 助手每日配额，部署到 Vercel 前运行）
-- 在 Supabase 控制台 → SQL Editor 中运行一次。

create table if not exists public.usage_daily (
  user_id uuid not null references public.users (id) on delete cascade,
  date text not null,
  count integer not null default 0,
  primary key (user_id, date)
);

alter table public.usage_daily enable row level security;

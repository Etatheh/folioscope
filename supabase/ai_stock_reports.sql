-- AI 个股财报深度分析 · 24 小时缓存
-- 在 Supabase 控制台 → SQL Editor 中运行一次。
--
-- 每位股票只保留一行；symbol 为主键，重新生成时通过 PostgREST upsert 覆盖。
create table if not exists public.ai_stock_reports (
  symbol text primary key,
  -- DeepSeek 生成的中英双语结构化研报（summary / highlights / valuation / risks / verdict）
  report jsonb not null,
  -- Yahoo Finance quoteSummary 抓取的核心财务指标
  financials jsonb not null,
  model text not null default 'deepseek-chat',
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists ai_stock_reports_expires_at_idx
  on public.ai_stock_reports (expires_at);

-- 仅允许服务端使用 service_role / secret key 访问，anon 无法读写。
alter table public.ai_stock_reports enable row level security;
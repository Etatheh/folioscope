-- =============================================================================
-- FolioScope · Creem 订阅支付字段迁移
--
-- 在 Supabase 控制台 → SQL Editor 中整段运行一次（可重复执行）。
--
-- 说明：
--   * `plan_tier`           订阅计划：'free' | 'pro'
--   * `subscription_status` 订阅状态：'inactive' | 'active' | 'canceled' | 'expired'
--   * `creem_customer_id`   Creem 客户 ID（用于自助账单门户）
--   * `creem_subscription_id` Creem 订阅 ID
--   * `current_period_end`  当前计费周期结束时间
--
-- 权限约定：
--   * 浏览器（authenticated / anon）只能 SELECT 自己的 profiles 行（沿用
--     既有 "profiles_select_own" 策略）。
--   * 不创建 INSERT / UPDATE / DELETE 的 authenticated 策略，因此前端无法
--     自行修改会员状态；所有写入只走 service_role（Webhook / 服务端接口）。
-- =============================================================================

alter table public.profiles
  add column if not exists plan_tier text not null default 'free',
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists creem_customer_id text,
  add column if not exists creem_subscription_id text,
  add column if not exists current_period_end timestamptz;

-- 取值约束（幂等：约束已存在时忽略）
do $$
begin
  alter table public.profiles
    add constraint profiles_plan_tier_check
    check (plan_tier in ('free', 'pro'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_subscription_status_check
    check (subscription_status in ('inactive', 'active', 'canceled', 'expired'));
exception
  when duplicate_object then null;
end $$;

-- Webhook 按 Creem 客户/订阅 ID 反查时使用
create index if not exists profiles_creem_customer_id_idx
  on public.profiles (creem_customer_id);

create index if not exists profiles_creem_subscription_id_idx
  on public.profiles (creem_subscription_id);

-- 确保 RLS 已开启
alter table public.profiles enable row level security;

-- 浏览器端只读：仅允许读取自己的行
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- 显式禁止浏览器端写入（会员状态只能由 service_role 更新）
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.profiles to service_role;
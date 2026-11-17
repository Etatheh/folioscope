-- =============================================================================
-- Profiles + account deletion for Supabase Auth users
--
-- 当前线上项目已经存在 public.profiles 与 public.delete_user_account()；
-- 本文件用于新环境复现 / 版本管理，可重复执行。
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  tier text not null default 'free',
  ai_credits integer not null default 5,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Tier and profile writes are service-role only (POST /api/account/profile).
-- The browser must never be able to change `tier`, otherwise a free account
-- could self-promote to pro/admin.
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

grant select on public.profiles to authenticated;

-- Deletes the calling auth user; profiles/sessions rows cascade.
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;
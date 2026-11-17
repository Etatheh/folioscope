-- =============================================================================
-- Cloud watchlist for the featured pool + Pro market search
--
-- Run this once in Supabase → SQL Editor. It is idempotent.
--
-- Supabase Auth users read/write their own rows directly through RLS.
-- The legacy cookie accounts use /api/watchlist with the service role, which
-- is why `user_id` intentionally has no FK to auth.users (that id comes from
-- public.users for old accounts).
-- =============================================================================

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text not null,
  created_at timestamptz not null default now(),
  constraint watchlists_symbol_format check (symbol ~ '^[A-Z][A-Z0-9.\-]{0,9}$')
);

create unique index if not exists watchlists_user_symbol_key
  on public.watchlists (user_id, symbol);
create index if not exists watchlists_user_created_idx
  on public.watchlists (user_id, created_at);

alter table public.watchlists enable row level security;

drop policy if exists "watchlists_select_own" on public.watchlists;
create policy "watchlists_select_own"
  on public.watchlists for select
  using (auth.uid() = user_id);

drop policy if exists "watchlists_insert_own" on public.watchlists;
create policy "watchlists_insert_own"
  on public.watchlists for insert
  with check (auth.uid() = user_id);

drop policy if exists "watchlists_delete_own" on public.watchlists;
create policy "watchlists_delete_own"
  on public.watchlists for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.watchlists to authenticated;
-- Aura Invest AI: initial schema
-- Contract: docs/06-database.md
-- Apply once: Supabase CLI (`supabase db push`) or paste into the Supabase SQL editor.
-- Never edit this file after it has been applied. Add a new migration instead.

create extension if not exists pgcrypto;

-- =========================================================================
-- Enums
-- =========================================================================
create type public.workspace      as enum ('main', 'trading', 'horizon', 'portfolio');
create type public.asset_class    as enum ('crypto', 'stock', 'etf', 'index', 'gold', 'cash');
create type public.chat_kind      as enum ('standard', 'portfolio_live');
create type public.message_role   as enum ('user', 'assistant');
create type public.message_status as enum ('complete', 'error');
create type public.run_status     as enum ('queued', 'running', 'completed', 'refused', 'failed');
create type public.risk_profile   as enum ('conservative', 'balanced', 'aggressive');
create type public.artifact_kind  as enum ('report', 'thesis', 'portfolio_review', 'note');

-- =========================================================================
-- Helpers
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =========================================================================
-- profiles
-- =========================================================================
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text not null default 'Investor' check (char_length(display_name) between 1 and 80),
  avatar_url        text,
  base_currency     text not null default 'USD' check (base_currency ~ '^[A-Z]{3}$'),
  risk_profile      public.risk_profile not null default 'balanced',
  timezone          text not null default 'UTC',
  plan              text not null default 'pro',
  monthly_reply_cap integer check (monthly_reply_cap is null or monthly_reply_cap >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================================
-- chats
-- =========================================================================
create table public.chats (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  workspace       public.workspace not null,
  kind            public.chat_kind not null default 'standard',
  title           text not null default 'New chat' check (char_length(title) between 1 and 120),
  is_pinned       boolean not null default false,
  asset_class     public.asset_class,
  symbol          text check (symbol is null or symbol ~ '^[A-Z0-9./:-]{1,20}$'),
  timeframe       text check (timeframe is null or timeframe in ('1m', '5m', '15m', '1h', '4h', '1d', '1w')),
  archived_at     timestamptz,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chats_portfolio_live_workspace check (kind <> 'portfolio_live' or workspace = 'portfolio')
);

create unique index chats_one_portfolio_live_per_user
  on public.chats (user_id) where kind = 'portfolio_live';
create index chats_sidebar_idx
  on public.chats (user_id, workspace, last_message_at desc nulls last) where archived_at is null;

create trigger chats_updated_at
  before update on public.chats
  for each row execute function public.set_updated_at();

-- =========================================================================
-- messages
-- =========================================================================
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.message_role not null,
  status     public.message_status not null default 'complete',
  content    text not null check (char_length(content) <= 50000),
  request_id uuid,
  context    jsonb not null default '{}'::jsonb,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint messages_error_only_for_assistant check (status = 'complete' or role = 'assistant')
);

create index messages_chat_created_idx on public.messages (chat_id, created_at);
create unique index messages_user_request_uidx      on public.messages (request_id) where role = 'user';
create unique index messages_assistant_request_uidx on public.messages (request_id) where role = 'assistant';

create or replace function public.touch_chat_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chats
     set last_message_at = new.created_at
   where id = new.chat_id;
  return new;
end;
$$;

create trigger messages_touch_chat
  after insert on public.messages
  for each row execute function public.touch_chat_on_message();

-- =========================================================================
-- agent_runs
-- =========================================================================
create table public.agent_runs (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null unique,
  user_id          uuid not null references auth.users (id) on delete cascade,
  chat_id          uuid not null references public.chats (id) on delete cascade,
  workspace        public.workspace not null,
  mode             text not null default 'chat' check (mode in ('chat', 'portfolio_review', 'daily_review')),
  status           public.run_status not null default 'queued',
  model            text,
  input_tokens     integer,
  output_tokens    integer,
  cost_usd         numeric(10, 6),
  latency_ms       integer,
  error_code       text,
  error_message    text,
  n8n_execution_id text,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz
);

create index agent_runs_user_started_idx on public.agent_runs (user_id, started_at desc);
create index agent_runs_status_idx       on public.agent_runs (status, started_at desc);

-- =========================================================================
-- holdings
-- =========================================================================
create table public.holdings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  asset_class   public.asset_class not null check (asset_class <> 'index'),
  symbol        text not null check (symbol ~ '^[A-Z0-9.:-]{1,20}$'),
  display_name  text,
  quantity      numeric(38, 18) not null check (quantity >= 0),
  avg_cost      numeric(38, 10) check (avg_cost is null or avg_cost >= 0),
  cost_currency text not null default 'USD' check (cost_currency ~ '^[A-Z]{3,5}$'),
  venue         text,
  notes         text check (notes is null or char_length(notes) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint holdings_unique_position unique nulls not distinct (user_id, asset_class, symbol, venue)
);

create trigger holdings_updated_at
  before update on public.holdings
  for each row execute function public.set_updated_at();

-- =========================================================================
-- portfolio_snapshots
-- =========================================================================
create table public.portfolio_snapshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  as_of         timestamptz not null default now(),
  base_currency text not null default 'USD',
  total_value   numeric(20, 2) not null,
  total_cost    numeric(20, 2),
  allocation    jsonb not null default '[]'::jsonb,
  positions     jsonb not null default '[]'::jsonb,
  health_score  smallint check (health_score between 0 and 100),
  health        jsonb,
  macro_regime  text,
  summary_md    text,
  source        text not null default 'daily_review' check (source in ('daily_review', 'on_demand'))
);

create index portfolio_snapshots_user_asof_idx on public.portfolio_snapshots (user_id, as_of desc);

-- =========================================================================
-- artifacts
-- =========================================================================
create table public.artifacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  chat_id    uuid references public.chats (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  workspace  public.workspace not null,
  kind       public.artifact_kind not null default 'report',
  title      text not null check (char_length(title) between 1 and 160),
  content_md text not null check (char_length(content_md) <= 200000),
  created_at timestamptz not null default now()
);

create index artifacts_user_created_idx on public.artifacts (user_id, created_at desc);

-- =========================================================================
-- watchlist (Phase B; created now to avoid a later migration)
-- =========================================================================
create table public.watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  asset_class public.asset_class not null,
  symbol      text not null check (symbol ~ '^[A-Z0-9./:-]{1,20}$'),
  created_at  timestamptz not null default now(),
  unique (user_id, asset_class, symbol)
);

-- =========================================================================
-- market_cache (n8n only)
-- =========================================================================
create table public.market_cache (
  key        text primary key,
  payload    jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index market_cache_expires_idx on public.market_cache (expires_at);

-- =========================================================================
-- monthly_usage view (respects agent_runs RLS)
-- =========================================================================
create view public.monthly_usage
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', started_at)              as month,
  count(*) filter (where status = 'completed') as replies,
  count(*) filter (where status = 'refused')   as refusals,
  count(*) filter (where status = 'failed')    as failures,
  coalesce(sum(cost_usd), 0)                   as cost_usd
from public.agent_runs
group by user_id, date_trunc('month', started_at);

-- =========================================================================
-- New user bootstrap: profile + pinned "My Live Portfolio" chat
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'Investor'), 80)
  );

  insert into public.chats (user_id, workspace, kind, title, is_pinned)
  values (new.id, 'portfolio', 'portfolio_live', 'My Live Portfolio', true);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Row-level security
-- =========================================================================
alter table public.profiles            enable row level security;
alter table public.chats               enable row level security;
alter table public.messages            enable row level security;
alter table public.agent_runs          enable row level security;
alter table public.holdings            enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.artifacts           enable row level security;
alter table public.watchlist           enable row level security;
alter table public.market_cache        enable row level security;

-- profiles
create policy "profiles: select own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- chats (the pinned portfolio_live chat is read-only for users)
create policy "chats: select own" on public.chats
  for select to authenticated using (user_id = (select auth.uid()));
create policy "chats: insert own standard" on public.chats
  for insert to authenticated with check (user_id = (select auth.uid()) and kind = 'standard');
create policy "chats: update own standard" on public.chats
  for update to authenticated
  using (user_id = (select auth.uid()) and kind = 'standard')
  with check (user_id = (select auth.uid()) and kind = 'standard');
create policy "chats: delete own standard" on public.chats
  for delete to authenticated using (user_id = (select auth.uid()) and kind = 'standard');

-- messages (users may only post their own user-role messages into their own active chats)
create policy "messages: select own" on public.messages
  for select to authenticated using (user_id = (select auth.uid()));
create policy "messages: insert own user messages" on public.messages
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and role = 'user'
    and status = 'complete'
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
        and c.user_id = (select auth.uid())
        and c.archived_at is null
    )
  );

-- agent_runs
create policy "agent_runs: select own" on public.agent_runs
  for select to authenticated using (user_id = (select auth.uid()));

-- holdings
create policy "holdings: select own" on public.holdings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "holdings: insert own" on public.holdings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "holdings: update own" on public.holdings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "holdings: delete own" on public.holdings
  for delete to authenticated using (user_id = (select auth.uid()));

-- portfolio_snapshots
create policy "portfolio_snapshots: select own" on public.portfolio_snapshots
  for select to authenticated using (user_id = (select auth.uid()));

-- artifacts
create policy "artifacts: select own" on public.artifacts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "artifacts: delete own" on public.artifacts
  for delete to authenticated using (user_id = (select auth.uid()));

-- watchlist
create policy "watchlist: manage own" on public.watchlist
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- market_cache: RLS on, no policies → only the service role / table owner (n8n) can access it.

-- =========================================================================
-- Column-level privileges (defence in depth on top of RLS)
-- =========================================================================
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, base_currency, risk_profile, timezone) on public.profiles to authenticated;

revoke update on public.chats from authenticated;
grant update (title, is_pinned, archived_at, asset_class, symbol, timeframe) on public.chats to authenticated;

revoke update, delete on public.messages from authenticated;
revoke insert, update, delete on public.agent_runs from authenticated;
revoke insert, update, delete on public.portfolio_snapshots from authenticated;
revoke insert, update on public.artifacts from authenticated;
revoke all on public.market_cache from anon, authenticated;
revoke all on public.monthly_usage from anon;

-- =========================================================================
-- Realtime
-- =========================================================================
alter publication supabase_realtime add table public.messages, public.chats, public.agent_runs;

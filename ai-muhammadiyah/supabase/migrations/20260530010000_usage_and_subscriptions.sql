-- AI Muhammadiyah usage tracking and subscription foundation.
-- Run this after the chat history migration.

create extension if not exists pgcrypto;

do $$
begin
  create type public.subscription_tier as enum (
    'free',
    'kader_pintar',
    'muallim_pro',
    'dakwah_digital',
    'sinergi_ranting'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.usage_action as enum (
    'message',
    'document_upload'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  daily_message_count integer not null default 0 check (daily_message_count >= 0),
  daily_upload_count integer not null default 0 check (daily_upload_count >= 0),
  daily_reset_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  started_at timestamptz not null default now(),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action public.usage_action not null,
  model_used text not null default 'auto'
    check (model_used in ('auto', 'fast', 'smart', 'document')),
  message_count integer not null default 0 check (message_count >= 0),
  document_count integer not null default 0 check (document_count >= 0),
  estimated_tokens integer not null default 0 check (estimated_tokens >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status, current_period_end desc nulls first);

create index if not exists usage_logs_user_created_idx
  on public.usage_logs (user_id, created_at desc);

create index if not exists usage_logs_user_action_created_idx
  on public.usage_logs (user_id, action, created_at desc);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create or replace function public.ensure_user_profile(p_user_id uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  insert into public.user_profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, tier, status)
  select p_user_id, 'free', 'active'
  where not exists (
    select 1
    from public.subscriptions
    where user_id = p_user_id
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_user_profile(new.id);
  return new;
end;
$$;

drop trigger if exists auth_users_create_profile on auth.users;
create trigger auth_users_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.reset_daily_counters(p_user_id uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  perform public.ensure_user_profile(p_user_id);

  update public.user_profiles
  set daily_message_count = 0,
      daily_upload_count = 0,
      daily_reset_date = current_date
  where user_id = p_user_id
    and daily_reset_date < current_date;
end;
$$;

create or replace function public.get_current_subscription_tier(
  p_user_id uuid default auth.uid()
)
returns public.subscription_tier
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select s.tier
      from public.subscriptions s
      where s.user_id = p_user_id
        and s.status in ('active', 'trialing')
        and (s.current_period_end is null or s.current_period_end > now())
      order by
        case s.tier
          when 'sinergi_ranting' then 5
          when 'dakwah_digital' then 4
          when 'muallim_pro' then 3
          when 'kader_pintar' then 2
          else 1
        end desc,
        s.created_at desc
      limit 1
    ),
    'free'::public.subscription_tier
  );
$$;

create or replace function public.get_subscription_limits(
  p_tier public.subscription_tier
)
returns table (
  daily_message_limit integer,
  daily_upload_limit integer,
  allowed_models text[]
)
language sql
stable
as $$
  select daily_message_limit, daily_upload_limit, allowed_models
  from (
    values
      ('free'::public.subscription_tier, 20, 3, array['auto', 'fast']),
      ('kader_pintar'::public.subscription_tier, 100, 10, array['auto', 'fast', 'smart']),
      ('muallim_pro'::public.subscription_tier, 300, 30, array['auto', 'fast', 'smart', 'document']),
      ('dakwah_digital'::public.subscription_tier, 600, 60, array['auto', 'fast', 'smart', 'document']),
      ('sinergi_ranting'::public.subscription_tier, 2000, 200, array['auto', 'fast', 'smart', 'document'])
  ) as limits(tier, daily_message_limit, daily_upload_limit, allowed_models)
  where limits.tier = p_tier;
$$;

create or replace function public.get_usage_snapshot(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier public.subscription_tier;
  v_daily_message_limit integer;
  v_daily_upload_limit integer;
  v_allowed_models text[];
  v_messages_used integer;
  v_uploads_used integer;
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  perform public.reset_daily_counters(p_user_id);

  v_tier := public.get_current_subscription_tier(p_user_id);

  select daily_message_limit, daily_upload_limit, allowed_models
  into v_daily_message_limit, v_daily_upload_limit, v_allowed_models
  from public.get_subscription_limits(v_tier);

  select coalesce(sum(message_count), 0)::integer
  into v_messages_used
  from public.usage_logs
  where user_id = p_user_id
    and action = 'message'
    and created_at >= current_date;

  select coalesce(sum(document_count), 0)::integer
  into v_uploads_used
  from public.usage_logs
  where user_id = p_user_id
    and action = 'document_upload'
    and created_at >= current_date;

  return jsonb_build_object(
    'tier', v_tier,
    'daily_message_limit', v_daily_message_limit,
    'daily_upload_limit', v_daily_upload_limit,
    'messages_used_today', v_messages_used,
    'uploads_used_today', v_uploads_used,
    'remaining_messages_today', greatest(v_daily_message_limit - v_messages_used, 0),
    'remaining_uploads_today', greatest(v_daily_upload_limit - v_uploads_used, 0),
    'allowed_models', v_allowed_models
  );
end;
$$;

create or replace function public.check_usage_limits(
  p_action public.usage_action,
  p_model_used text default 'auto',
  p_estimated_tokens integer default 0,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_allowed_models text[];
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  v_snapshot := public.get_usage_snapshot(p_user_id);
  v_allowed_models := array(
    select jsonb_array_elements_text(v_snapshot -> 'allowed_models')
  );

  if p_action = 'message' and not (p_model_used = any(v_allowed_models)) then
    return v_snapshot || jsonb_build_object(
      'allowed', false,
      'reason', 'model_not_allowed'
    );
  end if;

  if p_action = 'message'
    and (v_snapshot ->> 'remaining_messages_today')::integer <= 0 then
    return v_snapshot || jsonb_build_object(
      'allowed', false,
      'reason', 'daily_message_limit_exceeded'
    );
  end if;

  if p_action = 'document_upload'
    and (v_snapshot ->> 'remaining_uploads_today')::integer <= 0 then
    return v_snapshot || jsonb_build_object(
      'allowed', false,
      'reason', 'daily_upload_limit_exceeded'
    );
  end if;

  return v_snapshot || jsonb_build_object(
    'allowed', true,
    'reason', null,
    'estimated_tokens', greatest(p_estimated_tokens, 0)
  );
end;
$$;

create or replace function public.increment_usage(
  p_action public.usage_action,
  p_model_used text default 'auto',
  p_document_count integer default 0,
  p_estimated_tokens integer default 0,
  p_metadata jsonb default '{}'::jsonb,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit_check jsonb;
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  v_limit_check := public.check_usage_limits(
    p_action,
    p_model_used,
    p_estimated_tokens,
    p_user_id
  );

  if not (v_limit_check ->> 'allowed')::boolean then
    raise exception 'Usage limit exceeded: %', v_limit_check ->> 'reason';
  end if;

  insert into public.usage_logs (
    user_id,
    action,
    model_used,
    message_count,
    document_count,
    estimated_tokens,
    metadata
  )
  values (
    p_user_id,
    p_action,
    p_model_used,
    case when p_action = 'message' then 1 else 0 end,
    case when p_action = 'document_upload' then greatest(p_document_count, 1) else 0 end,
    greatest(p_estimated_tokens, 0),
    coalesce(p_metadata, '{}'::jsonb)
  );

  update public.user_profiles
  set daily_message_count = daily_message_count
      + case when p_action = 'message' then 1 else 0 end,
      daily_upload_count = daily_upload_count
      + case when p_action = 'document_upload' then greatest(p_document_count, 1) else 0 end
  where user_id = p_user_id;

  return public.get_usage_snapshot(p_user_id);
end;
$$;

alter table public.user_profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_logs enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own subscriptions" on public.subscriptions;
create policy "Users can read own subscriptions"
on public.subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can read own usage logs" on public.usage_logs;
create policy "Users can read own usage logs"
on public.usage_logs
for select
using (auth.uid() = user_id);

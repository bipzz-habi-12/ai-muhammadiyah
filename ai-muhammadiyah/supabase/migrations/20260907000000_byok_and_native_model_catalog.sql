-- M-Agent: BYOK + katalog model native.
--
-- PENTING: review dan backup database produksi sebelum menjalankan file ini.
-- Migration tidak dijalankan otomatis oleh aplikasi.

create table if not exists public.user_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai', 'google', 'anthropic')),
  api_key_encrypted text not null,
  key_hint text not null default '',
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.user_provider_credentials enable row level security;
-- Sengaja TANPA policy: anon/authenticated tidak boleh membaca ciphertext.

create index if not exists user_provider_credentials_user_idx
  on public.user_provider_credentials (user_id);

drop trigger if exists set_user_provider_credentials_updated_at
  on public.user_provider_credentials;
create trigger set_user_provider_credentials_updated_at
  before update on public.user_provider_credentials
  for each row execute function public.set_updated_at();

create or replace function public.get_my_provider_credentials()
returns table (
  provider text,
  key_hint text,
  validated_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select c.provider, c.key_hint, c.validated_at, c.updated_at
  from public.user_provider_credentials c
  where c.user_id = auth.uid()
  order by c.provider;
$$;

revoke all on function public.get_my_provider_credentials() from public;
grant execute on function public.get_my_provider_credentials() to authenticated;

-- ID model sekarang dinamis dari katalog aplikasi. Riwayat alias lama tetap
-- sah, tetapi CHECK daftar statis dihapus agar model baru tidak butuh migration.
alter table public.usage_logs
  drop constraint if exists usage_logs_model_used_check;

do $$
declare
  v_table text;
  v_column text;
  v_constraint text;
begin
  for v_table, v_column in
    values
      ('conversations', 'selected_model'),
      ('messages', 'selected_model'),
      ('user_memory', 'default_model')
  loop
    for v_constraint in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      join pg_attribute att
        on att.attrelid = rel.oid
       and att.attnum = any (con.conkey)
      where nsp.nspname = 'public'
        and rel.relname = v_table
        and con.contype = 'c'
        and att.attname = v_column
    loop
      execute format(
        'alter table public.%I drop constraint %I',
        v_table,
        v_constraint
      );
    end loop;
  end loop;
end $$;

alter table public.conversations
  alter column selected_model set default 'openai:gpt-5.6-luna',
  add column if not exists credential_mode text not null default 'platform'
    check (credential_mode in ('platform', 'byok'));

alter table public.messages
  alter column selected_model set default 'openai:gpt-5.6-luna',
  add column if not exists credential_mode text not null default 'platform'
    check (credential_mode in ('platform', 'byok'));

alter table public.user_memory
  alter column default_model set default 'openai:gpt-5.6-luna';

alter table public.usage_logs
  add column if not exists billing_mode text not null default 'platform'
    check (billing_mode in ('platform', 'byok')),
  add column if not exists provider text,
  add column if not exists api_model_id text;

create index if not exists usage_logs_billable_window_idx
  on public.usage_logs (user_id, billing_mode, created_at);

drop function if exists public.get_subscription_limits(public.subscription_tier);
create function public.get_subscription_limits(
  p_tier public.subscription_tier
)
returns table (
  session_token_limit integer,
  weekly_token_limit integer,
  context_window_tokens integer,
  allowed_models text[]
)
language sql
stable
as $$
  with catalogs as (
    select
      array[
        'openai:gpt-5.6-luna',
        'openai:gpt-5.5-pro',
        'openai:gpt-5.4-mini',
        'openai:gpt-5.4-nano',
        'openai:gpt-5-mini',
        'openai:gpt-5-nano',
        'openai:gpt-4.1-mini',
        'openai:gpt-4o',
        'openai:gpt-4o-mini',
        'google:gemini-3.5-flash-lite',
        'google:gemini-3.1-flash-lite',
        'google:gemini-2.5-flash',
        'google:gemini-2.5-flash-lite',
        'anthropic:claude-haiku-4-5-20251001'
      ]::text[] as free_models,
      array[
        'openai:gpt-6-astra',
        'openai:gpt-5.6-sol',
        'openai:gpt-5.6-terra',
        'openai:gpt-5.6-luna',
        'openai:gpt-5.5-pro',
        'openai:gpt-5.5',
        'openai:gpt-5.4',
        'openai:gpt-5.4-pro',
        'openai:gpt-5.4-mini',
        'openai:gpt-5.4-nano',
        'openai:gpt-5.3-codex',
        'openai:gpt-5.2',
        'openai:gpt-5.2-pro',
        'openai:gpt-5.1',
        'openai:gpt-5',
        'openai:gpt-5-pro',
        'openai:gpt-5-mini',
        'openai:gpt-5-nano',
        'openai:o3-pro',
        'openai:o3',
        'openai:gpt-4.1-mini',
        'openai:gpt-4o',
        'openai:gpt-4o-mini',
        'google:gemini-3.6-flash',
        'google:gemini-3.5-flash',
        'google:gemini-3.5-flash-lite',
        'google:gemini-3.1-pro-preview',
        'google:gemini-3-flash',
        'google:gemini-3.1-flash-lite',
        'google:gemini-2.5-pro',
        'google:gemini-2.5-flash',
        'google:gemini-2.5-flash-lite',
        'anthropic:claude-fable-5-1',
        'anthropic:claude-fable-5',
        'anthropic:claude-opus-5',
        'anthropic:claude-sonnet-5',
        'anthropic:claude-opus-4-8',
        'anthropic:claude-opus-4-7',
        'anthropic:claude-opus-4-6',
        'anthropic:claude-opus-4-5-20251101',
        'anthropic:claude-sonnet-4-6',
        'anthropic:claude-sonnet-4-5-20250929',
        'anthropic:claude-haiku-4-5-20251001'
      ]::text[] as all_models
  ),
  limits as (
    select *
    from (
      values
        ('free'::public.subscription_tier, 160000, 960000, 200000),
        ('kader_pintar'::public.subscription_tier, 800000, 5600000, 200000),
        ('muallim_pro'::public.subscription_tier, 2400000, 16000000, 200000),
        ('dakwah_digital'::public.subscription_tier, 4800000, 32000000, 200000),
        ('sinergi_ranting'::public.subscription_tier, 16000000, 112000000, 200000)
    ) as values_table(
      tier,
      session_token_limit,
      weekly_token_limit,
      context_window_tokens
    )
  )
  select
    limits.session_token_limit,
    limits.weekly_token_limit,
    limits.context_window_tokens,
    case
      when limits.tier in (
        'free'::public.subscription_tier,
        'kader_pintar'::public.subscription_tier
      ) then catalogs.free_models
      else catalogs.all_models
    end as allowed_models
  from limits
  cross join catalogs
  where limits.tier = coalesce(p_tier, 'free'::public.subscription_tier);
$$;

create or replace function public.get_usage_snapshot(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier public.subscription_tier;
  v_session_token_limit integer := 160000;
  v_weekly_token_limit integer := 960000;
  v_context_window_tokens integer := 200000;
  v_allowed_models text[] := array['openai:gpt-5.6-luna'];
  v_session_start timestamptz;
  v_weekly_start timestamptz;
  v_session_tokens integer := 0;
  v_weekly_tokens integer := 0;
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  perform public.ensure_user_profile(p_user_id);
  v_tier := coalesce(
    public.get_current_subscription_tier(p_user_id),
    'free'::public.subscription_tier
  );

  select
    limits.session_token_limit,
    limits.weekly_token_limit,
    limits.context_window_tokens,
    limits.allowed_models
  into
    v_session_token_limit,
    v_weekly_token_limit,
    v_context_window_tokens,
    v_allowed_models
  from public.get_subscription_limits(v_tier) limits;

  select windows.session_started_at, windows.weekly_started_at
  into v_session_start, v_weekly_start
  from public.active_usage_windows(p_user_id) windows;

  if v_session_start is not null then
    select coalesce(sum(estimated_tokens), 0)::integer
    into v_session_tokens
    from public.usage_logs
    where user_id = p_user_id
      and billing_mode = 'platform'
      and created_at >= v_session_start;
  end if;

  if v_weekly_start is not null then
    select coalesce(sum(estimated_tokens), 0)::integer
    into v_weekly_tokens
    from public.usage_logs
    where user_id = p_user_id
      and billing_mode = 'platform'
      and created_at >= v_weekly_start;
  end if;

  return jsonb_build_object(
    'tier', v_tier,
    'allowed_models', v_allowed_models,
    'context_window_tokens', v_context_window_tokens,
    'session_token_limit', v_session_token_limit,
    'weekly_token_limit', v_weekly_token_limit,
    'session_tokens_used', v_session_tokens,
    'weekly_tokens_used', v_weekly_tokens,
    'session_resets_at',
      case when v_session_start is null then null
      else v_session_start + interval '5 hours' end,
    'weekly_resets_at',
      case when v_weekly_start is null then null
      else v_weekly_start + interval '7 days' end
  );
end;
$$;

create or replace function public.record_byok_usage(
  p_model_used text,
  p_provider text,
  p_api_model_id text,
  p_estimated_tokens integer default 0,
  p_metadata jsonb default '{}'::jsonb,
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_user_id <> auth.uid() then
    raise exception 'User is not authenticated.';
  end if;

  if p_provider not in ('openai', 'google', 'anthropic') then
    raise exception 'Unsupported provider.';
  end if;

  insert into public.usage_logs (
    user_id,
    action,
    model_used,
    message_count,
    document_count,
    estimated_tokens,
    metadata,
    billing_mode,
    provider,
    api_model_id
  )
  values (
    p_user_id,
    'message'::public.usage_action,
    p_model_used,
    1,
    0,
    greatest(coalesce(p_estimated_tokens, 1), 1),
    coalesce(p_metadata, '{}'::jsonb),
    'byok',
    p_provider,
    p_api_model_id
  );
end;
$$;

revoke all on function public.record_byok_usage(text, text, text, integer, jsonb, uuid)
  from public;
grant execute on function public.record_byok_usage(text, text, text, integer, jsonb, uuid)
  to authenticated;
grant execute on function public.get_subscription_limits(public.subscription_tier)
  to authenticated;

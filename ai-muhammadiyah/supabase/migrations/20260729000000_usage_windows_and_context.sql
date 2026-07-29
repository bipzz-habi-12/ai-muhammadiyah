-- Langkah 37: kuota harian -> jendela 5 jam + mingguan (pola Claude),
-- SATU meteran kuota berbasis TOKEN, plus kapasitas context window per tier.
--
-- MODEL JENDELA (beranker, bukan rolling):
--   Sesi dimulai saat pemakaian PERTAMA setelah jendela sebelumnya kedaluwarsa,
--   lalu berlaku 5 jam penuh. Pemakaian jam ke-4 masih masuk sesi yang sama;
--   jam ke-6 membuka sesi baru. Sama untuk jendela mingguan (7 hari).
--   Anker disimpan di user_profiles supaya perilakunya persis, bukan perkiraan.
--   `get_usage_snapshot` hanya MEMBACA (jendela kedaluwarsa dianggap kosong);
--   yang MEMULAI jendela baru hanya `increment_usage` — jadi sekadar membuka
--   aplikasi tidak menghabiskan jatah sesi.
--
-- SATU METERAN TOKEN: pesan dan upload dokumen memakai kolam kuota yang sama,
--   dihitung dari `usage_logs.estimated_tokens` — granular apa adanya
--   (1001, 1003, 1006, ...), tidak dibulatkan ke unit. Batas per tier setara
--   batas lama x 4000 token, jadi daya beli paket tidak berubah.
--
-- Signature `check_usage_limits` / `increment_usage` TIDAK berubah dari versi
-- 20260530 — `p_estimated_tokens` yang sudah dikirim semua route kini menjadi
-- biaya kuota itu sendiri. Kolom lama (`daily_*`) sengaja tidak dihapus supaya
-- rollback gampang; kolom itu berhenti dipakai.

alter table public.user_profiles
  add column if not exists session_started_at timestamptz,
  add column if not exists weekly_started_at timestamptz;

create index if not exists usage_logs_user_created_window_idx
  on public.usage_logs (user_id, created_at);

-- Bentuk kembalian berubah, jadi harus di-drop dulu.
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
  select
    session_token_limit,
    weekly_token_limit,
    context_window_tokens,
    allowed_models
  from (
    values
      ('free'::public.subscription_tier, 160000, 960000, 200000, array['auto', 'fast', 'smart']),
      ('kader_pintar'::public.subscription_tier, 800000, 5600000, 200000, array['auto', 'fast', 'smart']),
      ('muallim_pro'::public.subscription_tier, 2400000, 16000000, 200000, array['auto', 'fast', 'smart', 'document']),
      ('dakwah_digital'::public.subscription_tier, 4800000, 32000000, 200000, array['auto', 'fast', 'smart', 'document']),
      ('sinergi_ranting'::public.subscription_tier, 16000000, 112000000, 200000, array['auto', 'fast', 'smart', 'document'])
  ) as limits(
    tier,
    session_token_limit,
    weekly_token_limit,
    context_window_tokens,
    allowed_models
  )
  where limits.tier = coalesce(p_tier, 'free'::public.subscription_tier);
$$;

-- Anker jendela yang masih hidup; null kalau sudah kedaluwarsa/belum pernah ada.
create or replace function public.active_usage_windows(p_user_id uuid)
returns table (
  session_started_at timestamptz,
  weekly_started_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when profile.session_started_at is null then null
      when now() >= profile.session_started_at + interval '5 hours' then null
      else profile.session_started_at
    end,
    case
      when profile.weekly_started_at is null then null
      when now() >= profile.weekly_started_at + interval '7 days' then null
      else profile.weekly_started_at
    end
  from public.user_profiles profile
  where profile.user_id = p_user_id;
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
  v_allowed_models text[] := array['auto', 'fast', 'smart'];
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
      and created_at >= v_session_start;
  end if;

  if v_weekly_start is not null then
    select coalesce(sum(estimated_tokens), 0)::integer
    into v_weekly_tokens
    from public.usage_logs
    where user_id = p_user_id
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
  v_cost integer := greatest(coalesce(p_estimated_tokens, 1), 1);
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

  if (v_snapshot ->> 'session_tokens_used')::integer + v_cost
     > (v_snapshot ->> 'session_token_limit')::integer then
    return v_snapshot || jsonb_build_object(
      'allowed', false,
      'reason', 'session_token_limit_exceeded'
    );
  end if;

  if (v_snapshot ->> 'weekly_tokens_used')::integer + v_cost
     > (v_snapshot ->> 'weekly_token_limit')::integer then
    return v_snapshot || jsonb_build_object(
      'allowed', false,
      'reason', 'weekly_token_limit_exceeded'
    );
  end if;

  return v_snapshot || jsonb_build_object(
    'allowed', true,
    'reason', null,
    'estimated_tokens', v_cost
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
  v_cost integer := greatest(coalesce(p_estimated_tokens, 1), 1);
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  perform public.ensure_user_profile(p_user_id);

  v_limit_check := public.check_usage_limits(
    p_action,
    p_model_used,
    v_cost,
    p_user_id
  );

  if not (v_limit_check ->> 'allowed')::boolean then
    raise exception 'Usage limit exceeded: %', v_limit_check ->> 'reason';
  end if;

  -- Buka jendela baru HANYA di sini (bukan saat sekadar membaca snapshot).
  update public.user_profiles
  set
    session_started_at = case
      when session_started_at is null
        or now() >= session_started_at + interval '5 hours'
      then now()
      else session_started_at
    end,
    weekly_started_at = case
      when weekly_started_at is null
        or now() >= weekly_started_at + interval '7 days'
      then now()
      else weekly_started_at
    end
  where user_id = p_user_id;

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
    case when p_action = 'document_upload'
      then greatest(coalesce(p_document_count, 1), 1)
      else 0 end,
    v_cost,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return public.get_usage_snapshot(p_user_id);
end;
$$;

grant execute on function public.get_subscription_limits(public.subscription_tier) to authenticated;
grant execute on function public.active_usage_windows(uuid) to authenticated;
grant execute on function public.get_usage_snapshot(uuid) to authenticated;
grant execute on function public.check_usage_limits(public.usage_action, text, integer, uuid) to authenticated;
grant execute on function public.increment_usage(public.usage_action, text, integer, integer, jsonb, uuid) to authenticated;

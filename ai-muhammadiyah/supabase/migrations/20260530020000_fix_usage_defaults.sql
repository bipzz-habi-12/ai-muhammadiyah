-- Repair usage defaults so every authenticated user has a usable free tier.
-- Run this after 20260530010000_usage_and_subscriptions.sql.

create extension if not exists pgcrypto;

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

  insert into public.user_profiles (user_id, daily_message_count, daily_upload_count, daily_reset_date)
  values (p_user_id, 0, 0, current_date)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, tier, status)
  select p_user_id, 'free'::public.subscription_tier, 'active'
  where not exists (
    select 1
    from public.subscriptions
    where user_id = p_user_id
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
end;
$$;

insert into public.user_profiles (user_id, daily_message_count, daily_upload_count, daily_reset_date)
select users.id, 0, 0, current_date
from auth.users
left join public.user_profiles profiles on profiles.user_id = users.id
where profiles.user_id is null;

insert into public.subscriptions (user_id, tier, status)
select users.id, 'free'::public.subscription_tier, 'active'
from auth.users
where not exists (
  select 1
  from public.subscriptions subscriptions
  where subscriptions.user_id = users.id
    and subscriptions.status in ('active', 'trialing')
    and (
      subscriptions.current_period_end is null
      or subscriptions.current_period_end > now()
    )
);

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
  v_daily_message_limit integer := 20;
  v_daily_upload_limit integer := 3;
  v_allowed_models text[] := array['auto', 'fast'];
  v_messages_used integer := 0;
  v_uploads_used integer := 0;
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  perform public.reset_daily_counters(p_user_id);

  v_tier := coalesce(
    public.get_current_subscription_tier(p_user_id),
    'free'::public.subscription_tier
  );

  select
    coalesce(limits.daily_message_limit, 20),
    coalesce(limits.daily_upload_limit, 3),
    coalesce(limits.allowed_models, array['auto', 'fast'])
  into v_daily_message_limit, v_daily_upload_limit, v_allowed_models
  from public.get_subscription_limits(v_tier) limits;

  v_daily_message_limit := greatest(coalesce(v_daily_message_limit, 20), 1);
  v_daily_upload_limit := greatest(coalesce(v_daily_upload_limit, 3), 1);
  v_allowed_models := coalesce(v_allowed_models, array['auto', 'fast']);

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

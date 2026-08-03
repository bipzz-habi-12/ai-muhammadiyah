-- Langkah 38: pembayaran Stripe untuk setiap paket berbayar.
--
-- Yang ditambahkan:
--   1. Kolom tautan Stripe di `user_profiles` (customer) dan `subscriptions`
--      (subscription / price / periode / status pembatalan).
--   2. Tabel `billing_events` sebagai kunci idempotensi webhook — Stripe
--      mengirim ulang event yang sama saat gagal/timeout, dan tanpa ini satu
--      event bisa terproses dua kali.
--   3. `apply_stripe_subscription` — SATU pintu tulis untuk webhook (service
--      role saja). Ia yang menjaga invarian penting: hanya boleh ada satu
--      subscription Stripe aktif per user, jadi user yang pindah paket tidak
--      tertinggal baris tier lama yang masih 'active' (kalau itu terjadi,
--      `get_current_subscription_tier` akan tetap memberi tier tertinggi =
--      user membayar paket murah tapi dapat akses paket mahal).
--   4. `get_billing_state` — dibaca UI untuk memutuskan tombol "Upgrade"
--      (checkout) vs "Kelola langganan" (billing portal).
--
-- CATATAN ENTITLEMENT: `get_current_subscription_tier` (migrasi 20260530)
-- TIDAK diubah — ia hanya mengakui status 'active'/'trialing'. Jadi status
-- Stripe seperti 'past_due'/'unpaid'/'incomplete' otomatis TIDAK memberi akses
-- premium, tanpa perlu logika tambahan. Baris 'free' bawaan `ensure_user_profile`
-- sengaja dibiarkan hidup supaya user jatuh kembali ke Free saat langganan
-- berakhir.

-- 1. Tautan Stripe -------------------------------------------------------

alter table public.user_profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists user_profiles_stripe_customer_idx
  on public.user_profiles (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.subscriptions
  add column if not exists provider text not null default 'manual',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz;

create unique index if not exists subscriptions_stripe_subscription_idx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.subscriptions
  drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('manual', 'stripe'));

-- Status Stripe lebih banyak daripada daftar lama; simpan apa adanya supaya
-- baris DB jujur mencerminkan Stripe, biarkan entitlement yang menyaring.
alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'expired',
    'incomplete',
    'incomplete_expired',
    'unpaid',
    'paused'
  ));

-- 2. Idempotensi webhook -------------------------------------------------

create table if not exists public.billing_events (
  id text primary key,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists billing_events_received_idx
  on public.billing_events (received_at desc);

-- Tanpa policy apa pun: hanya service role (yang melewati RLS) yang boleh
-- menyentuh tabel ini. Event Stripe mentah bukan data milik user.
alter table public.billing_events enable row level security;

-- 3. Pintu tulis webhook -------------------------------------------------

create or replace function public.apply_stripe_subscription(
  p_user_id uuid,
  p_tier public.subscription_tier,
  p_status text,
  p_stripe_subscription_id text,
  p_stripe_customer_id text default null,
  p_stripe_price_id text default null,
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_canceled_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitled boolean;
  v_subscription_id uuid;
begin
  if p_user_id is null then
    raise exception 'apply_stripe_subscription requires a user id.';
  end if;

  if p_stripe_subscription_id is null or btrim(p_stripe_subscription_id) = '' then
    raise exception 'apply_stripe_subscription requires a stripe subscription id.';
  end if;

  perform public.ensure_user_profile(p_user_id);

  if p_stripe_customer_id is not null then
    update public.user_profiles
    set stripe_customer_id = p_stripe_customer_id
    where user_id = p_user_id
      and stripe_customer_id is distinct from p_stripe_customer_id;
  end if;

  insert into public.subscriptions (
    user_id,
    tier,
    status,
    provider,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    started_at,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at
  )
  values (
    p_user_id,
    p_tier,
    p_status,
    'stripe',
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_stripe_price_id,
    coalesce(p_current_period_start, now()),
    coalesce(p_current_period_start, now()),
    p_current_period_end,
    coalesce(p_cancel_at_period_end, false),
    p_canceled_at
  )
  -- Predikat indeks parsial harus ikut ditulis supaya Postgres bisa memilih
  -- indeks itu sebagai arbiter konflik.
  on conflict (stripe_subscription_id) where stripe_subscription_id is not null
  do update
  set
    user_id = excluded.user_id,
    tier = excluded.tier,
    status = excluded.status,
    provider = 'stripe',
    stripe_customer_id = coalesce(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
    stripe_price_id = coalesce(excluded.stripe_price_id, subscriptions.stripe_price_id),
    current_period_start = coalesce(excluded.current_period_start, subscriptions.current_period_start),
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    canceled_at = excluded.canceled_at
  returning id into v_subscription_id;

  -- Satu langganan Stripe aktif per user. Baris Stripe lain milik user yang
  -- sama (mis. sisa paket sebelum pindah tier) dimatikan supaya tidak ikut
  -- terhitung saat memilih tier tertinggi.
  update public.subscriptions
  set status = 'canceled',
      canceled_at = coalesce(canceled_at, now())
  where user_id = p_user_id
    and provider = 'stripe'
    and id <> v_subscription_id
    and status in ('active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'paused');

  v_entitled := p_status in ('active', 'trialing');

  return jsonb_build_object(
    'subscription_id', v_subscription_id,
    'tier', p_tier,
    'status', p_status,
    'entitled', v_entitled,
    'effective_tier', public.get_current_subscription_tier(p_user_id)
  );
end;
$$;

-- 4. Bacaan untuk UI -----------------------------------------------------

create or replace function public.get_billing_state(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text;
  v_subscription public.subscriptions%rowtype;
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  perform public.ensure_user_profile(p_user_id);

  select stripe_customer_id
  into v_customer_id
  from public.user_profiles
  where user_id = p_user_id;

  -- Langganan Stripe paling relevan: yang masih memberi akses dulu, lalu yang
  -- paling baru. Yang sudah 'canceled' tetap dikembalikan supaya UI bisa
  -- menawarkan "Kelola langganan" (mis. mengaktifkan kembali dari portal).
  select *
  into v_subscription
  from public.subscriptions
  where user_id = p_user_id
    and provider = 'stripe'
    and stripe_subscription_id is not null
  order by
    case when status in ('active', 'trialing') then 0 else 1 end,
    created_at desc
  limit 1;

  return jsonb_build_object(
    'tier', public.get_current_subscription_tier(p_user_id),
    'has_stripe_customer', v_customer_id is not null,
    'subscription',
      case
        when v_subscription.id is null then null::jsonb
        else jsonb_build_object(
          'tier', v_subscription.tier,
          'status', v_subscription.status,
          'current_period_end', v_subscription.current_period_end,
          'cancel_at_period_end', v_subscription.cancel_at_period_end,
          'is_entitled', v_subscription.status in ('active', 'trialing')
        )
      end
  );
end;
$$;

-- 5. Hak akses fungsi ----------------------------------------------------

-- `apply_stripe_subscription` menulis entitlement berbayar: user biasa TIDAK
-- boleh memanggilnya (kalau boleh, siapa pun bisa menaikkan tier-nya sendiri).
revoke all on function public.apply_stripe_subscription(
  uuid, public.subscription_tier, text, text, text, text,
  timestamptz, timestamptz, boolean, timestamptz
) from public, anon, authenticated;

grant execute on function public.apply_stripe_subscription(
  uuid, public.subscription_tier, text, text, text, text,
  timestamptz, timestamptz, boolean, timestamptz
) to service_role;

grant execute on function public.get_billing_state(uuid) to authenticated;

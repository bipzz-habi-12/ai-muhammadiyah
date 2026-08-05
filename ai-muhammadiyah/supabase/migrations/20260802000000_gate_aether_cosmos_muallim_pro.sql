-- Aether (GPT-5.6 Sol) dan Cosmos (GPT-5.6 Terra) kini khusus Muallim Pro ke
-- atas. Free & Kader Pintar hanya Prism + Velo.
--
-- `get_subscription_limits.allowed_models` adalah SUMBER KEBENARAN di server:
-- `check_usage_limits` menolak model di luar daftar ini dengan reason
-- 'model_not_allowed'. Tanpa migrasi ini, pembatasan hanya berlaku di UI dan
-- masih bisa dilewati lewat panggilan API langsung.
--
-- Default kolom juga digeser dari 'cosmos' ke 'prism': 'cosmos' kini terkunci
-- untuk tier gratis, jadi baris yang dibuat tanpa menyebut model tidak boleh
-- lagi jatuh ke model yang tidak bisa dipakai pemiliknya.
--
-- Review before applying: this file is not run automatically.

-- ---------------------------------------------------------------------------
-- 1. allowed_models per tier
-- ---------------------------------------------------------------------------

create or replace function public.get_subscription_limits(
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
      ('free'::public.subscription_tier, 160000, 960000, 200000, array['prism', 'velo']),
      ('kader_pintar'::public.subscription_tier, 800000, 5600000, 200000, array['prism', 'velo']),
      ('muallim_pro'::public.subscription_tier, 2400000, 16000000, 200000, array['aether', 'cosmos', 'prism', 'velo']),
      ('dakwah_digital'::public.subscription_tier, 4800000, 32000000, 200000, array['aether', 'cosmos', 'prism', 'velo']),
      ('sinergi_ranting'::public.subscription_tier, 16000000, 112000000, 200000, array['aether', 'cosmos', 'prism', 'velo'])
  ) as limits(
    tier,
    session_token_limit,
    weekly_token_limit,
    context_window_tokens,
    allowed_models
  )
  where limits.tier = coalesce(p_tier, 'free'::public.subscription_tier);
$$;

-- ---------------------------------------------------------------------------
-- 2. Default kolom: 'cosmos' -> 'prism'
--    (CHECK-nya sudah mengizinkan keempat model dari 20260801010000, jadi
--     cukup default-nya saja yang digeser.)
-- ---------------------------------------------------------------------------

alter table public.conversations
  alter column selected_model set default 'prism';

alter table public.messages
  alter column selected_model set default 'prism';

alter table public.user_memory
  alter column default_model set default 'prism';

-- ---------------------------------------------------------------------------
-- 3. Turunkan preferensi user yang menunjuk model terkunci ke Prism, HANYA
--    untuk pemilik tier gratis/kader (tier berbayar tetap boleh Aether/Cosmos).
--    Tanpa ini, user gratis membuka chat dan langsung melihat model terkunci.
-- ---------------------------------------------------------------------------

update public.user_memory m
set default_model = 'prism'
where m.default_model in ('aether', 'cosmos')
  and coalesce(
        public.get_current_subscription_tier(m.user_id),
        'free'::public.subscription_tier
      ) in ('free'::public.subscription_tier, 'kader_pintar'::public.subscription_tier);

update public.conversations c
set selected_model = 'prism'
where c.selected_model in ('aether', 'cosmos')
  and coalesce(
        public.get_current_subscription_tier(c.user_id),
        'free'::public.subscription_tier
      ) in ('free'::public.subscription_tier, 'kader_pintar'::public.subscription_tier);

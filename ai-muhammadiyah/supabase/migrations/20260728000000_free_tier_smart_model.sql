-- Langkah 35: semua tier dijawab GPT-5.6 Terra.
--
-- Rute Smart tidak lagi khusus tier berbayar. Sejak `lib/ai/chat.ts` mencoba
-- OpenAI lebih dulu untuk SEMUA rute & SEMUA tier, tier Free pun sebenarnya
-- sudah dijawab GPT-5.6 Terra. Yang tersisa cuma entitlement picker model di UI,
-- yang dibaca dari `get_subscription_limits` -> `allowed_models`. Migrasi ini
-- menambah 'smart' ke tier free supaya picker tidak lagi menampilkan gembok
-- untuk model yang sebenarnya sudah dipakai menjawab.
--
-- Yang TIDAK berubah: 'document' tetap mulai dari muallim_pro (rute konteks
-- panjang), semua batas kuota harian tetap sama persis, dan
-- `get_usage_snapshot` sengaja TIDAK disentuh (default hardcoded di dalamnya
-- hanya terpakai bila lookup ini mengembalikan null — tidak pernah terjadi
-- untuk tier yang valid).
--
-- Idempoten: `create or replace` dengan daftar nilai statis.

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
      ('free'::public.subscription_tier, 20, 3, array['auto', 'fast', 'smart']),
      ('kader_pintar'::public.subscription_tier, 100, 10, array['auto', 'fast', 'smart']),
      ('muallim_pro'::public.subscription_tier, 300, 30, array['auto', 'fast', 'smart', 'document']),
      ('dakwah_digital'::public.subscription_tier, 600, 60, array['auto', 'fast', 'smart', 'document']),
      ('sinergi_ranting'::public.subscription_tier, 2000, 200, array['auto', 'fast', 'smart', 'document'])
  ) as limits(tier, daily_message_limit, daily_upload_limit, allowed_models)
  where limits.tier = coalesce(p_tier, 'free'::public.subscription_tier);
$$;

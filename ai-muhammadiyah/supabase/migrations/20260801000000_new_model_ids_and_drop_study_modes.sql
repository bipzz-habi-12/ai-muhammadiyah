-- Dua perubahan yang saling terkait untuk Langkah 39:
--
-- 1. ID MODEL BARU. UI sekarang memakai empat model bernama Aether/Cosmos/
--    Prism/Velo (semuanya rute GPT, masing-masing dengan API key sendiri).
--    Dua tempat di DB memvalidasi id model dan harus ikut diperbarui:
--      a. CHECK public.usage_logs.model_used (nama tabel riil = usage_logs,
--         BUKAN usage_events)
--      b. allowed_models di get_subscription_limits (dipakai check_usage_limits;
--         id yang tidak ada di sini ditolak dengan reason 'model_not_allowed')
--    ID LAMA (auto/fast/smart/document) SENGAJA TETAP DIIZINKAN di CHECK:
--    baris usage historis memakainya, dan ALTER akan gagal kalau data lama
--    melanggar constraint baru.
--
-- 2. HAPUS 7 STUDY MODE LAMA. Skill gaya-belajar bawaan (Quick Explain,
--    Cambridge Tutor, OSN Coach, Islamic Teacher, Coding Mentor, Research Mode,
--    Step-by-Step) dihapus total sesuai permintaan. Skill domain hasil Langkah
--    34b/34c (Penulis Akademik, Analis Data, dst.) dan skill custom milik user
--    TIDAK disentuh.
--    messages.skill_id memakai ON DELETE SET NULL, jadi pesan lama tetap ada dan
--    hanya kehilangan penanda skill-nya. Kolom legacy messages/conversations
--    .study_mode dibiarkan apa adanya (data historis, tidak dibaca lagi).
--
-- Review before applying: this file is not run automatically.

-- ---------------------------------------------------------------------------
-- 1a. CHECK constraint public.usage_logs.model_used
--
-- CHECK-nya ditulis inline saat tabel dibuat (20260530010000), jadi namanya
-- di-generate Postgres. Alih-alih menebak namanya, cari semua CHECK di tabel
-- ini yang menyebut model_used lalu drop — aman dijalankan berulang.
-- ---------------------------------------------------------------------------

-- Jalur umum: Postgres menamai CHECK kolom inline sebagai
-- "<tabel>_<kolom>_check", jadi ini yang paling mungkin cocok.
alter table public.usage_logs
  drop constraint if exists usage_logs_model_used_check;

-- Jaring pengaman: kalau ternyata namanya lain, sapu lewat katalog.
do $$
declare
  v_constraint text;
begin
  -- Cari CHECK yang kolomnya memang `model_used` lewat katalog (conkey ->
  -- pg_attribute), bukan lewat teks definisinya — lebih sederhana dan tidak
  -- bergantung pada pg_get_constraintdef.
  for v_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_attribute att
      on att.attrelid = rel.oid
     and att.attnum = any (con.conkey)
    where nsp.nspname = 'public'
      and rel.relname = 'usage_logs'
      and con.contype = 'c'
      and att.attname = 'model_used'
  loop
    execute format(
      'alter table public.usage_logs drop constraint %I',
      v_constraint
    );
  end loop;
end $$;

alter table public.usage_logs
  add constraint usage_logs_model_used_check check (
    model_used in (
      -- model aktif sekarang
      'aether', 'cosmos', 'prism', 'velo',
      -- id lama: dipertahankan supaya baris historis tetap valid
      'auto', 'fast', 'smart', 'document'
    )
  );

-- ---------------------------------------------------------------------------
-- 1b. allowed_models per tier -> keempat model baru untuk SEMUA tier
--     (pembatasan pemakaian lewat kuota token, bukan lewat akses model)
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
      ('free'::public.subscription_tier, 160000, 960000, 200000, array['aether', 'cosmos', 'prism', 'velo']),
      ('kader_pintar'::public.subscription_tier, 800000, 5600000, 200000, array['aether', 'cosmos', 'prism', 'velo']),
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
-- 2. Hapus 7 study mode bawaan lama (hanya platform: owner_id is null)
-- ---------------------------------------------------------------------------

delete from public.skills
where owner_id is null
  and name in (
    'Quick Explain',
    'Cambridge Tutor',
    'OSN Coach',
    'Islamic Teacher',
    'Coding Mentor',
    'Research Mode',
    'Step-by-Step'
  );

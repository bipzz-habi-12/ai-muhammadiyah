-- AI Muhammadiyah -- Langkah 40 Tahap C: jembatan sinkronisasi lokal
-- (Hermes/Logseq) untuk "Otak Kedua".
--
-- ARAH KONEKSI SELALU KELUAR DARI MESIN PENGGUNA. Server kita di Vercel tidak
-- bisa menjangkau `localhost` milik pengguna dan browser diblokir CORS oleh
-- Logseq, jadi agen lokal-lah yang menghubungi kita — bukan sebaliknya.
-- Karena itu autentikasinya TIDAK bisa memakai sesi Supabase (tidak ada
-- browser di sana); dipakai token perangkat, pola sama seperti webhook Stripe
-- yang juga diautentikasi tanpa sesi.
--
-- Review sebelum apply: file ini tidak dijalankan otomatis.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. note_sync_devices -- satu baris per mesin yang disambungkan
--
--    HANYA hash token yang disimpan. Kalau kolom ini bocor lewat backup,
--    log, atau SELECT yang keliru, penyerang tetap tidak punya token yang
--    bisa dipakai. Token aslinya ditampilkan sekali saat dibuat lalu hilang.
-- ---------------------------------------------------------------------------

create table if not exists public.note_sync_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null default 'Perangkat saya'
    check (char_length(btrim(name)) between 1 and 120),
  token_hash text not null unique,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists note_sync_devices_user_idx
  on public.note_sync_devices (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. note_sync_events -- buku besar idempotensi
--
--    Agen lokal bisa mengirim ulang batch yang sama (jaringan putus di tengah
--    jalan, proses mati sebelum sempat mencatat sukses). Tanpa ini, kiriman
--    ulang akan menimpa catatan yang sudah lebih baru. Polanya meniru
--    `billing_events` pada webhook Stripe: insert dulu, tabrakan 23505 berarti
--    "sudah pernah diproses".
--
--    event_id ditentukan KLIEN, jadi dikunci per perangkat supaya perangkat
--    satu tidak bisa memblokir event milik perangkat lain.
-- ---------------------------------------------------------------------------

create table if not exists public.note_sync_events (
  device_id uuid not null
    references public.note_sync_devices(id) on delete cascade,
  event_id text not null check (char_length(event_id) between 8 and 200),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (device_id, event_id)
);

-- Buku besar ini hanya untuk deduplikasi jangka pendek; baris lama boleh
-- dipangkas kapan saja lewat indeks ini.
create index if not exists note_sync_events_created_idx
  on public.note_sync_events (created_at);

-- ---------------------------------------------------------------------------
-- 3. note_deletions -- nisan (tombstone)
--
--    Tanpa ini, penghapusan TIDAK PERNAH menyebar: pengguna menghapus halaman
--    di Logseq, agen tidak punya cara tahu, lalu tarikan berikutnya
--    menghidupkannya kembali. Bug "catatan yang sudah dihapus muncul lagi"
--    itu senyap dan sangat membingungkan, jadi nisan ini wajib ada sejak awal.
--
--    Dikunci pada judul (bukan id) karena judul adalah identitas halaman di
--    Logseq, dan itulah satu-satunya yang dikenali sisi berkas.
-- ---------------------------------------------------------------------------

create table if not exists public.note_deletions (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_key text not null,
  title text not null,
  deleted_at timestamptz not null default now(),
  primary key (user_id, title_key)
);

create index if not exists note_deletions_user_time_idx
  on public.note_deletions (user_id, deleted_at);

create or replace function public.record_note_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.note_deletions (user_id, title_key, title, deleted_at)
  values (old.user_id, lower(btrim(old.title)), old.title, now())
  on conflict (user_id, title_key)
    do update set deleted_at = now(), title = excluded.title;

  return old;
end;
$$;

drop trigger if exists notes_record_deletion on public.notes;
create trigger notes_record_deletion
after delete on public.notes
for each row execute function public.record_note_deletion();

/**
 * Membuat ulang catatan dengan judul yang sama membatalkan nisannya — kalau
 * tidak, catatan baru itu akan langsung dihapus lagi oleh sinkronisasi
 * berikutnya.
 */
create or replace function public.clear_note_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.note_deletions
  where user_id = new.user_id
    and title_key = lower(btrim(new.title));

  return new;
end;
$$;

drop trigger if exists notes_clear_deletion on public.notes;
create trigger notes_clear_deletion
after insert or update of title on public.notes
for each row execute function public.clear_note_deletion();

-- ---------------------------------------------------------------------------
-- 4. RLS
--
--    Perangkat: pengguna boleh melihat & mencabut miliknya sendiri lewat UI.
--    Pembuatan token TIDAK diizinkan dari klien — hanya rute server (service
--    role) yang boleh, supaya token selalu dibangkitkan dengan RNG kriptografis
--    dan tidak pernah ditentukan pengguna.
--
--    Buku besar event & nisan: RLS menyala TANPA policy sama sekali = tertutup
--    total untuk anon/authenticated. Hanya service role (yang melewati RLS)
--    yang menyentuhnya, dan rute sync selalu memfilter user_id dari token.
-- ---------------------------------------------------------------------------

alter table public.note_sync_devices enable row level security;
alter table public.note_sync_events enable row level security;
alter table public.note_deletions enable row level security;

drop policy if exists "Users can read own sync devices" on public.note_sync_devices;
create policy "Users can read own sync devices"
on public.note_sync_devices
for select
using (user_id = auth.uid());

drop policy if exists "Users can revoke own sync devices" on public.note_sync_devices;
create policy "Users can revoke own sync devices"
on public.note_sync_devices
for delete
using (user_id = auth.uid());

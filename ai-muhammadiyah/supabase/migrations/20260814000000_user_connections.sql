-- M-Agent: Work — fondasi CONNECTOR (Tahap 2 subsistem).
--
-- Menyimpan token OAuth pengguna ke layanan pihak ketiga (mulai dari Google).
-- Ini tabel paling sensitif di seluruh basis data: satu refresh token Google
-- yang bocor memberi penyerang akses berkelanjutan ke Drive pengguna, jauh
-- setelah kata sandi diganti. Tiga lapis pertahanan, dan ketiganya disengaja:
--
-- 1. RLS AKTIF TANPA SATU PUN POLICY untuk peran authenticated/anon.
--    Di Postgres, RLS aktif tanpa policy = TOLAK SEMUA. Jadi klien browser
--    yang memegang anon key TIDAK BISA membaca tabel ini sama sekali, bahkan
--    baris miliknya sendiri. Ini bukan kelalaian: token tidak pernah perlu
--    sampai ke browser. Hanya service role (rute server) yang menyentuhnya.
--    JANGAN menambahkan policy "users can select their own connection" —
--    itu akan membuat token bisa dipanen lewat supabase-js dari devtools.
--
-- 2. Refresh token disimpan TERENKRIPSI di level aplikasi (AES-256-GCM,
--    kunci dari env CONNECTION_ENCRYPTION_KEY) — lihat lib/connectors/crypto.ts.
--    Dump database saja tidak cukup untuk memakai tokennya.
--
-- 3. Status koneksi untuk UI dibaca lewat RPC security definer di bawah, yang
--    HANYA mengembalikan metadata (provider, kapan terhubung, scope) dan tidak
--    pernah kolom token.
--
-- Review sebelum apply: file ini tidak dijalankan otomatis.

create table if not exists public.user_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  -- Access token berumur pendek (±1 jam) — disimpan apa adanya karena nilainya
  -- kedaluwarsa sendiri. Refresh token TIDAK: itu yang dienkripsi.
  access_token text,
  access_token_expires_at timestamptz,
  refresh_token_encrypted text,
  scopes text[] not null default '{}',
  -- Email akun Google yang terhubung, supaya pengguna tahu akun MANA yang
  -- tersambung tanpa perlu membuka token apa pun.
  account_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Satu koneksi per provider per pengguna. Menghubungkan ulang menimpa baris
  -- lama lewat on conflict, bukan menumpuk baris yatim yang tokennya masih hidup.
  unique (user_id, provider)
);

alter table public.user_connections enable row level security;

-- Sengaja tidak ada policy di sini. Lihat catatan 1 di atas.

create index if not exists user_connections_user_idx
  on public.user_connections (user_id);

-- Status koneksi untuk UI. security definer supaya bisa membaca tabel yang
-- RLS-nya menolak semua, tapi ia difilter ke auth.uid() sehingga pengguna
-- hanya pernah melihat koneksinya sendiri. Perhatikan kolom yang dikembalikan:
-- tidak ada satu pun kolom token.
create or replace function public.get_my_connections()
returns table (
  provider text,
  account_email text,
  scopes text[],
  connected_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select c.provider, c.account_email, c.scopes, c.created_at
  from public.user_connections c
  where c.user_id = auth.uid();
$$;

revoke all on function public.get_my_connections() from public;
grant execute on function public.get_my_connections() to authenticated;

drop trigger if exists set_user_connections_updated_at on public.user_connections;
create trigger set_user_connections_updated_at
  before update on public.user_connections
  for each row execute function public.set_updated_at();

-- AI Muhammadiyah -- Langkah 40 Tahap A: "Otak Kedua" (Second Brain).
--
-- Catatan pribadi tertaut milik pengguna, dicari secara hybrid
-- (semantik pgvector + full-text), disuntikkan ke tiap jawaban AI.
--
-- Perbedaan penting dari tabel yang sudah ada:
--   * artifacts   -> terikat ke satu conversation_id (hasil kerja satu percakapan).
--   * notes       -> milik user_id LANGSUNG, hidup lintas percakapan. Ini syarat
--                    sebuah "otak kedua": pengetahuan tidak boleh mati bersama
--                    percakapan tempat ia lahir.
--   * knowledge_* -> korpus bersama yang dikurasi admin (publik, tanpa user_id).
--
-- RLS memakai pola satu-hop `user_id = auth.uid()` (lebih sederhana daripada
-- join lewat conversations seperti artifacts), karena user_id memang kolom
-- pemilik langsung di sini.
--
-- Review sebelum apply: file ini tidak dijalankan otomatis.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- 1. notes -- satu catatan = satu "halaman" ala Logseq
-- ---------------------------------------------------------------------------

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  -- Nullable: catatan boleh global (lintas workspace). on delete set null supaya
  -- menghapus workspace tidak ikut menghapus pengetahuan penggunanya.
  workspace_id uuid references public.chat_workspaces(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  content text not null default '',
  source text not null default 'user'
    check (source in ('user', 'ai', 'logseq_import')),
  -- Jejak asal saja, BUKAN kepemilikan: catatan tetap hidup setelah
  -- percakapan asalnya dihapus.
  origin_conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Judul unik per pengguna (case-insensitive). Ini yang membuat resolusi
-- [[wikilink]] deterministik -- model halaman Logseq memang begitu.
create unique index if not exists notes_user_title_key
  on public.notes (user_id, lower(btrim(title)));

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

create index if not exists notes_workspace_idx
  on public.notes (workspace_id, updated_at desc)
  where workspace_id is not null;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. note_chunks -- potongan teks + embedding untuk pencarian
--    Dimensi 1536 = text-embedding-3-small (OPENAI_EMBED_MODEL).
--    embedding nullable: catatan tetap tercari lewat full-text kalau
--    OPENAI_API_KEY_EMBED belum diisi (degradasi anggun).
-- ---------------------------------------------------------------------------

create table if not exists public.note_chunks (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  -- Didenormalisasi dari notes.user_id supaya RLS & filter pencarian tidak
  -- perlu join ke notes pada tiap baris.
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  chunk_order integer not null check (chunk_order >= 0),
  content text not null,
  embedding vector(1536),
  search_vector tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at timestamptz not null default now(),
  unique (note_id, chunk_order)
);

create index if not exists note_chunks_search_idx
  on public.note_chunks using gin (search_vector);

create index if not exists note_chunks_user_idx
  on public.note_chunks (user_id);

-- HNSW + cosine: cocok dengan embedding OpenAI yang sudah ternormalisasi.
create index if not exists note_chunks_embedding_idx
  on public.note_chunks using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- 3. note_links -- backlink ala Logseq
--    target_note_id NULLABLE dengan sengaja: [[Halaman Baru]] boleh menunjuk
--    catatan yang BELUM ada. Kalau ini dipaksa jadi FK wajib, model backlink
--    Logseq rusak. Tautan ter-resolve otomatis lewat trigger di bawah.
-- ---------------------------------------------------------------------------

create table if not exists public.note_links (
  id uuid primary key default gen_random_uuid(),
  source_note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  target_title text not null check (char_length(btrim(target_title)) between 1 and 240),
  target_title_key text generated always as (lower(btrim(target_title))) stored,
  target_note_id uuid references public.notes(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists note_links_source_target_key
  on public.note_links (source_note_id, target_title_key);

create index if not exists note_links_target_note_idx
  on public.note_links (target_note_id)
  where target_note_id is not null;

-- Tautan menggantung dicari lewat (user_id, target_title_key) saat catatan
-- bertajuk sama akhirnya dibuat.
create index if not exists note_links_unresolved_idx
  on public.note_links (user_id, target_title_key)
  where target_note_id is null;

-- ---------------------------------------------------------------------------
-- 4. Resolusi tautan otomatis
--    Saat catatan dibuat/judulnya diubah, semua [[tautan]] menggantung milik
--    pengguna yang sama yang menunjuk judul itu langsung tersambung.
-- ---------------------------------------------------------------------------

create or replace function public.resolve_note_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.note_links
  set target_note_id = new.id
  where user_id = new.user_id
    and target_note_id is null
    and target_title_key = lower(btrim(new.title));

  return new;
end;
$$;

drop trigger if exists notes_resolve_links on public.notes;
create trigger notes_resolve_links
after insert or update of title on public.notes
for each row execute function public.resolve_note_links();

-- ---------------------------------------------------------------------------
-- 5. search_notes -- pencarian hybrid (semantik + leksikal)
--
--    security invoker: RLS di note_chunks otomatis membatasi ke pemanggil.
--    Filter `user_id = auth.uid()` yang eksplisit di bawah adalah lapis kedua
--    (defense in depth), bukan pengganti RLS.
--
--    Penggabungan skor memakai Reciprocal Rank Fusion, bukan penjumlahan
--    berbobot: cosine distance dan ts_rank punya skala yang tidak sebanding,
--    jadi menjumlahkannya langsung menghasilkan peringkat yang menyesatkan.
--
--    p_embedding null (mis. OPENAI_API_KEY_EMBED kosong) -> jalur semantik
--    kosong dan hasilnya murni full-text.
-- ---------------------------------------------------------------------------

create or replace function public.search_notes(
  p_query text,
  p_embedding vector(1536) default null,
  p_limit integer default 6
)
returns table (
  note_id uuid,
  note_title text,
  chunk_order integer,
  content text,
  score real
)
language sql
stable
security invoker
set search_path = public
as $$
  with query_ts as (
    select plainto_tsquery('simple', coalesce(nullif(btrim(p_query), ''), ' ')) as value
  ),
  lexical as (
    select id, row_number() over (order by rank desc) as rnk
    from (
      select chunks.id, ts_rank(chunks.search_vector, query_ts.value) as rank
      from public.note_chunks chunks
      cross join query_ts
      where chunks.user_id = auth.uid()
        and chunks.search_vector @@ query_ts.value
      order by rank desc
      limit 40
    ) ranked_lexical
  ),
  semantic as (
    select id, row_number() over (order by distance asc) as rnk
    from (
      select chunks.id, chunks.embedding <=> p_embedding as distance
      from public.note_chunks chunks
      where chunks.user_id = auth.uid()
        and p_embedding is not null
        and chunks.embedding is not null
      order by distance asc
      limit 40
    ) ranked_semantic
  ),
  fused as (
    select
      coalesce(lexical.id, semantic.id) as chunk_id,
      coalesce(1.0 / (60 + lexical.rnk), 0)
        + coalesce(1.0 / (60 + semantic.rnk), 0) as score
    from lexical
    full outer join semantic on semantic.id = lexical.id
  )
  select
    notes.id as note_id,
    notes.title as note_title,
    chunks.chunk_order,
    chunks.content,
    fused.score::real
  from fused
  join public.note_chunks chunks on chunks.id = fused.chunk_id
  join public.notes notes on notes.id = chunks.note_id
  order by fused.score desc, notes.updated_at desc, chunks.chunk_order asc
  limit greatest(1, least(coalesce(p_limit, 6), 12));
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS -- kepemilikan langsung, tidak ada jalur baca antar-pengguna
-- ---------------------------------------------------------------------------

alter table public.notes enable row level security;
alter table public.note_chunks enable row level security;
alter table public.note_links enable row level security;

drop policy if exists "Users can read own notes" on public.notes;
create policy "Users can read own notes"
on public.notes
for select
using (user_id = auth.uid());

drop policy if exists "Users can create own notes" on public.notes;
create policy "Users can create own notes"
on public.notes
for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes"
on public.notes
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes"
on public.notes
for delete
using (user_id = auth.uid());

drop policy if exists "Users can read own note chunks" on public.note_chunks;
create policy "Users can read own note chunks"
on public.note_chunks
for select
using (user_id = auth.uid());

drop policy if exists "Users can create own note chunks" on public.note_chunks;
create policy "Users can create own note chunks"
on public.note_chunks
for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own note chunks" on public.note_chunks;
create policy "Users can update own note chunks"
on public.note_chunks
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own note chunks" on public.note_chunks;
create policy "Users can delete own note chunks"
on public.note_chunks
for delete
using (user_id = auth.uid());

drop policy if exists "Users can read own note links" on public.note_links;
create policy "Users can read own note links"
on public.note_links
for select
using (user_id = auth.uid());

drop policy if exists "Users can create own note links" on public.note_links;
create policy "Users can create own note links"
on public.note_links
for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own note links" on public.note_links;
create policy "Users can update own note links"
on public.note_links
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own note links" on public.note_links;
create policy "Users can delete own note links"
on public.note_links
for delete
using (user_id = auth.uid());

/*
  AI Muhammadiyah -- Langkah 41: pencarian catatan untuk jalur token perangkat
  (dipakai MCP server Hermes Agent).

  `search_notes` yang sudah ada bersifat `security invoker` dan menyaring
  dengan `auth.uid()`. Itu benar untuk browser, tapi TIDAK BISA dipakai di
  jalur agen: di sana tidak ada sesi sama sekali, `auth.uid()` bernilai null,
  dan hasilnya selalu kosong.

  Karena itu dibuat varian yang menerima `p_user_id` secara eksplisit. Varian
  ini `security definer` dan HANYA boleh dipanggil service_role. Satu-satunya
  pemanggilnya adalah rute server yang sudah memvalidasi token perangkat dan
  menurunkan user_id darinya. Kalau fungsi ini bisa dipanggil peran
  `authenticated`, siapa pun bisa membaca catatan pengguna lain hanya dengan
  menebak uuid, jadi `revoke` di bawah bukan formalitas.

  Catatan: header ini sengaja memakai komentar blok, bukan deretan `--`.
  Penyalinan ke editor SQL pernah menghilangkan prefiks `--` per baris dan
  membuat prosa ini ikut terbaca sebagai perintah SQL. Komentar blok tetap
  utuh walaupun barisnya ter-reflow.

  Review sebelum apply: file ini tidak dijalankan otomatis.
*/

create or replace function public.search_notes_for_user(
  p_user_id uuid,
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
security definer
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
      where chunks.user_id = p_user_id
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
      where chunks.user_id = p_user_id
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

revoke all on function public.search_notes_for_user(uuid, text, vector, integer)
  from public, anon, authenticated;
grant execute on function public.search_notes_for_user(uuid, text, vector, integer)
  to service_role;

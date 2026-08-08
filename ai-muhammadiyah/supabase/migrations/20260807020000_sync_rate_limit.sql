-- AI Muhammadiyah -- rate limit jembatan sinkronisasi (Langkah 40 Tahap C).
--
-- Sebelum ini, satu token perangkat bisa memanggil /api/notes/sync/* sesering
-- mungkin; satu-satunya rem adalah batas 25 catatan per permintaan. Tiap
-- catatan yang masuk memicu satu panggilan embedding, jadi agen yang salah
-- setel (atau token yang bocor) bisa menguras biaya tanpa batas.
--
-- Penghitungannya WAJIB atomik. Pola "SELECT lalu UPDATE" akan bocor saat dua
-- permintaan datang bersamaan — keduanya membaca angka lama, keduanya lolos.
-- Karena itu dipakai `insert ... on conflict do update ... returning`, yang
-- menaikkan dan mengembalikan nilai barunya dalam satu pernyataan.
--
-- Review sebelum apply: file ini tidak dijalankan otomatis.

create table if not exists public.note_sync_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_kind text not null check (window_kind in ('hour', 'day')),
  window_start timestamptz not null,
  requests integer not null default 0,
  notes integer not null default 0,
  primary key (user_id, window_kind, window_start)
);

-- Untuk memangkas baris lama; jendela yang sudah lewat tidak pernah dibaca.
create index if not exists note_sync_usage_window_idx
  on public.note_sync_usage (window_start);

/**
 * Mengambil jatah dan mengembalikan keputusannya.
 *
 * Batasnya DIKIRIM pemanggil (dari `syncTierLimits` di kode) alih-alih
 * ditanam di sini, supaya angka paket hanya hidup di satu tempat dan bisa
 * ditampilkan di UI tanpa duplikasi. Aman karena satu-satunya pemanggil adalah
 * rute server ber-service-role; klien tidak pernah bisa menyodorkan batasnya
 * sendiri.
 */
create or replace function public.consume_sync_quota(
  p_user_id uuid,
  p_notes integer,
  p_max_requests_hour integer,
  p_max_notes_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hour timestamptz := date_trunc('hour', now());
  v_day timestamptz := date_trunc('day', now());
  v_requests integer;
  v_notes integer;
begin
  insert into public.note_sync_usage (user_id, window_kind, window_start, requests)
  values (p_user_id, 'hour', v_hour, 1)
  on conflict (user_id, window_kind, window_start)
    do update set requests = public.note_sync_usage.requests + 1
  returning requests into v_requests;

  -- Permintaan yang ditolak TETAP dihitung. Kalau tidak, agen yang membanjiri
  -- server justru bebas mencoba tanpa henti begitu jatahnya habis.
  if v_requests > p_max_requests_hour then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'requests',
      'requests', v_requests,
      'maxRequests', p_max_requests_hour,
      'retryAt', v_hour + interval '1 hour'
    );
  end if;

  select coalesce(notes, 0) into v_notes
  from public.note_sync_usage
  where user_id = p_user_id and window_kind = 'day' and window_start = v_day;

  if coalesce(p_notes, 0) > 0 then
    insert into public.note_sync_usage (user_id, window_kind, window_start, notes)
    values (p_user_id, 'day', v_day, p_notes)
    on conflict (user_id, window_kind, window_start)
      do update set notes = public.note_sync_usage.notes + p_notes
    returning notes into v_notes;

    if v_notes > p_max_notes_day then
      -- Jatah yang barusan diambil dikembalikan: batch yang DITOLAK tidak
      -- boleh ikut menghabiskan kuota, kalau tidak satu batch besar yang
      -- gagal akan mengunci sisa harinya tanpa pernah mengerjakan apa pun.
      update public.note_sync_usage
      set notes = public.note_sync_usage.notes - p_notes
      where user_id = p_user_id
        and window_kind = 'day'
        and window_start = v_day;

      return jsonb_build_object(
        'allowed', false,
        'reason', 'notes',
        'notes', v_notes - p_notes,
        'maxNotes', p_max_notes_day,
        'retryAt', v_day + interval '1 day'
      );
    end if;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'requests', v_requests,
    'maxRequests', p_max_requests_hour,
    'notes', coalesce(v_notes, 0),
    'maxNotes', p_max_notes_day
  );
end;
$$;

/**
 * Mengembalikan jatah catatan saat penerapan gagal di tengah jalan.
 *
 * Tanpa ini, kegagalan server berulang akan memakan kuota harian pengguna
 * padahal tidak ada satu catatan pun yang benar-benar tersimpan.
 */
create or replace function public.refund_sync_notes(
  p_user_id uuid,
  p_notes integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.note_sync_usage
  set notes = greatest(0, notes - greatest(coalesce(p_notes, 0), 0))
  where user_id = p_user_id
    and window_kind = 'day'
    and window_start = date_trunc('day', now());
$$;

-- Hanya service role yang boleh menyentuh penghitung ini: RLS menyala tanpa
-- policy apa pun = tertutup total bagi anon/authenticated.
alter table public.note_sync_usage enable row level security;

revoke all on function public.consume_sync_quota(uuid, integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.refund_sync_notes(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.consume_sync_quota(uuid, integer, integer, integer)
  to service_role;
grant execute on function public.refund_sync_notes(uuid, integer) to service_role;

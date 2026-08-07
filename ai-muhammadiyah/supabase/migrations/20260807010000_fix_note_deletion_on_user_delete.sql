-- AI Muhammadiyah -- perbaikan Langkah 40 Tahap C.
--
-- BUG: menghapus AKUN pengguna yang punya catatan selalu gagal dengan
-- "Database error deleting user".
--
-- Sebabnya: menghapus baris di auth.users memicu cascade ke public.notes,
-- lalu trigger `notes_record_deletion` ikut jalan dan mencoba menyisipkan
-- nisan yang menunjuk user_id yang barusan lenyap. Insert itu melanggar
-- foreign key note_deletions.user_id -> auth.users, seluruh transaksi
-- dibatalkan, dan akunnya tidak pernah terhapus.
--
-- Nisan memang tidak ada gunanya dalam keadaan itu: kalau akunnya hilang,
-- tidak ada lagi perangkat yang akan menyinkronkan penghapusan tersebut.
--
-- Terbukti: sebelum perbaikan, admin.deleteUser gagal pada pengguna yang punya
-- catatan tetapi berhasil setelah catatannya dikosongkan lebih dulu.
--
-- Review sebelum apply: file ini tidak dijalankan otomatis.

create or replace function public.record_note_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Kita sedang berada di tengah penghapusan akun; lewati pencatatan nisan.
  if not exists (select 1 from auth.users where id = old.user_id) then
    return old;
  end if;

  insert into public.note_deletions (user_id, title_key, title, deleted_at)
  values (old.user_id, lower(btrim(old.title)), old.title, now())
  on conflict (user_id, title_key)
    do update set deleted_at = now(), title = excluded.title;

  return old;
end;
$$;

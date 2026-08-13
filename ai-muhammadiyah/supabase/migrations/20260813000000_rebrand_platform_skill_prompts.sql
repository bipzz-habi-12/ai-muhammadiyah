-- M-Agent -- Langkah 44 (lanjutan): rebrand nama produk di DATA produksi.
--
-- Rebrand "AI Muhammadiyah" -> "M-Agent" mengganti nama di seluruh kode,
-- termasuk system prompt identitas AI. Tapi prompt skill BAWAAN sudah terlanjur
-- tersimpan sebagai baris di public.skills lewat migrasi seed terdahulu
-- (20260704010000, 20260704020000, 20260725010000, 20260725020000), dan baris
-- itu berbunyi "jaga identitas AI Muhammadiyah". Selama belum diperbarui, AI
-- masih menyebut nama lama setiap kali salah satu skill bawaan aktif -- persis
-- hal yang mau dihilangkan rebrand-nya.
--
-- HANYA skill bawaan platform (owner_id is null) yang disentuh. Skill custom
-- adalah tulisan pengguna sendiri; menulis ulang isinya diam-diam bukan hak
-- kita, sekalipun kebetulan menyebut nama lama.
--
-- Riwayat percakapan (public.messages) juga memuat nama lama pada jawaban lama.
-- Itu catatan historis dari apa yang benar-benar dikatakan saat itu, jadi
-- SENGAJA tidak diubah.
--
-- Idempoten: klausa where membuat pengulangan migrasi ini tidak melakukan apa
-- pun, dan replace() tidak akan merusak baris yang sudah diperbarui.
--
-- Review sebelum apply: file ini tidak dijalankan otomatis. Ini mengubah DATA
-- produksi, jadi backup dulu.

update public.skills
set system_prompt = replace(system_prompt, 'AI Muhammadiyah', 'M-Agent')
where owner_id is null
  and system_prompt like '%AI Muhammadiyah%';

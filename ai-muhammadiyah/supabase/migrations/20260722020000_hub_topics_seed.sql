-- AI Muhammadiyah: Muhammadiyah Hub — expand verified topical entries.
--
-- Builds on 20260722010000 (which added the `keywords` column + shalat seed).
-- Adds real, DEEP-LINK reference entries for the other common worship/practice
-- topics regular users search: puasa, zakat (fitrah/mal/profesi), haji,
-- thaharah, wudhu, tayamum, qurban, aqiqah, nikah, waris.
--
-- HONESTY: every URL below was fetched and confirmed LIVE with content matching
-- its topic (via WebFetch, independent of the sandbox) before being added — no
-- invented links. Sourced from Majelis Tarjih (tarjih.or.id) official pages.
-- Introduces category 'muamalah' (free-text, no schema change) for nikah/waris;
-- the rest reuse 'ibadah'. Idempotent via url unique. Apply manually.

insert into public.hub_resources
  (title, meta, description, url, tag, category, keywords, sort_order)
values
  -- Puasa ------------------------------------------------------------------
  (
    'Tuntunan Ibadah Ramadhan (Puasa)',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'E-book tuntunan ibadah Ramadan dari Majelis Tarjih: tata cara puasa, sahur, berbuka, hingga zakat fitri.',
    'https://tarjih.or.id/download-e-book-tuntunan-ibadah-di-bulan-ramadhan-1441-h-2020-m/',
    'Puasa',
    'ibadah',
    array['puasa','ramadhan','ramadan','shaum','shiyam','sahur','buka puasa','berbuka','tarawih','ibadah'],
    18
  ),
  (
    'Doa Buka Puasa',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Fatwa Tarjih tentang doa berbuka puasa dan waktu membacanya.',
    'https://tarjih.or.id/doa-buka-puasa/',
    'Puasa',
    'ibadah',
    array['puasa','doa','buka puasa','berbuka','ifthar','ramadhan','shaum','ibadah'],
    19
  ),
  -- Zakat ------------------------------------------------------------------
  (
    'Tuntunan Zakat Fitri (Fitrah)',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Tuntunan Majelis Tarjih tentang zakat fitri: kadar, waktu, dan penerimanya.',
    'https://tarjih.or.id/tuntunan-zakat-fitri/',
    'Zakat',
    'ibadah',
    array['zakat','fitrah','fitri','zakat fitrah','ramadhan','beras','sha','ibadah'],
    20
  ),
  (
    'Seputar Zakat Harta (Mal)',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Kumpulan fatwa Tarjih seputar zakat mal: nisab, haul, dan jenis harta yang wajib dizakati.',
    'https://tarjih.or.id/seputar-zakat-1/',
    'Zakat',
    'ibadah',
    array['zakat','mal','harta','zakat mal','nisab','haul','perniagaan','dagang','emas','pertanian','ibadah'],
    21
  ),
  (
    'Zakat Profesi & Gaji Pensiun',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Fatwa Tarjih tentang zakat penghasilan/profesi dan gaji pensiun.',
    'https://tarjih.or.id/zakat-profesi-dan-gaji-pensiun/',
    'Zakat',
    'ibadah',
    array['zakat','profesi','zakat profesi','penghasilan','gaji','pensiun','pendapatan','ibadah'],
    22
  ),
  -- Haji -------------------------------------------------------------------
  (
    'Miqat dalam Ibadah Haji',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Fatwa Tarjih tentang miqat makani dan ihram dalam ibadah haji.',
    'https://tarjih.or.id/miqat-makani-dalam-ibadah-haji/',
    'Haji',
    'ibadah',
    array['haji','umrah','miqat','ihram','manasik','mekah','makkah','ibadah'],
    23
  ),
  -- Thaharah / Wudhu / Tayamum --------------------------------------------
  (
    'Tuntunan Thaharah (Bersuci)',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'E-book tuntunan thaharah: bersuci, najis, wudhu, mandi, dan tayamum.',
    'https://tarjih.or.id/ebook-tuntunan-thaharah-oleh-majelis-tarjih-tajdid-pwm-diy/',
    'Thaharah',
    'ibadah',
    array['thaharah','taharah','bersuci','suci','najis','wudhu','wudu','mandi','tayamum','ibadah'],
    24
  ),
  (
    'Tuntunan Wudhu Menurut Putusan Tarjih',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Materi Pengajian Tarjih: tata cara wudhu menurut Putusan Tarjih (HPT).',
    'https://tarjih.or.id/file-materi-pengajian-tarjih-14-tuntunan-wudhu-menurut-putusan-tarjih/',
    'Thaharah',
    'ibadah',
    array['wudhu','wudu','wuduk','berwudhu','bersuci','thaharah','ibadah'],
    25
  ),
  (
    'Tayamum & Mandi Wajib',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Fatwa Tarjih tentang mandi wajib dan tata cara tayamum sebagai penggantinya.',
    'https://tarjih.or.id/hukum-mandi-wajib-dengan-air-hangat-dan-cara-tayammum-pengganti-mandi/',
    'Thaharah',
    'ibadah',
    array['tayamum','tayammum','mandi wajib','junub','bersuci','thaharah','debu','ibadah'],
    26
  ),
  -- Qurban / Aqiqah --------------------------------------------------------
  (
    'Beberapa Hal Mengenai Ibadah Qurban',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Fatwa Tarjih tentang ibadah qurban: jenis hewan, waktu penyembelihan, dan pembagian daging.',
    'https://tarjih.or.id/beberapa-hal-mengenai-ibadah-qurban-2/',
    'Qurban',
    'ibadah',
    array['qurban','kurban','korban','idul adha','sembelih','penyembelihan','hewan','ibadah'],
    27
  ),
  (
    'Tuntunan Aqiqah dalam Islam',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'E-book tuntunan aqiqah: pengertian, hukum, jumlah hewan, dan waktu pelaksanaannya.',
    'https://tarjih.or.id/ebook-tuntunan-aqiqah-oleh-majelis-tarjih-tajdid-pwm-diy/',
    'Aqiqah',
    'ibadah',
    array['aqiqah','akikah','bayi','kelahiran','anak','sembelih','kambing','ibadah'],
    28
  ),
  -- Muamalah ---------------------------------------------------------------
  (
    'Hukum Nikah Sirri',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Fatwa Tarjih tentang hukum nikah sirri dan pentingnya pencatatan perkawinan.',
    'https://tarjih.or.id/hukum-nikah-sirri/',
    'Nikah',
    'muamalah',
    array['nikah','menikah','pernikahan','kawin','perkawinan','nikah sirri','siri','muamalah'],
    29
  ),
  (
    'Pembagian Warisan Menurut Islam',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Fatwa Tarjih tentang pembagian warisan (faraid) menurut Islam.',
    'https://tarjih.or.id/bagaimana-pembagian-warisan-menurut-islam/',
    'Waris',
    'muamalah',
    array['waris','warisan','kewarisan','faraid','faraidh','ahli waris','harta','muamalah'],
    30
  )
on conflict (url) do nothing;

-- AI Muhammadiyah: Muhammadiyah Hub — searchable keywords + verified topical seed.
--
-- Builds on 20260722000000_hub_resources.sql. Two additive changes:
--   1. `keywords text[]` so an entry can be found by many search terms and
--      spelling variants (sholat / salat / shalat / solat), powering the
--      "type a keyword -> see every related source" behaviour.
--   2. Seed real, DEEP-LINK reference entries about shalat, each pointing to the
--      EXACT article on tarjih.or.id (not a homepage). Every URL below was
--      fetched and verified to return real content matching its topic before
--      being added here — no invented links (project honesty rule).
--
-- Safe to apply anytime after 20260722000000. Idempotent via url unique + IF NOT
-- EXISTS. Written, not auto-applied (apply manually in Supabase SQL editor).

-- 1. keywords column ---------------------------------------------------------

alter table public.hub_resources
  add column if not exists keywords text[] not null default '{}'::text[];

create index if not exists hub_resources_keywords_idx
  on public.hub_resources using gin (keywords);

-- 2. Verified shalat reference entries (category 'ibadah') --------------------
-- URLs verified live (return the correct article) at build time. tarjih.or.id
-- serves some pages with a 500 status header while still rendering full content;
-- they open normally in a browser.

insert into public.hub_resources
  (title, meta, description, url, tag, category, keywords, sort_order)
values
  (
    'Tuntunan Salat Gerhana (Kusufain)',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Putusan Majelis Tarjih tentang tata cara salat kusufain — gerhana matahari maupun bulan.',
    'https://tarjih.or.id/tuntunan-shalat-gerhana-shalat-kusufain/',
    'Shalat',
    'ibadah',
    array['sholat','salat','shalat','solat','gerhana','kusufain','kusuf','khusuf','matahari','bulan','ibadah'],
    11
  ),
  (
    'Salat Sunnah Rawatib & Sunnah Fajar',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Kajian Tarjih tentang salat sunnah rawatib (qabliyah/ba''diyah) dan sunnah fajar sesuai tuntunan Nabi.',
    'https://tarjih.or.id/pengajian-tarjih-17-shalat-sunnah-rawatib-dan-shalat-sunnah-fajar-manhaj-tarjih-muhammadiyah-sunnah-nabi-saw/',
    'Shalat',
    'ibadah',
    array['sholat','salat','shalat','solat','sunnah','sunah','rawatib','qabliyah','badiyah','fajar','tatawwu','ibadah'],
    12
  ),
  (
    'Tata Cara Salat Tahajud & Dhuha',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Tata cara salat tahajud (malam) dan salat dhuha menurut tuntunan Nabi versi Majelis Tarjih.',
    'https://tarjih.or.id/tata-cara-shalat-tahajud-dan-shalat-dhuha/',
    'Shalat',
    'ibadah',
    array['sholat','salat','shalat','solat','sunnah','tahajud','tahajjud','dhuha','duha','malam','qiyamullail','witir','ibadah'],
    13
  ),
  (
    'Pelaksanaan Salat Idul Fitri',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Pelaksanaan dan tata cara salat Idul Fitri menurut Majelis Tarjih.',
    'https://tarjih.or.id/pelaksanaan-dan-cara-shalat-idul-fitri/',
    'Shalat',
    'ibadah',
    array['sholat','salat','shalat','solat','id','idul','fitri','ied','lebaran','hari raya','takbir','ibadah'],
    14
  ),
  (
    'Salat Musafir: Jamak & Qashar',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Fatwa Tarjih tentang salat musafir serta jamak dan qashar saat dalam perjalanan.',
    'https://tarjih.or.id/fatwa-tentang-shalat-musafir-dan-shalat-jama-qashar/',
    'Shalat',
    'ibadah',
    array['sholat','salat','shalat','solat','jamak','jama','qashar','qasar','qosor','musafir','safar','perjalanan','bepergian','ibadah'],
    15
  ),
  (
    'Menyalatkan Jenazah',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Kewajiban terhadap jenazah — termasuk tata cara menyalatkan — menurut Majelis Tarjih.',
    'https://tarjih.or.id/kewajiban-terhadap-jenazah/',
    'Shalat',
    'ibadah',
    array['sholat','salat','shalat','solat','jenazah','jenasah','mayit','mayat','menyalatkan','menshalatkan','kematian','ibadah'],
    16
  ),
  (
    'Hukum Salat Berjamaah',
    'tarjih.or.id · Majelis Tarjih & Tajdid',
    'Fatwa Tarjih tentang hukum salat berjamaah, imam, dan makmum.',
    'https://tarjih.or.id/hukum-shalat-berjamaah/',
    'Shalat',
    'ibadah',
    array['sholat','salat','shalat','solat','berjamaah','jamaah','makmum','imam','wajib','ibadah'],
    17
  )
on conflict (url) do nothing;

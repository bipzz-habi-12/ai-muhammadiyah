-- AI Muhammadiyah: Muhammadiyah Hub backend (hub_resources).
--
-- This is the concrete realization of the "hub_links" integration that CLAUDE.md
-- and earlier migrations kept deferred. The Hub page was a hardcoded curated
-- directory (components/../app/hub/HubDirectory.tsx); this table moves that data
-- into the database so it can be searched server-side and curated by an admin
-- without a code change.
--
-- Ownership / access model mirrors knowledge_sources exactly:
--   * public read for any authenticated user (the Hub is free on every tier,
--     per CLAUDE.md) but only for status='active' and is_public=true rows,
--   * writes gated to platform/hub admins (app_metadata.role='admin' or the
--     hub_admin / knowledge_admin flags). The admin API routes additionally use
--     the service-role client, so RLS here is defense-in-depth.
--
-- Confirmed via grep across all prior migrations: no hub_resources / hub_links
-- table exists yet -- no duplicate-table risk.
--
-- Review before applying: this file is NOT run automatically (same caution
-- pattern as the artifacts / teardown migrations).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. hub_resources: one curated external portal / reference per row
-- ---------------------------------------------------------------------------

create table if not exists public.hub_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0 and char_length(title) <= 240),
  meta text check (char_length(meta) <= 240),
  description text check (char_length(description) <= 600),
  url text not null check (url ~* '^https?://'),
  tag text check (char_length(tag) <= 60),
  category text not null default 'organisasi' check (char_length(category) <= 60),
  icon text check (char_length(icon) <= 8),
  tint text check (char_length(tint) <= 32),
  bg text check (char_length(bg) <= 64),
  is_featured boolean not null default false,
  featured_variant text check (featured_variant in ('green', 'cream')),
  featured_cta text check (char_length(featured_cta) <= 80),
  status text not null default 'active'
    check (status in ('active', 'draft', 'archived')),
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A curated directory should not list the same URL twice; this also makes the
  -- seed below idempotent (on conflict do nothing).
  constraint hub_resources_url_unique unique (url)
);

create index if not exists hub_resources_public_order_idx
  on public.hub_resources (status, is_public, sort_order asc, created_at desc);

create index if not exists hub_resources_category_idx
  on public.hub_resources (category);

drop trigger if exists hub_resources_set_updated_at on public.hub_resources;
create trigger hub_resources_set_updated_at
before update on public.hub_resources
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. RLS: public read (active + public), admin manage
-- ---------------------------------------------------------------------------

alter table public.hub_resources enable row level security;

drop policy if exists "Authenticated users can read active public hub resources"
  on public.hub_resources;
create policy "Authenticated users can read active public hub resources"
on public.hub_resources
for select
to authenticated
using (status = 'active' and is_public = true);

drop policy if exists "Hub admins can manage hub resources"
  on public.hub_resources;
create policy "Hub admins can manage hub resources"
on public.hub_resources
for all
to authenticated
using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'hub_admin')::boolean, false)
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'knowledge_admin')::boolean, false)
)
with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'hub_admin')::boolean, false)
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'knowledge_admin')::boolean, false)
);

-- ---------------------------------------------------------------------------
-- 3. Seed the current curated directory (identical to the previous hardcoded
--    list in HubDirectory.tsx, which now doubles as the app-side fallback).
--    Idempotent via the url unique constraint.
-- ---------------------------------------------------------------------------

insert into public.hub_resources
  (title, meta, description, url, tag, category, icon, tint, bg,
   is_featured, featured_variant, featured_cta, sort_order)
values
  (
    'Majelis Tarjih & Tajdid',
    'tarjih.or.id · Putusan & fatwa resmi',
    'Putusan, fatwa, dan tuntunan resmi Majelis Tarjih — rujukan utama untuk pertanyaan hukum & ibadah.',
    'https://tarjih.or.id',
    'Tarjih',
    'tarjih',
    '۩',
    '#0F5A3D',
    'rgba(15,90,61,0.1)',
    true,
    'green',
    'Buka portal Tarjih →',
    1
  ),
  (
    'Portal Resmi Muhammadiyah',
    'muhammadiyah.or.id · Persyarikatan',
    'Berita, kebijakan, dan informasi resmi Persyarikatan Muhammadiyah.',
    'https://muhammadiyah.or.id',
    'Organisasi',
    'organisasi',
    '◈',
    '#3A453E',
    'rgba(20,40,30,0.08)',
    true,
    'cream',
    'Buka muhammadiyah.or.id →',
    2
  ),
  (
    'Majelis Diktilitbang',
    'diktilitbang.muhammadiyah.or.id · Pendidikan tinggi & penelitian',
    'Majelis Pendidikan Tinggi, Penelitian, dan Pengembangan Muhammadiyah.',
    'https://diktilitbang.muhammadiyah.or.id',
    'Pendidikan',
    'pendidikan',
    '✎',
    '#B08833',
    'rgba(176,136,51,0.14)',
    false,
    null,
    null,
    3
  ),
  (
    'Suara Muhammadiyah',
    'suaramuhammadiyah.id · Media & literasi',
    'Kanal media dan literasi Persyarikatan Muhammadiyah.',
    'https://suaramuhammadiyah.id',
    'Media',
    'media',
    '◑',
    '#2E6E8E',
    'rgba(46,110,142,0.13)',
    false,
    null,
    null,
    4
  )
on conflict (url) do nothing;

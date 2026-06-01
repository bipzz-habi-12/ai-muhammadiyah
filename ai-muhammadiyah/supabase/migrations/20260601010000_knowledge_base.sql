-- Phase 1 RAG knowledge base for AI Muhammadiyah.
-- Uses PostgreSQL full-text search first; pgvector can be added later without
-- changing the source/chunk ownership model.

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 240),
  category text not null default 'general' check (char_length(category) <= 120),
  file_type text not null check (file_type in ('pdf', 'docx', 'pptx', 'xlsx')),
  original_file_name text,
  status text not null default 'active'
    check (status in ('active', 'draft', 'archived')),
  is_public boolean not null default true,
  chunk_count integer not null default 0 check (chunk_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  chunk_order integer not null check (chunk_order >= 0),
  content text not null,
  search_vector tsvector generated always as (to_tsvector('simple', content)) stored,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_id, chunk_order)
);

create index if not exists knowledge_sources_status_public_idx
  on public.knowledge_sources (status, is_public, created_at desc);

create index if not exists knowledge_chunks_source_order_idx
  on public.knowledge_chunks (source_id, chunk_order);

create index if not exists knowledge_chunks_search_idx
  on public.knowledge_chunks using gin (search_vector);

drop trigger if exists knowledge_sources_set_updated_at on public.knowledge_sources;
create trigger knowledge_sources_set_updated_at
before update on public.knowledge_sources
for each row
execute function public.set_updated_at();

create or replace function public.search_knowledge_chunks(
  p_query text,
  p_limit integer default 4
)
returns table (
  source_id uuid,
  source_title text,
  category text,
  chunk_order integer,
  content text,
  rank real
)
language sql
stable
security invoker
set search_path = public
as $$
  with query as (
    select plainto_tsquery('simple', coalesce(nullif(trim(p_query), ''), ' ')) as value
  )
  select
    sources.id as source_id,
    sources.title as source_title,
    sources.category,
    chunks.chunk_order,
    chunks.content,
    ts_rank(chunks.search_vector, query.value) as rank
  from public.knowledge_chunks chunks
  join public.knowledge_sources sources on sources.id = chunks.source_id
  cross join query
  where sources.status = 'active'
    and sources.is_public = true
    and chunks.search_vector @@ query.value
  order by rank desc, sources.created_at desc, chunks.chunk_order asc
  limit greatest(1, least(coalesce(p_limit, 4), 8));
$$;

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;

drop policy if exists "Authenticated users can read active public knowledge sources"
  on public.knowledge_sources;
create policy "Authenticated users can read active public knowledge sources"
on public.knowledge_sources
for select
to authenticated
using (status = 'active' and is_public = true);

drop policy if exists "Authenticated users can read active public knowledge chunks"
  on public.knowledge_chunks;
create policy "Authenticated users can read active public knowledge chunks"
on public.knowledge_chunks
for select
to authenticated
using (
  exists (
    select 1
    from public.knowledge_sources sources
    where sources.id = knowledge_chunks.source_id
      and sources.status = 'active'
      and sources.is_public = true
  )
);

drop policy if exists "Knowledge admins can manage knowledge sources"
  on public.knowledge_sources;
create policy "Knowledge admins can manage knowledge sources"
on public.knowledge_sources
for all
to authenticated
using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'knowledge_admin')::boolean, false)
)
with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'knowledge_admin')::boolean, false)
);

drop policy if exists "Knowledge admins can manage knowledge chunks"
  on public.knowledge_chunks;
create policy "Knowledge admins can manage knowledge chunks"
on public.knowledge_chunks
for all
to authenticated
using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'knowledge_admin')::boolean, false)
)
with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'knowledge_admin')::boolean, false)
);

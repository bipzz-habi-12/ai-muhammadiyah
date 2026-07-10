-- AI Muhammadiyah: Master Plan v2 schema additions -- Workspace System
-- (chat_workspaces.system_instructions), per-message Skill tracking
-- (messages.skill_id, skills.slash_command), and the Artifacts table that
-- replaces docs/tasks/sheets/canvases (dropped in
-- 20260711000000_teardown_v1_tools.sql).
--
-- Confirmed via grep across all prior migrations: system_instructions,
-- messages.skill_id, and skills.slash_command do not exist yet anywhere --
-- no duplicate-column risk.
--
-- artifacts RLS copies the messages table's ownership pattern (join through
-- conversations.user_id = auth.uid()) rather than joining through
-- chat_workspaces -- conversations.user_id is already the direct owner
-- column, same one-hop shape as messages -> conversations.
--
-- Review before applying: this file is not run automatically.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Workspace System: permanent per-workspace system prompt
-- ---------------------------------------------------------------------------

alter table public.chat_workspaces
  add column if not exists system_instructions text;

-- ---------------------------------------------------------------------------
-- 2. Per-message skill tracking (replaces skill_change_log)
-- ---------------------------------------------------------------------------

alter table public.messages
  add column if not exists skill_id uuid references public.skills(id) on delete set null;

create index if not exists messages_skill_id_idx
  on public.messages (skill_id);

-- ---------------------------------------------------------------------------
-- 3. Skill slash commands
-- ---------------------------------------------------------------------------

alter table public.skills
  add column if not exists slash_command text
    constraint skills_slash_command_unique unique;

-- ---------------------------------------------------------------------------
-- 4. artifacts (replaces docs/tasks/sheets/canvases)
--    Ownership inherited from conversations.user_id, mirroring the existing
--    messages -> conversations RLS pattern.
-- ---------------------------------------------------------------------------

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  type text not null check (
    type in ('document', 'table', 'diagram', 'code', 'html_app', 'react_app')
  ),
  title text not null default 'Untitled',
  content jsonb not null default '{}'::jsonb,
  runtime text check (runtime in ('html', 'react')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artifacts_conversation_updated_idx
  on public.artifacts (conversation_id, updated_at desc);

drop trigger if exists artifacts_set_updated_at on public.artifacts;
create trigger artifacts_set_updated_at
before update on public.artifacts
for each row execute function public.set_updated_at();

alter table public.artifacts enable row level security;

drop policy if exists "Users can read own artifacts" on public.artifacts;
create policy "Users can read own artifacts"
on public.artifacts
for select
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = artifacts.conversation_id
      and conversations.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own artifacts" on public.artifacts;
create policy "Users can create own artifacts"
on public.artifacts
for insert
with check (
  exists (
    select 1
    from public.conversations
    where conversations.id = artifacts.conversation_id
      and conversations.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own artifacts" on public.artifacts;
create policy "Users can update own artifacts"
on public.artifacts
for update
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = artifacts.conversation_id
      and conversations.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.conversations
    where conversations.id = artifacts.conversation_id
      and conversations.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own artifacts" on public.artifacts;
create policy "Users can delete own artifacts"
on public.artifacts
for delete
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = artifacts.conversation_id
      and conversations.user_id = auth.uid()
  )
);

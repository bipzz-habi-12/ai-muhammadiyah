-- AI Muhammadiyah: Skills + Docs/Tasks/Sheets/Canvas (4 tools baru) + skill_change_log.
-- Extends chat_workspaces (icon/color/skill_id/persona_config) instead of renaming it.
-- hub_links is intentionally NOT created here (deferred to a later phase).
-- Review before applying: this file is not run automatically.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Extend chat_workspaces
-- ---------------------------------------------------------------------------

alter table public.chat_workspaces
  add column if not exists icon text,
  add column if not exists color text,
  add column if not exists persona_config jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. skills
-- ---------------------------------------------------------------------------

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  category text check (char_length(category) <= 120),
  system_prompt text not null,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skills_owner_is_custom_match check (
    (owner_id is null and is_custom = false)
    or (owner_id is not null and is_custom = true)
  )
);

create index if not exists skills_owner_id_idx
  on public.skills (owner_id);

drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at
before update on public.skills
for each row execute function public.set_updated_at();

alter table public.skills enable row level security;

drop policy if exists "Authenticated users can read platform and own skills" on public.skills;
create policy "Authenticated users can read platform and own skills"
on public.skills
for select
to authenticated
using (owner_id is null or owner_id = auth.uid());

drop policy if exists "Users can create own custom skills" on public.skills;
create policy "Users can create own custom skills"
on public.skills
for insert
to authenticated
with check (owner_id = auth.uid() and is_custom = true);

drop policy if exists "Users can update own custom skills" on public.skills;
create policy "Users can update own custom skills"
on public.skills
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid() and is_custom = true);

drop policy if exists "Users can delete own custom skills" on public.skills;
create policy "Users can delete own custom skills"
on public.skills
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Skill admins can manage platform skills" on public.skills;
create policy "Skill admins can manage platform skills"
on public.skills
for all
to authenticated
using (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'skill_admin')::boolean, false)
)
with check (
  coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
  or coalesce((auth.jwt() -> 'app_metadata' ->> 'skill_admin')::boolean, false)
);

-- ---------------------------------------------------------------------------
-- 3. chat_workspaces.skill_id (added after skills exists so the FK can resolve)
-- ---------------------------------------------------------------------------

alter table public.chat_workspaces
  add column if not exists skill_id uuid references public.skills(id) on delete set null;

create index if not exists chat_workspaces_skill_id_idx
  on public.chat_workspaces (skill_id);

-- ---------------------------------------------------------------------------
-- 4. docs / tasks / sheets / canvases
--    Ownership is inherited from chat_workspaces (workspace_id -> chat_workspaces.user_id),
--    mirroring the existing messages -> conversations RLS pattern.
-- ---------------------------------------------------------------------------

create table if not exists public.docs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.chat_workspaces(id) on delete cascade,
  title text not null default 'Untitled',
  content text not null default '',
  source_ref uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.chat_workspaces(id) on delete cascade,
  title text not null default 'Untitled',
  tasks jsonb not null default '[]'::jsonb,
  source_ref uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sheets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.chat_workspaces(id) on delete cascade,
  title text not null default 'Untitled',
  data jsonb not null default '[]'::jsonb,
  source_ref uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canvases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.chat_workspaces(id) on delete cascade,
  title text not null default 'Untitled',
  nodes jsonb not null default '[]'::jsonb,
  source_ref uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists docs_workspace_updated_idx
  on public.docs (workspace_id, updated_at desc);

create index if not exists tasks_workspace_updated_idx
  on public.tasks (workspace_id, updated_at desc);

create index if not exists sheets_workspace_updated_idx
  on public.sheets (workspace_id, updated_at desc);

create index if not exists canvases_workspace_updated_idx
  on public.canvases (workspace_id, updated_at desc);

drop trigger if exists docs_set_updated_at on public.docs;
create trigger docs_set_updated_at
before update on public.docs
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists sheets_set_updated_at on public.sheets;
create trigger sheets_set_updated_at
before update on public.sheets
for each row execute function public.set_updated_at();

drop trigger if exists canvases_set_updated_at on public.canvases;
create trigger canvases_set_updated_at
before update on public.canvases
for each row execute function public.set_updated_at();

alter table public.docs enable row level security;
alter table public.tasks enable row level security;
alter table public.sheets enable row level security;
alter table public.canvases enable row level security;

-- docs policies
drop policy if exists "Users can read own docs" on public.docs;
create policy "Users can read own docs"
on public.docs
for select
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = docs.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own docs" on public.docs;
create policy "Users can create own docs"
on public.docs
for insert
with check (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = docs.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own docs" on public.docs;
create policy "Users can update own docs"
on public.docs
for update
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = docs.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = docs.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own docs" on public.docs;
create policy "Users can delete own docs"
on public.docs
for delete
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = docs.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

-- tasks policies
drop policy if exists "Users can read own tasks" on public.tasks;
create policy "Users can read own tasks"
on public.tasks
for select
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = tasks.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks"
on public.tasks
for insert
with check (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = tasks.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
on public.tasks
for update
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = tasks.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = tasks.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
on public.tasks
for delete
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = tasks.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

-- sheets policies
drop policy if exists "Users can read own sheets" on public.sheets;
create policy "Users can read own sheets"
on public.sheets
for select
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = sheets.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own sheets" on public.sheets;
create policy "Users can create own sheets"
on public.sheets
for insert
with check (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = sheets.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own sheets" on public.sheets;
create policy "Users can update own sheets"
on public.sheets
for update
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = sheets.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = sheets.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own sheets" on public.sheets;
create policy "Users can delete own sheets"
on public.sheets
for delete
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = sheets.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

-- canvases policies
drop policy if exists "Users can read own canvases" on public.canvases;
create policy "Users can read own canvases"
on public.canvases
for select
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = canvases.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own canvases" on public.canvases;
create policy "Users can create own canvases"
on public.canvases
for insert
with check (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = canvases.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own canvases" on public.canvases;
create policy "Users can update own canvases"
on public.canvases
for update
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = canvases.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = canvases.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own canvases" on public.canvases;
create policy "Users can delete own canvases"
on public.canvases
for delete
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = canvases.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- 5. skill_change_log (append-only audit trail; no update/delete policies)
-- ---------------------------------------------------------------------------

create table if not exists public.skill_change_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.chat_workspaces(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists skill_change_log_workspace_changed_idx
  on public.skill_change_log (workspace_id, changed_at desc);

alter table public.skill_change_log enable row level security;

drop policy if exists "Users can read own skill change log" on public.skill_change_log;
create policy "Users can read own skill change log"
on public.skill_change_log
for select
using (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = skill_change_log.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

drop policy if exists "Users can append own skill change log" on public.skill_change_log;
create policy "Users can append own skill change log"
on public.skill_change_log
for insert
with check (
  exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = skill_change_log.workspace_id
      and chat_workspaces.user_id = auth.uid()
  )
);

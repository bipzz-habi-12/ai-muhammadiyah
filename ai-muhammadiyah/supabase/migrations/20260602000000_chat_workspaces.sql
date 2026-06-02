-- Workspace and organization metadata for AI Muhammadiyah chats.
-- Safe for existing conversations: old rows remain in the General workspace.

create extension if not exists pgcrypto;

create table if not exists public.chat_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_workspaces_name_not_blank check (length(btrim(name)) > 0),
  constraint chat_workspaces_user_name_unique unique (user_id, name)
);

alter table public.conversations
  add column if not exists workspace_id uuid references public.chat_workspaces(id) on delete set null,
  add column if not exists is_pinned boolean not null default false;

create index if not exists chat_workspaces_user_name_idx
  on public.chat_workspaces (user_id, name);

create index if not exists conversations_user_pinned_updated_idx
  on public.conversations (user_id, is_pinned desc, updated_at desc);

create index if not exists conversations_workspace_updated_idx
  on public.conversations (workspace_id, updated_at desc);

create or replace function public.ensure_conversation_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.workspace_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = new.workspace_id
      and chat_workspaces.user_id = new.user_id
  ) then
    raise exception 'Conversation workspace must belong to the same user.';
  end if;

  return new;
end;
$$;

drop trigger if exists conversations_workspace_owner on public.conversations;
create trigger conversations_workspace_owner
before insert or update of workspace_id, user_id on public.conversations
for each row execute function public.ensure_conversation_workspace_owner();

drop trigger if exists chat_workspaces_set_updated_at on public.chat_workspaces;
create trigger chat_workspaces_set_updated_at
before update on public.chat_workspaces
for each row execute function public.set_updated_at();

alter table public.chat_workspaces enable row level security;

drop policy if exists "Users can read own chat workspaces" on public.chat_workspaces;
create policy "Users can read own chat workspaces"
on public.chat_workspaces
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own chat workspaces" on public.chat_workspaces;
create policy "Users can create own chat workspaces"
on public.chat_workspaces
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own chat workspaces" on public.chat_workspaces;
create policy "Users can update own chat workspaces"
on public.chat_workspaces
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own chat workspaces" on public.chat_workspaces;
create policy "Users can delete own chat workspaces"
on public.chat_workspaces
for delete
using (auth.uid() = user_id);

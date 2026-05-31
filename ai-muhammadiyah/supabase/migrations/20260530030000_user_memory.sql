-- AI Muhammadiyah lightweight learning profile memory.
-- Run this after 20260530020000_fix_usage_defaults.sql.

create table if not exists public.user_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  school_level text check (char_length(school_level) <= 80),
  learning_goals text check (char_length(learning_goals) <= 400),
  favorite_subjects text[] not null default '{}'::text[]
    check (array_length(favorite_subjects, 1) is null or array_length(favorite_subjects, 1) <= 8),
  preferred_language text check (char_length(preferred_language) <= 60),
  preferred_explanation_style text check (char_length(preferred_explanation_style) <= 220),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_memory_user_id_idx
  on public.user_memory (user_id);

drop trigger if exists user_memory_set_updated_at on public.user_memory;
create trigger user_memory_set_updated_at
before update on public.user_memory
for each row execute function public.set_updated_at();

alter table public.user_memory enable row level security;

drop policy if exists "Users can read own memory" on public.user_memory;
create policy "Users can read own memory"
on public.user_memory
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create own memory" on public.user_memory;
create policy "Users can create own memory"
on public.user_memory
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own memory" on public.user_memory;
create policy "Users can update own memory"
on public.user_memory
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

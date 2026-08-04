-- LANJUTAN WAJIB dari 20260801000000.
--
-- Migrasi sebelumnya baru membereskan usage_logs + allowed_models. Ternyata
-- `conversations.selected_model` dan `messages.selected_model` (dibuat di
-- 20260530000000_chat_history.sql) JUGA punya CHECK yang hanya mengizinkan id
-- lama ('auto','fast','smart','document') dan default 'auto'.
--
-- Tanpa migrasi ini chat RUSAK TOTAL setelah deploy: setiap insert conversation
-- / message memakai id model baru ('cosmos', dst.) akan ditolak constraint.
-- Terbukti nyata saat mencoba memetakan data lama:
--   "new row ... violates check constraint conversations_selected_model_check"
--
-- Id lama tetap diizinkan supaya baris historis (mis. messages lama) tidak
-- melanggar. Default diubah ke 'cosmos' (model default aplikasi).
--
-- Review before applying: this file is not run automatically.

-- ---------------------------------------------------------------------------
-- 1. conversations.selected_model
-- ---------------------------------------------------------------------------

alter table public.conversations
  drop constraint if exists conversations_selected_model_check;

do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_attribute att
      on att.attrelid = rel.oid
     and att.attnum = any (con.conkey)
    where nsp.nspname = 'public'
      and rel.relname = 'conversations'
      and con.contype = 'c'
      and att.attname = 'selected_model'
  loop
    execute format(
      'alter table public.conversations drop constraint %I',
      v_constraint
    );
  end loop;
end $$;

alter table public.conversations
  alter column selected_model set default 'cosmos';

alter table public.conversations
  add constraint conversations_selected_model_check check (
    selected_model in (
      'aether', 'cosmos', 'prism', 'velo',
      'auto', 'fast', 'smart', 'document'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. messages.selected_model
-- ---------------------------------------------------------------------------

alter table public.messages
  drop constraint if exists messages_selected_model_check;

do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_attribute att
      on att.attrelid = rel.oid
     and att.attnum = any (con.conkey)
    where nsp.nspname = 'public'
      and rel.relname = 'messages'
      and con.contype = 'c'
      and att.attname = 'selected_model'
  loop
    execute format(
      'alter table public.messages drop constraint %I',
      v_constraint
    );
  end loop;
end $$;

alter table public.messages
  alter column selected_model set default 'cosmos';

alter table public.messages
  add constraint messages_selected_model_check check (
    selected_model in (
      'aether', 'cosmos', 'prism', 'velo',
      'auto', 'fast', 'smart', 'document'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. user_memory.default_model — preferensi "Default AI model" di Settings.
--    Punya CHECK id lama juga (20260531000000), jadi menyimpan preferensi ke
--    model baru akan ditolak tanpa perbaikan ini.
-- ---------------------------------------------------------------------------

do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_attribute att
      on att.attrelid = rel.oid
     and att.attnum = any (con.conkey)
    where nsp.nspname = 'public'
      and rel.relname = 'user_memory'
      and con.contype = 'c'
      and att.attname = 'default_model'
  loop
    execute format(
      'alter table public.user_memory drop constraint %I',
      v_constraint
    );
  end loop;
end $$;

alter table public.user_memory
  alter column default_model set default 'cosmos';

alter table public.user_memory
  add constraint user_memory_default_model_check check (
    default_model in (
      'aether', 'cosmos', 'prism', 'velo',
      'auto', 'fast', 'smart', 'document'
    )
  );

-- Preferensi model lama -> model baru terdekat.
update public.user_memory set default_model = 'cosmos' where default_model in ('auto', 'smart');
update public.user_memory set default_model = 'aether' where default_model = 'fast';
update public.user_memory set default_model = 'velo'   where default_model = 'document';

-- ---------------------------------------------------------------------------
-- 4. Pindahkan percakapan lama ke model baru terdekat, supaya id lama tidak
--    lagi dipakai data hidup. `messages` historis sengaja DIBIARKAN apa adanya
--    (catatan model yang benar-benar dipakai saat itu).
-- ---------------------------------------------------------------------------

update public.conversations set selected_model = 'cosmos' where selected_model in ('auto', 'smart');
update public.conversations set selected_model = 'aether' where selected_model = 'fast';
update public.conversations set selected_model = 'velo'   where selected_model = 'document';

-- Incremental production performance indexes for AI Muhammadiyah.
-- Safe to run after the workspace migration: no tables or columns are recreated.

create extension if not exists pg_trgm;

-- Workspace and recency filters used by the chat sidebar and workspace views.
create index if not exists conversations_workspace_idx
  on public.conversations (workspace_id);

create index if not exists conversations_updated_at_idx
  on public.conversations (updated_at desc);

-- Chat search uses ilike on conversation titles and message content.
create index if not exists conversations_title_trgm_idx
  on public.conversations using gin (title gin_trgm_ops);

create index if not exists messages_content_trgm_idx
  on public.messages using gin (content gin_trgm_ops);

-- Explicit conversation lookup index for message reads and joins.
-- The earlier chat history migration also adds conversation_id + created_at;
-- this narrower index is kept for direct equality filters.
create index if not exists messages_conversation_id_idx
  on public.messages (conversation_id);

-- AI Muhammadiyah: teardown of the deprecated v1 "4 rigid tools" (Docs/Tasks/
-- Sheets/Canvas) + skill_change_log, per Master Plan v2 (see CLAUDE.md).
-- Docs and Tasks were merged to main and had real production data/usage;
-- Sheets and Canvas tables were created by the same migration but never had
-- any application code wired to them on main. skill_change_log is superseded
-- by messages.skill_id (added in 20260711010000_artifacts_and_workspace_system.sql).
--
-- Does NOT touch public.skills or the chat_workspaces columns added alongside
-- these tables (icon, color, persona_config, skill_id) -- those stay in use.
--
-- cascade drops each table's own RLS policies, set_updated_at trigger, and
-- indexes automatically (Postgres drops table-owned objects with the table).
--
-- Review before applying: this file is not run automatically.

drop table if exists public.skill_change_log cascade;
drop table if exists public.canvases cascade;
drop table if exists public.sheets cascade;
drop table if exists public.tasks cascade;
drop table if exists public.docs cascade;

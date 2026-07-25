-- Backfill slash_command for the 7 platform skills seeded in
-- 20260704010000_seed_platform_skills.sql. The slash_command column was added
-- in 20260711010000_artifacts_and_workspace_system.sql but never populated, so
-- the "/" slash picker in the composer (Composer.tsx) matches nothing and looks
-- broken. This gives each platform skill a unique, memorable command.
--
-- slash_command has a global UNIQUE constraint (skills_slash_command_unique),
-- so these values also reserve the commands against custom skills. Each update
-- is guarded by "slash_command is null" so re-running this migration (or running
-- it after an admin has hand-set a command) never clobbers an existing value.
--
-- Review before applying: this file is not run automatically.

update public.skills set slash_command = '/ringkas'
  where owner_id is null and name = 'Quick Explain'  and slash_command is null;

update public.skills set slash_command = '/tutor'
  where owner_id is null and name = 'Cambridge Tutor' and slash_command is null;

update public.skills set slash_command = '/osn'
  where owner_id is null and name = 'OSN Coach'       and slash_command is null;

update public.skills set slash_command = '/islam'
  where owner_id is null and name = 'Islamic Teacher' and slash_command is null;

update public.skills set slash_command = '/coding'
  where owner_id is null and name = 'Coding Mentor'   and slash_command is null;

update public.skills set slash_command = '/riset'
  where owner_id is null and name = 'Research Mode'   and slash_command is null;

update public.skills set slash_command = '/langkah'
  where owner_id is null and name = 'Step-by-Step'    and slash_command is null;

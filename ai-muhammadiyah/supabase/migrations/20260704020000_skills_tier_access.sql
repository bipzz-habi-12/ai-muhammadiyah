-- Add tier-gating and a premium system_prompt variant to skills, and backfill
-- the 7 platform skills seeded in 20260704010000_seed_platform_skills.sql
-- from their original access level in lib/study-modes.ts.
--
-- min_tier uses the real SubscriptionTier slugs from lib/usage/limits.ts /
-- lib/subscriptions/plans.ts ('free' | 'kader_pintar' | 'muallim_pro' |
-- 'dakwah_digital' | 'sinergi_ranting') -- there is no 'basic'/'advanced'/
-- 'premium' tier anywhere in the codebase. study-modes.ts's isPremiumTier()
-- only checks tier !== 'free', so "premium" access modes are unlocked
-- starting at the cheapest paid tier, kader_pintar.
--
-- Review before applying: this file is not run automatically.

alter table public.skills
  add column if not exists min_tier text not null default 'free'
    constraint skills_min_tier_valid check (
      min_tier in (
        'free',
        'kader_pintar',
        'muallim_pro',
        'dakwah_digital',
        'sinergi_ranting'
      )
    ),
  add column if not exists system_prompt_premium text;

-- ---------------------------------------------------------------------------
-- Backfill min_tier for the 7 platform skills (owner_id is null).
-- ---------------------------------------------------------------------------

update public.skills
set min_tier = 'free'
where owner_id is null
  and name in ('Quick Explain', 'Cambridge Tutor', 'Islamic Teacher', 'Coding Mentor');

update public.skills
set min_tier = 'kader_pintar'
where owner_id is null
  and name in ('OSN Coach', 'Research Mode', 'Step-by-Step');

-- ---------------------------------------------------------------------------
-- Backfill system_prompt_premium for Cambridge Tutor (the only "tiered"
-- study mode with a distinct premium-depth prompt in createStudyModeSystemPrompt).
-- ---------------------------------------------------------------------------

update public.skills
set system_prompt_premium = 'STUDY MODE:
Active mode: Cambridge Tutor.
Apply this mode as a lightweight teaching style while preserving the AI Muhammadiyah identity, user memory, and document priority rules.
- Use Advanced Cambridge depth: structured concepts, exam technique, common traps, and polished model-answer reasoning.
- Explain like a careful Cambridge teacher.
- Include exam-style reasoning when the question is academic or problem-based.
- Keep the answer structured and understandable.'
where owner_id is null
  and name = 'Cambridge Tutor';

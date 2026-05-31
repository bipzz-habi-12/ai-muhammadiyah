-- AI Muhammadiyah settings preferences stored with the existing learning memory.

alter table public.user_memory
  add column if not exists theme_preference text not null default 'system'
    check (theme_preference in ('system', 'light', 'dark')),
  add column if not exists default_model text not null default 'auto'
    check (default_model in ('auto', 'fast', 'smart', 'document')),
  add column if not exists default_study_mode text not null default 'Kajian umum'
    check (char_length(default_study_mode) <= 80);

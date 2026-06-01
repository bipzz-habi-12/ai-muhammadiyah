-- Persist AI Muhammadiyah study mode choices on chat history.

alter table public.conversations
  add column if not exists study_mode text not null default 'cambridge_tutor'
    check (
      study_mode in (
        'quick_explain',
        'cambridge_tutor',
        'osn_coach',
        'islamic_teacher',
        'coding_mentor',
        'research_mode',
        'step_by_step'
      )
    );

alter table public.messages
  add column if not exists study_mode text not null default 'cambridge_tutor'
    check (
      study_mode in (
        'quick_explain',
        'cambridge_tutor',
        'osn_coach',
        'islamic_teacher',
        'coding_mentor',
        'research_mode',
        'step_by_step'
      )
    );

alter table public.user_memory
  alter column default_study_mode set default 'cambridge_tutor';

update public.user_memory
set default_study_mode = case default_study_mode
  when 'Tanya jawab cepat' then 'quick_explain'
  when 'Latihan soal' then 'step_by_step'
  when 'Kajian umum' then 'cambridge_tutor'
  when 'Ringkasan materi' then 'cambridge_tutor'
  when 'Persiapan ujian' then 'cambridge_tutor'
  else default_study_mode
end
where default_study_mode in (
  'Tanya jawab cepat',
  'Latihan soal',
  'Kajian umum',
  'Ringkasan materi',
  'Persiapan ujian'
);

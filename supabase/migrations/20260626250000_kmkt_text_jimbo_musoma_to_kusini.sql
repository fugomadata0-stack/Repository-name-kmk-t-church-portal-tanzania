-- Sasisha maandishi ya mfumo: "Jimbo la Musoma" → "Jimbo la Musoma Kusini"
-- (isipokuwa tayari "Kusini" au "Kaskazini").

-- Matukio
update public.events
set
  description = regexp_replace(
    description,
    E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)',
    'Jimbo la Musoma Kusini',
    'g'
  ),
  organizer = regexp_replace(
    coalesce(organizer, ''),
    E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)',
    'Jimbo la Musoma Kusini',
    'g'
  )
where description ~* E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)'
   or organizer ~* E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)';

-- Mawasiliano
update public.communications
set
  title = regexp_replace(title, E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)', 'Jimbo la Musoma Kusini', 'g'),
  message = regexp_replace(message, E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)', 'Jimbo la Musoma Kusini', 'g'),
  subject = regexp_replace(coalesce(subject, ''), E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)', 'Jimbo la Musoma Kusini', 'g'),
  updated_at = now()
where title ~* E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)'
   or message ~* E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)'
   or coalesce(subject, '') ~* E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)';

update public.communications
set target_group = 'Jimbo la Musoma Kusini', updated_at = now()
where lower(trim(coalesce(target_group, ''))) = lower('Jimbo la Musoma');

-- Habari
update public.news_posts
set
  content = regexp_replace(content, E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)', 'Jimbo la Musoma Kusini', 'g'),
  summary = regexp_replace(coalesce(summary, ''), E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)', 'Jimbo la Musoma Kusini', 'g')
where content ~* E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)'
   or coalesce(summary, '') ~* E'Jimbo la Musoma(?! Kusini)(?! Kaskazini)';

-- Waumini (safu ya maandishi)
update public.church_members
set jimbo_name = 'Jimbo la Musoma Kusini', updated_at = now()
where lower(trim(coalesce(jimbo_name, ''))) = lower('Jimbo la Musoma');

-- Mistari ya mapato (branch_center)
update public.church_income_lines
set branch_center = 'Jimbo la Musoma Kusini', updated_at = now()
where lower(trim(coalesce(branch_center, ''))) = lower('Jimbo la Musoma');

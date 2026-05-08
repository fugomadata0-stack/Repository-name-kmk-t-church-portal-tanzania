-- PHASE 8 strict role-aware RLS
create or replace function public.current_app_role()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'app_role')::text, 'member') $$;
create or replace function public.current_dayosisi()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'dayosisi')::text, '') $$;
create or replace function public.current_tawi()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'tawi')::text, '') $$;

alter table public.events enable row level security;
alter table public.camps enable row level security;
alter table public.event_participants enable row level security;
alter table public.camp_participants enable row level security;
alter table public.camp_speakers enable row level security;
alter table public.camp_budgets enable row level security;
alter table public.camp_attendance enable row level security;
alter table public.camp_media enable row level security;
alter table public.scheduled_messages enable row level security;

drop policy if exists "events_select_strict" on public.events;
create policy "events_select_strict" on public.events for select to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'member' and status in ('planned','active'))
);
drop policy if exists "events_rw_strict" on public.events;
create policy "events_rw_strict" on public.events for all to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
)
with check (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
);

drop policy if exists "camps_select_strict" on public.camps;
create policy "camps_select_strict" on public.camps for select to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
  or (public.current_app_role() = 'member' and status in ('planned','active'))
);
drop policy if exists "camps_rw_strict" on public.camps;
create policy "camps_rw_strict" on public.camps for all to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
)
with check (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
);

drop policy if exists "event_participants_rw_strict" on public.event_participants;
create policy "event_participants_rw_strict" on public.event_participants for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'));

drop policy if exists "camp_participants_rw_strict" on public.camp_participants;
create policy "camp_participants_rw_strict" on public.camp_participants for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'));

drop policy if exists "camp_speakers_rw_strict" on public.camp_speakers;
create policy "camp_speakers_rw_strict" on public.camp_speakers for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'));

drop policy if exists "camp_budgets_rw_strict" on public.camp_budgets;
create policy "camp_budgets_rw_strict" on public.camp_budgets for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji'));

drop policy if exists "camp_attendance_rw_strict" on public.camp_attendance;
create policy "camp_attendance_rw_strict" on public.camp_attendance for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'));

drop policy if exists "camp_media_rw_strict" on public.camp_media;
create policy "camp_media_rw_strict" on public.camp_media for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'));

drop policy if exists "scheduled_messages_rw_strict" on public.scheduled_messages;
create policy "scheduled_messages_rw_strict" on public.scheduled_messages for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','mchungaji','kiongozi_idara'));

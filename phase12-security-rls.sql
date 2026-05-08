create or replace function public.current_app_role()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'app_role')::text, 'member') $$;

alter table public.media_items enable row level security;
alter table public.sermon_featured enable row level security;
alter table public.live_stream_sessions enable row level security;
alter table public.media_logs enable row level security;

drop policy if exists "media_items_select_strict" on public.media_items;
create policy "media_items_select_strict" on public.media_items
for select to authenticated
using (
  public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi')
  or (public.current_app_role() = 'member' and visibility in ('public','members') and status = 'published')
);

drop policy if exists "media_items_rw_strict" on public.media_items;
create policy "media_items_rw_strict" on public.media_items
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'));

drop policy if exists "sermon_featured_rw_strict" on public.sermon_featured;
create policy "sermon_featured_rw_strict" on public.sermon_featured
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','media_admin'))
with check (public.current_app_role() in ('super_admin','admin','media_admin'));

drop policy if exists "live_sessions_rw_strict" on public.live_stream_sessions;
create policy "live_sessions_rw_strict" on public.live_stream_sessions
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','media_admin'))
with check (public.current_app_role() in ('super_admin','admin','media_admin'));

drop policy if exists "media_logs_insert_strict" on public.media_logs;
create policy "media_logs_insert_strict" on public.media_logs
for insert to authenticated
with check (public.current_app_role() in ('super_admin','admin','media_admin','askofu_dayosisi'));

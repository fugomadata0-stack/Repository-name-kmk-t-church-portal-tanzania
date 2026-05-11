-- Public dashboard live data access.
-- Expose only aggregate counts via RPC and public-safe listing rows for published content.

create or replace function public.portal_public_dashboard_counts()
returns table (
  dayosisi bigint,
  majimbo bigint,
  matawi bigint,
  waumini bigint,
  viongozi bigint,
  nyaraka bigint,
  matukio bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.dayosisi)::bigint as dayosisi,
    (select count(*) from public.church_jimbo)::bigint as majimbo,
    (select count(*) from public.church_tawi)::bigint as matawi,
    (select count(*) from public.church_members)::bigint as waumini,
    (select count(*) from public.church_viongozi)::bigint as viongozi,
    (select count(*) from public.documents where coalesce(status, 'active') in ('active', 'published'))::bigint as nyaraka,
    (select count(*) from public.events where coalesce(is_public, false) = true and coalesce(status, 'upcoming') in ('upcoming', 'ongoing'))::bigint as matukio;
$$;

comment on function public.portal_public_dashboard_counts() is
  'Returns aggregate public dashboard counts only; no private row data is exposed.';

revoke all on function public.portal_public_dashboard_counts() from public;
grant execute on function public.portal_public_dashboard_counts() to anon, authenticated;

grant select (id, title, created_at, status, is_public) on table public.news_posts to anon;
grant select (id, title, event_date, location, status, is_public) on table public.events to anon;
grant select (id, title, category, created_at, status) on table public.documents to anon;
grant select (id, title, stream_url, is_public, is_live) on table public.live_streams to anon;
grant select (id, title, preacher, date, status) on table public.sermons to anon;

drop policy if exists "news_posts_select_anon_public_published" on public.news_posts;
create policy "news_posts_select_anon_public_published"
  on public.news_posts for select to anon
  using (coalesce(is_public, false) = true and coalesce(status, 'draft') = 'published');

drop policy if exists "events_select_anon_public_active" on public.events;
create policy "events_select_anon_public_active"
  on public.events for select to anon
  using (coalesce(is_public, false) = true and coalesce(status, 'upcoming') in ('upcoming', 'ongoing'));

drop policy if exists "documents_select_anon_public_active" on public.documents;
create policy "documents_select_anon_public_active"
  on public.documents for select to anon
  using (coalesce(status, 'active') in ('active', 'published'));

drop policy if exists "live_streams_select_anon_public_live" on public.live_streams;
create policy "live_streams_select_anon_public_live"
  on public.live_streams for select to anon
  using (coalesce(is_public, false) = true and coalesce(is_live, false) = true);

drop policy if exists "sermons_select_anon_public_active" on public.sermons;
create policy "sermons_select_anon_public_active"
  on public.sermons for select to anon
  using (coalesce(status, 'active') in ('active', 'published'));

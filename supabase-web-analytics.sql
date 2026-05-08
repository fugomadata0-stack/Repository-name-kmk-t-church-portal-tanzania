-- Web analytics tables for KMK(T) portal
-- Run in Supabase SQL Editor.

create table if not exists public.web_visit_events (
  id bigserial primary key,
  visitor_id text not null,
  session_id text not null,
  page text not null,
  referrer text,
  role text,
  actor_name text,
  actor_email text,
  country text,
  city text,
  ip_hint text,
  user_agent text,
  language text,
  timezone text,
  created_at timestamptz default now()
);

create table if not exists public.web_online_presence (
  session_id text primary key,
  visitor_id text not null,
  actor_name text,
  actor_email text,
  role text,
  country text,
  city text,
  current_page text,
  last_seen timestamptz default now(),
  is_online boolean default true
);

alter table public.web_visit_events enable row level security;
alter table public.web_online_presence enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='web_visit_events' and policyname='web_visit_events_auth_all') then
    create policy web_visit_events_auth_all
    on public.web_visit_events
    for all
    to authenticated
    using (true)
    with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='web_online_presence' and policyname='web_online_presence_auth_all') then
    create policy web_online_presence_auth_all
    on public.web_online_presence
    for all
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;

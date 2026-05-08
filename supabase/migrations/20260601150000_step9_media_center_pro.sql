-- Step 9: Media center pro columns for habari, matukio, livestream.

alter table if exists public.news_posts
  add column if not exists slug text,
  add column if not exists summary text,
  add column if not exists author text,
  add column if not exists status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  add column if not exists publish_date timestamptz,
  add column if not exists is_public boolean not null default false,
  add column if not exists featured boolean not null default false;

create index if not exists news_posts_status_idx on public.news_posts (status);
create index if not exists news_posts_publish_date_idx on public.news_posts (publish_date desc);
create unique index if not exists news_posts_slug_uq on public.news_posts (lower(slug)) where slug is not null and length(trim(slug)) > 0;

alter table if exists public.events
  add column if not exists event_time text,
  add column if not exists organizer text,
  add column if not exists speaker text,
  add column if not exists status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed', 'cancelled')),
  add column if not exists is_public boolean not null default false;

create index if not exists events_status_idx on public.events (status);
create index if not exists events_is_public_idx on public.events (is_public);

alter table if exists public.live_streams
  add column if not exists status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended')),
  add column if not exists ended_at timestamptz,
  add column if not exists thumbnail_url text,
  add column if not exists preacher text,
  add column if not exists event_link text,
  add column if not exists category text,
  add column if not exists is_public boolean not null default false;

create index if not exists live_streams_status_idx on public.live_streams (status);
create index if not exists live_streams_is_public_idx on public.live_streams (is_public);

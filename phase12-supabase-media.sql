create table if not exists media_items (
  id bigserial primary key,
  thumbnail text,
  title text not null,
  type text not null,
  category text,
  dayosisi text,
  jimbo text,
  tawi text,
  speaker text,
  date date,
  description text,
  tags text,
  file text,
  visibility text default 'public',
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists media_categories (
  id bigserial primary key,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists media_downloads (
  id bigserial primary key,
  media_id bigint references media_items(id) on delete cascade,
  downloaded_by text,
  downloaded_at timestamptz default now()
);

create table if not exists sermon_featured (
  id bigserial primary key,
  media_id bigint references media_items(id) on delete cascade,
  title text,
  speaker text,
  scripture text,
  duration text,
  thumbnail text,
  created_at timestamptz default now()
);

create table if not exists media_tags (
  id bigserial primary key,
  media_id bigint references media_items(id) on delete cascade,
  tag text not null
);

create table if not exists live_stream_sessions (
  id bigserial primary key,
  title text,
  kind text,
  schedule text,
  settings jsonb,
  created_at timestamptz default now()
);

create table if not exists media_logs (
  id bigserial primary key,
  actor_role text,
  action text,
  description text,
  payload jsonb,
  created_at timestamptz default now()
);

alter table media_items enable row level security;
alter table media_categories enable row level security;
alter table media_downloads enable row level security;
alter table sermon_featured enable row level security;
alter table media_tags enable row level security;
alter table live_stream_sessions enable row level security;
alter table media_logs enable row level security;

drop policy if exists "media_items_all_auth" on media_items;
create policy "media_items_all_auth" on media_items for all to authenticated using (true) with check (true);
drop policy if exists "media_categories_all_auth" on media_categories;
create policy "media_categories_all_auth" on media_categories for all to authenticated using (true) with check (true);
drop policy if exists "media_downloads_all_auth" on media_downloads;
create policy "media_downloads_all_auth" on media_downloads for all to authenticated using (true) with check (true);
drop policy if exists "sermon_featured_all_auth" on sermon_featured;
create policy "sermon_featured_all_auth" on sermon_featured for all to authenticated using (true) with check (true);
drop policy if exists "media_tags_all_auth" on media_tags;
create policy "media_tags_all_auth" on media_tags for all to authenticated using (true) with check (true);
drop policy if exists "live_stream_sessions_all_auth" on live_stream_sessions;
create policy "live_stream_sessions_all_auth" on live_stream_sessions for all to authenticated using (true) with check (true);
drop policy if exists "media_logs_all_auth" on media_logs;
create policy "media_logs_all_auth" on media_logs for all to authenticated using (true) with check (true);

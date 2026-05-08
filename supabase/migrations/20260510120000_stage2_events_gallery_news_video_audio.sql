-- Stage 2: Matukio, Gallery, Habari, Video, Audio — jedwali + hifadhi + RBAC (hakuna kuuguza jedwali la kanisa lililopo).

-- ——— Tables ———

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  event_date date not null default (now()::date),
  location text not null default '',
  poster_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  image_url text not null default '',
  category text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content text not null default '',
  category text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  video_url text not null default '',
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.audios (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  audio_url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists events_event_date_idx on public.events (event_date desc);
create index if not exists gallery_created_idx on public.gallery (created_at desc);
create index if not exists news_posts_created_idx on public.news_posts (created_at desc);
create index if not exists videos_created_idx on public.videos (created_at desc);
create index if not exists audios_created_idx on public.audios (created_at desc);

-- ——— RLS ———

alter table public.events enable row level security;
alter table public.gallery enable row level security;
alter table public.news_posts enable row level security;
alter table public.videos enable row level security;
alter table public.audios enable row level security;

-- events
drop policy if exists "events_select_auth_rbac" on public.events;
create policy "events_select_auth_rbac"
  on public.events for select to authenticated
  using (public.portal_has_module_capability('events', 'view'));
drop policy if exists "events_insert_auth_rbac" on public.events;
create policy "events_insert_auth_rbac"
  on public.events for insert to authenticated
  with check (public.portal_has_module_capability('events', 'create'));
drop policy if exists "events_update_auth_rbac" on public.events;
create policy "events_update_auth_rbac"
  on public.events for update to authenticated
  using (public.portal_has_module_capability('events', 'edit'))
  with check (public.portal_has_module_capability('events', 'edit'));
drop policy if exists "events_delete_auth_rbac" on public.events;
create policy "events_delete_auth_rbac"
  on public.events for delete to authenticated
  using (public.portal_has_module_capability('events', 'delete'));

-- gallery
drop policy if exists "gallery_select_auth_rbac" on public.gallery;
create policy "gallery_select_auth_rbac"
  on public.gallery for select to authenticated
  using (public.portal_has_module_capability('gallery', 'view'));
drop policy if exists "gallery_insert_auth_rbac" on public.gallery;
create policy "gallery_insert_auth_rbac"
  on public.gallery for insert to authenticated
  with check (public.portal_has_module_capability('gallery', 'create'));
drop policy if exists "gallery_update_auth_rbac" on public.gallery;
create policy "gallery_update_auth_rbac"
  on public.gallery for update to authenticated
  using (public.portal_has_module_capability('gallery', 'edit'))
  with check (public.portal_has_module_capability('gallery', 'edit'));
drop policy if exists "gallery_delete_auth_rbac" on public.gallery;
create policy "gallery_delete_auth_rbac"
  on public.gallery for delete to authenticated
  using (public.portal_has_module_capability('gallery', 'delete'));

-- news_posts (module_key: habari)
drop policy if exists "news_posts_select_auth_rbac" on public.news_posts;
create policy "news_posts_select_auth_rbac"
  on public.news_posts for select to authenticated
  using (public.portal_has_module_capability('habari', 'view'));
drop policy if exists "news_posts_insert_auth_rbac" on public.news_posts;
create policy "news_posts_insert_auth_rbac"
  on public.news_posts for insert to authenticated
  with check (public.portal_has_module_capability('habari', 'create'));
drop policy if exists "news_posts_update_auth_rbac" on public.news_posts;
create policy "news_posts_update_auth_rbac"
  on public.news_posts for update to authenticated
  using (public.portal_has_module_capability('habari', 'edit'))
  with check (public.portal_has_module_capability('habari', 'edit'));
drop policy if exists "news_posts_delete_auth_rbac" on public.news_posts;
create policy "news_posts_delete_auth_rbac"
  on public.news_posts for delete to authenticated
  using (public.portal_has_module_capability('habari', 'delete'));

-- videos
drop policy if exists "videos_select_auth_rbac" on public.videos;
create policy "videos_select_auth_rbac"
  on public.videos for select to authenticated
  using (public.portal_has_module_capability('video_library', 'view'));
drop policy if exists "videos_insert_auth_rbac" on public.videos;
create policy "videos_insert_auth_rbac"
  on public.videos for insert to authenticated
  with check (public.portal_has_module_capability('video_library', 'create'));
drop policy if exists "videos_update_auth_rbac" on public.videos;
create policy "videos_update_auth_rbac"
  on public.videos for update to authenticated
  using (public.portal_has_module_capability('video_library', 'edit'))
  with check (public.portal_has_module_capability('video_library', 'edit'));
drop policy if exists "videos_delete_auth_rbac" on public.videos;
create policy "videos_delete_auth_rbac"
  on public.videos for delete to authenticated
  using (public.portal_has_module_capability('video_library', 'delete'));

-- audios
drop policy if exists "audios_select_auth_rbac" on public.audios;
create policy "audios_select_auth_rbac"
  on public.audios for select to authenticated
  using (public.portal_has_module_capability('audio_library', 'view'));
drop policy if exists "audios_insert_auth_rbac" on public.audios;
create policy "audios_insert_auth_rbac"
  on public.audios for insert to authenticated
  with check (public.portal_has_module_capability('audio_library', 'create'));
drop policy if exists "audios_update_auth_rbac" on public.audios;
create policy "audios_update_auth_rbac"
  on public.audios for update to authenticated
  using (public.portal_has_module_capability('audio_library', 'edit'))
  with check (public.portal_has_module_capability('audio_library', 'edit'));
drop policy if exists "audios_delete_auth_rbac" on public.audios;
create policy "audios_delete_auth_rbac"
  on public.audios for delete to authenticated
  using (public.portal_has_module_capability('audio_library', 'delete'));

revoke all on table public.events from anon;
revoke all on table public.gallery from anon;
revoke all on table public.news_posts from anon;
revoke all on table public.videos from anon;
revoke all on table public.audios from anon;

grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.gallery to authenticated;
grant select, insert, update, delete on table public.news_posts to authenticated;
grant select, insert, update, delete on table public.videos to authenticated;
grant select, insert, update, delete on table public.audios to authenticated;

-- ——— Storage buckets ———

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-events-media',
  'church-events-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-gallery',
  'church-gallery',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-videos',
  'church-videos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-audio',
  'church-audio',
  true,
  52428800,
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/aac']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies
drop policy if exists "church_events_media_select_auth" on storage.objects;
create policy "church_events_media_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'church-events-media');

drop policy if exists "church_events_media_insert_auth" on storage.objects;
create policy "church_events_media_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-events-media'
    and public.portal_has_module_capability('events', 'create')
  );

drop policy if exists "church_events_media_update_auth" on storage.objects;
create policy "church_events_media_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'church-events-media' and public.portal_has_module_capability('events', 'edit'))
  with check (bucket_id = 'church-events-media' and public.portal_has_module_capability('events', 'edit'));

drop policy if exists "church_events_media_delete_auth" on storage.objects;
create policy "church_events_media_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'church-events-media' and public.portal_has_module_capability('events', 'delete'));

drop policy if exists "church_gallery_select_auth" on storage.objects;
create policy "church_gallery_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'church-gallery');

drop policy if exists "church_gallery_insert_auth" on storage.objects;
create policy "church_gallery_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-gallery'
    and public.portal_has_module_capability('gallery', 'create')
  );

drop policy if exists "church_gallery_update_auth" on storage.objects;
create policy "church_gallery_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'church-gallery' and public.portal_has_module_capability('gallery', 'edit'))
  with check (bucket_id = 'church-gallery' and public.portal_has_module_capability('gallery', 'edit'));

drop policy if exists "church_gallery_delete_auth" on storage.objects;
create policy "church_gallery_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'church-gallery' and public.portal_has_module_capability('gallery', 'delete'));

drop policy if exists "church_videos_select_auth" on storage.objects;
create policy "church_videos_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'church-videos');

drop policy if exists "church_videos_insert_auth" on storage.objects;
create policy "church_videos_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-videos'
    and public.portal_has_module_capability('video_library', 'create')
  );

drop policy if exists "church_videos_update_auth" on storage.objects;
create policy "church_videos_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'church-videos' and public.portal_has_module_capability('video_library', 'edit'))
  with check (bucket_id = 'church-videos' and public.portal_has_module_capability('video_library', 'edit'));

drop policy if exists "church_videos_delete_auth" on storage.objects;
create policy "church_videos_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'church-videos' and public.portal_has_module_capability('video_library', 'delete'));

drop policy if exists "church_audio_select_auth" on storage.objects;
create policy "church_audio_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'church-audio');

drop policy if exists "church_audio_insert_auth" on storage.objects;
create policy "church_audio_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-audio'
    and public.portal_has_module_capability('audio_library', 'create')
  );

drop policy if exists "church_audio_update_auth" on storage.objects;
create policy "church_audio_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'church-audio' and public.portal_has_module_capability('audio_library', 'edit'))
  with check (bucket_id = 'church-audio' and public.portal_has_module_capability('audio_library', 'edit'));

drop policy if exists "church_audio_delete_auth" on storage.objects;
create policy "church_audio_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'church-audio' and public.portal_has_module_capability('audio_library', 'delete'));

-- Habari picha — tumia bucket gallery; sera ya insert ya juu inaruhusu gallery AU habari (OR).

drop policy if exists "church_gallery_habari_insert_auth" on storage.objects;
create policy "church_gallery_habari_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-gallery'
    and public.portal_has_module_capability('habari', 'create')
  );

-- ——— RBAC matrix: super_admin + chief_admin kamili; mengine mtazamaji (view tu) ———

insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
)
select
  r.role_key,
  v.module_key,
  true,
  case when r.role_key in ('super_admin', 'chief_admin') then true else false end,
  case when r.role_key in ('super_admin', 'chief_admin') then true else false end,
  case when r.role_key in ('super_admin', 'chief_admin') then true else false end,
  case when r.role_key in ('super_admin', 'chief_admin') then true else false end,
  false
from public.portal_roles r
cross join (
  values
    ('events'),
    ('gallery'),
    ('habari'),
    ('video_library'),
    ('audio_library')
) as v(module_key)
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();

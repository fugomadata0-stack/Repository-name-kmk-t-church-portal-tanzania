-- KMK(T) Step 13 — Public website mode (safe anon read, no sensitive fields)

-- ——— Public flags (additive, default false) ———
alter table if exists public.documents
  add column if not exists is_public boolean not null default false;

alter table if exists public.gallery
  add column if not exists is_public boolean not null default false;

alter table if exists public.videos
  add column if not exists is_public boolean not null default false;

alter table if exists public.audios
  add column if not exists is_public boolean not null default false;

create index if not exists documents_is_public_idx on public.documents (is_public) where is_public = true;
create index if not exists gallery_is_public_idx on public.gallery (is_public) where is_public = true;
create index if not exists videos_is_public_idx on public.videos (is_public) where is_public = true;
create index if not exists audios_is_public_idx on public.audios (is_public) where is_public = true;

-- Tighten documents anon policy (public-only rows)
drop policy if exists "documents_select_anon_public_active" on public.documents;
create policy "documents_select_anon_public_active"
  on public.documents for select to anon
  using (
    coalesce(is_public, false) = true
    and coalesce(status, 'active') in ('active', 'published')
  );

-- Gallery / video / audio — anon read when explicitly public
drop policy if exists "gallery_select_anon_public" on public.gallery;
create policy "gallery_select_anon_public"
  on public.gallery for select to anon
  using (coalesce(is_public, false) = true and coalesce(status, 'active') = 'active');

drop policy if exists "videos_select_anon_public" on public.videos;
create policy "videos_select_anon_public"
  on public.videos for select to anon
  using (coalesce(is_public, false) = true and coalesce(status, 'active') = 'active');

drop policy if exists "audios_select_anon_public" on public.audios;
create policy "audios_select_anon_public"
  on public.audios for select to anon
  using (coalesce(is_public, false) = true and coalesce(status, 'active') = 'active');

grant select (id, title, image_url, category, created_at, is_public, status) on public.gallery to anon;
grant select (id, title, video_url, thumbnail_url, created_at, is_public, status) on public.videos to anon;
grant select (id, title, audio_url, created_at, is_public, status) on public.audios to anon;
grant select (id, title, category, created_at, status, is_public) on public.documents to anon;

-- ——— Safe RPCs (no budgets, phones, or internal IDs beyond uuid) ———

create or replace function public.portal_public_gallery_list(p_limit int default 12)
returns table (
  id uuid,
  title text,
  image_url text,
  category text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.title, g.image_url, g.category, g.created_at
  from public.gallery g
  where coalesce(g.is_public, false) = true
    and coalesce(g.status, 'active') = 'active'
    and nullif(trim(g.image_url), '') is not null
  order by g.created_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 12), 24));
$$;

create or replace function public.portal_public_projects_list(p_limit int default 8)
returns table (
  id uuid,
  name text,
  project_type text,
  location_region text,
  location_district text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.project_type, p.location_region, p.location_district
  from public.church_institution_projects p
  where coalesce(p.approval_status, '') = 'active'
    and nullif(trim(p.name), '') is not null
  order by p.updated_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 8), 20));
$$;

create or replace function public.portal_public_national_leadership()
returns table (
  role_key text,
  full_name text,
  profile_photo_url text,
  leadership_quote text,
  display_title_sw text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.role_key,
    n.full_name,
    n.profile_photo_url,
    n.leadership_quote,
    n.display_title_sw
  from public.national_leadership_profiles n
  where coalesce(n.status, 'active') = 'active'
    and coalesce(n.is_visible, true) = true
    and n.role_key in ('askofu_mkuu', 'katibu_mkuu', 'naibu_katibu_mkuu', 'mhasibu_mkuu')
  order by n.sort_order asc nulls last, n.role_key;
$$;

revoke all on function public.portal_public_gallery_list(int) from public;
revoke all on function public.portal_public_projects_list(int) from public;
revoke all on function public.portal_public_national_leadership() from public;
grant execute on function public.portal_public_gallery_list(int) to anon, authenticated;
grant execute on function public.portal_public_projects_list(int) to anon, authenticated;
grant execute on function public.portal_public_national_leadership() to anon, authenticated;

notify pgrst, 'reload schema';

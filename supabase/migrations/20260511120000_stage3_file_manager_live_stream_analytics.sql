-- Stage 3: File Manager (storage + file_manager_items), Live Stream, Analytics RPC + RBAC seeds.
-- RBAC: portal_has_module_capability — matrix cloned from events (file_manager, live_stream) and ripoti (analytics).

-- ——— Tables ———

create table if not exists public.file_manager_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  file_url text not null default '',
  bucket_name text not null check (bucket_name in ('church-files', 'church-images', 'church-media')),
  file_path text not null default '',
  file_type text not null default '',
  category text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists file_manager_items_bucket_idx on public.file_manager_items (bucket_name);
create index if not exists file_manager_items_category_idx on public.file_manager_items (category);
create index if not exists file_manager_items_created_idx on public.file_manager_items (created_at desc);

create table if not exists public.live_streams (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  platform text not null default '',
  stream_url text not null default '',
  embed_url text not null default '',
  is_live boolean not null default false,
  scheduled_at timestamptz,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists live_streams_live_idx on public.live_streams (is_live desc, scheduled_at desc nulls last);
create index if not exists live_streams_scheduled_idx on public.live_streams (scheduled_at desc nulls last);

-- ——— RLS ———

alter table public.file_manager_items enable row level security;
alter table public.live_streams enable row level security;

drop policy if exists "file_manager_items_select_auth_rbac" on public.file_manager_items;
create policy "file_manager_items_select_auth_rbac"
  on public.file_manager_items for select to authenticated
  using (public.portal_has_module_capability('file_manager', 'view'));

drop policy if exists "file_manager_items_insert_auth_rbac" on public.file_manager_items;
create policy "file_manager_items_insert_auth_rbac"
  on public.file_manager_items for insert to authenticated
  with check (public.portal_has_module_capability('file_manager', 'create'));

drop policy if exists "file_manager_items_update_auth_rbac" on public.file_manager_items;
create policy "file_manager_items_update_auth_rbac"
  on public.file_manager_items for update to authenticated
  using (public.portal_has_module_capability('file_manager', 'edit'))
  with check (public.portal_has_module_capability('file_manager', 'edit'));

drop policy if exists "file_manager_items_delete_auth_rbac" on public.file_manager_items;
create policy "file_manager_items_delete_auth_rbac"
  on public.file_manager_items for delete to authenticated
  using (public.portal_has_module_capability('file_manager', 'delete'));

drop policy if exists "live_streams_select_auth_rbac" on public.live_streams;
create policy "live_streams_select_auth_rbac"
  on public.live_streams for select to authenticated
  using (public.portal_has_module_capability('live_stream', 'view'));

drop policy if exists "live_streams_insert_auth_rbac" on public.live_streams;
create policy "live_streams_insert_auth_rbac"
  on public.live_streams for insert to authenticated
  with check (public.portal_has_module_capability('live_stream', 'create'));

drop policy if exists "live_streams_update_auth_rbac" on public.live_streams;
create policy "live_streams_update_auth_rbac"
  on public.live_streams for update to authenticated
  using (public.portal_has_module_capability('live_stream', 'edit'))
  with check (public.portal_has_module_capability('live_stream', 'edit'));

drop policy if exists "live_streams_delete_auth_rbac" on public.live_streams;
create policy "live_streams_delete_auth_rbac"
  on public.live_streams for delete to authenticated
  using (public.portal_has_module_capability('live_stream', 'delete'));

revoke all on table public.file_manager_items from anon;
revoke all on table public.live_streams from anon;

grant select, insert, update, delete on table public.file_manager_items to authenticated;
grant select, insert, update, delete on table public.live_streams to authenticated;

-- ——— Storage buckets ———

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-files',
  'church-files',
  true,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-images',
  'church-images',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'church-media',
  'church-media',
  true,
  104857600,
  array[
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies (three buckets × CRUD pattern)

drop policy if exists "church_files_select_auth" on storage.objects;
create policy "church_files_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'church-files');

drop policy if exists "church_files_insert_auth" on storage.objects;
create policy "church_files_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-files'
    and public.portal_has_module_capability('file_manager', 'create')
  );

drop policy if exists "church_files_update_auth" on storage.objects;
create policy "church_files_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'church-files' and public.portal_has_module_capability('file_manager', 'edit'))
  with check (bucket_id = 'church-files' and public.portal_has_module_capability('file_manager', 'edit'));

drop policy if exists "church_files_delete_auth" on storage.objects;
create policy "church_files_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'church-files' and public.portal_has_module_capability('file_manager', 'delete'));

drop policy if exists "church_images_select_auth" on storage.objects;
create policy "church_images_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'church-images');

drop policy if exists "church_images_insert_auth" on storage.objects;
create policy "church_images_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-images'
    and public.portal_has_module_capability('file_manager', 'create')
  );

drop policy if exists "church_images_update_auth" on storage.objects;
create policy "church_images_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'church-images' and public.portal_has_module_capability('file_manager', 'edit'))
  with check (bucket_id = 'church-images' and public.portal_has_module_capability('file_manager', 'edit'));

drop policy if exists "church_images_delete_auth" on storage.objects;
create policy "church_images_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'church-images' and public.portal_has_module_capability('file_manager', 'delete'));

drop policy if exists "church_media_bucket_select_auth" on storage.objects;
create policy "church_media_bucket_select_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'church-media');

drop policy if exists "church_media_bucket_insert_auth" on storage.objects;
create policy "church_media_bucket_insert_auth"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'church-media'
    and public.portal_has_module_capability('file_manager', 'create')
  );

drop policy if exists "church_media_bucket_update_auth" on storage.objects;
create policy "church_media_bucket_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'church-media' and public.portal_has_module_capability('file_manager', 'edit'))
  with check (bucket_id = 'church-media' and public.portal_has_module_capability('file_manager', 'edit'));

drop policy if exists "church_media_bucket_delete_auth" on storage.objects;
create policy "church_media_bucket_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'church-media' and public.portal_has_module_capability('file_manager', 'delete'));

-- ——— Analytics aggregate RPC (SECURITY DEFINER; checks analytics:view) ———

create or replace function public.portal_analytics_dashboard(
  p_from date default null,
  p_to date default null,
  p_category text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ok boolean;
  d_from date;
  d_to date;
  cat text;
begin
  ok := public.portal_has_module_capability('analytics', 'view');
  if not ok then
    raise exception 'Huna ruhusa ya Analytics' using errcode = '42501';
  end if;

  d_from := coalesce(p_from, (date_trunc('month', timezone('utc', now())))::date);
  d_to := coalesce(p_to, (date_trunc('month', timezone('utc', now())) + interval '1 month - 1 day')::date);
  cat := nullif(trim(coalesce(p_category, '')), '');

  return jsonb_build_object(
    'range', jsonb_build_object('from', d_from, 'to', d_to),
    'category_filter', cat,
    'totals', jsonb_build_object(
      'members', (select count(*)::int from public.church_members),
      'families', (select count(*)::int from public.church_families),
      'finance_entries', (select count(*)::int from public.church_finance_entries),
      'income_sources', (select count(*)::int from public.church_income_sources),
      'income_lines', (select count(*)::int from public.church_income_lines),
      'documents', (select count(*)::int from public.documents),
      'sermons', (select count(*)::int from public.sermons),
      'events', (select count(*)::int from public.events),
      'videos', (select count(*)::int from public.videos),
      'audios', (select count(*)::int from public.audios),
      'media_total',
        (select count(*)::int from public.documents)
        + (select count(*)::int from public.videos)
        + (select count(*)::int from public.audios)
        + (select count(*)::int from public.gallery)
        + (select count(*)::int from public.news_posts)
    ),
    'period', jsonb_build_object(
      'members_new', (
        select count(*)::int from public.church_members m
        where m.created_at::date between d_from and d_to
      ),
      'families_new', (
        select count(*)::int from public.church_families f
        where f.created_at::date between d_from and d_to
      ),
      'finance_entries', (
        select count(*)::int from public.church_finance_entries fe
        where fe.entry_date between d_from and d_to
          and (cat is null or fe.kategoria is null or fe.kategoria ilike '%' || cat || '%')
      ),
      'finance_income_sum', (
        select coalesce(sum(fe.amount_tz), 0)::numeric(20,2)
        from public.church_finance_entries fe
        where fe.entry_date between d_from and d_to
          and fe.aina = 'Mapato'
          and (cat is null or fe.kategoria is null or fe.kategoria ilike '%' || cat || '%')
      ),
      'income_lines_sum', (
        select coalesce(sum(il.amount_tz), 0)::numeric(20,2)
        from public.church_income_lines il
        where coalesce(il.collection_date, il.created_at::date) between d_from and d_to
          and (cat is null or il.main_category is null or il.main_category ilike '%' || cat || '%')
      ),
      'documents', (
        select count(*)::int from public.documents d
        where d.created_at::date between d_from and d_to
          and (cat is null or d.category is null or d.category ilike '%' || cat || '%')
      ),
      'sermons', (
        select count(*)::int from public.sermons s
        where s.created_at::date between d_from and d_to
      ),
      'events', (
        select count(*)::int from public.events e
        where e.event_date between d_from and d_to
      ),
      'videos', (
        select count(*)::int from public.videos v
        where v.created_at::date between d_from and d_to
      ),
      'audios', (
        select count(*)::int from public.audios a
        where a.created_at::date between d_from and d_to
      )
    ),
    'finance_by_month', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', mmonth,
        'mapato', msum
      ) order by mmonth)
      from (
        select
          to_char(date_trunc('month', fe.entry_date), 'YYYY-MM') as mmonth,
          coalesce(sum(fe.amount_tz) filter (where fe.aina = 'Mapato'), 0)::numeric(20,2) as msum
        from public.church_finance_entries fe
        where fe.entry_date >= (d_to - interval '5 months')::date
          and fe.entry_date <= d_to
          and (cat is null or fe.kategoria is null or fe.kategoria ilike '%' || cat || '%')
        group by date_trunc('month', fe.entry_date)
      ) x
    ), '[]'::jsonb),
    'recent_activity', coalesce((
      select jsonb_agg(w.obj)
      from (
        select u.obj, u.ts
        from (
          select jsonb_build_object(
            'kind', 'member',
            'label', trim(both ' ' from coalesce(m.first_name,'') || ' ' || coalesce(m.last_name,'')),
            'at', m.created_at
          ) as obj, m.created_at as ts
          from public.church_members m
          union all
          select jsonb_build_object(
            'kind', 'family',
            'label', f.family_name,
            'at', f.created_at
          ), f.created_at
          from public.church_families f
          union all
          select jsonb_build_object(
            'kind', 'finance',
            'label', concat(fe.aina, ' — ', coalesce(fe.kategoria, '')),
            'at', fe.created_at
          ), fe.created_at
          from public.church_finance_entries fe
          union all
          select jsonb_build_object(
            'kind', 'income_line',
            'label', il.source_name,
            'at', il.created_at
          ), il.created_at
          from public.church_income_lines il
          union all
          select jsonb_build_object(
            'kind', 'document',
            'label', d.title,
            'at', d.created_at
          ), d.created_at
          from public.documents d
          union all
          select jsonb_build_object(
            'kind', 'sermon',
            'label', s.title,
            'at', s.created_at
          ), s.created_at
          from public.sermons s
          union all
          select jsonb_build_object(
            'kind', 'event',
            'label', e.title,
            'at', e.created_at
          ), e.created_at
          from public.events e
          union all
          select jsonb_build_object(
            'kind', 'video',
            'label', v.title,
            'at', v.created_at
          ), v.created_at
          from public.videos v
          union all
          select jsonb_build_object(
            'kind', 'audio',
            'label', a.title,
            'at', a.created_at
          ), a.created_at
          from public.audios a
        ) u
        order by u.ts desc
        limit 24
      ) w
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.portal_analytics_dashboard(date, date, text) is
  'Aggregated portal metrics for Analytics module; requires portal_has_module_capability(analytics, view).';

revoke all on function public.portal_analytics_dashboard(date, date, text) from public;
grant execute on function public.portal_analytics_dashboard(date, date, text) to authenticated;

-- ——— RBAC matrix seeds ———

insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
)
select
  role_key,
  'file_manager',
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_export,
  can_audit
from public.portal_module_matrix
where module_key = 'events'
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();

insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
)
select
  role_key,
  'live_stream',
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_export,
  can_audit
from public.portal_module_matrix
where module_key = 'events'
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();

insert into public.portal_module_matrix (
  role_key, module_key, can_view, can_create, can_edit, can_delete, can_export, can_audit
)
select
  role_key,
  'analytics',
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_export,
  can_audit
from public.portal_module_matrix
where module_key = 'ripoti'
on conflict (role_key, module_key) do update set
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_export = excluded.can_export,
  can_audit = excluded.can_audit,
  updated_at = now();

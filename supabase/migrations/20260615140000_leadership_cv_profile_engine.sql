-- Leadership CV / profile engine: structured rows + hybrid uploads (Supabase Storage).
-- Idempotent: RLS, grants, realtime publication, private bucket `leadership-cv-attachments`.

-- ——— A) leadership_profiles (1:1 na church_viongozi) ———
create table if not exists public.leadership_profiles (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null unique references public.church_viongozi (id) on delete cascade,
  nationality text,
  biography text,
  reporting_office text,
  profile_photo_storage_path text,
  signature_storage_path text,
  original_cv_storage_path text,
  original_cv_file_name text,
  original_cv_mime text,
  original_cv_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leadership_profiles_leader_idx on public.leadership_profiles (leader_id);

-- ——— B) Uzoefu wa huduma ———
create table if not exists public.leadership_experience (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.church_viongozi (id) on delete cascade,
  start_year int not null,
  end_year int,
  institution text not null default '',
  position text not null default '',
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists leadership_experience_leader_idx on public.leadership_experience (leader_id, sort_order);

-- ——— C) Elimu na mafunzo ———
create table if not exists public.leadership_education (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.church_viongozi (id) on delete cascade,
  education_kind text not null default 'other',
  institution text not null default '',
  qualification text not null default '',
  year int,
  specialization text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists leadership_education_leader_idx on public.leadership_education (leader_id, sort_order);

-- ——— D) Vyeti (rekodi + faili ya hiari) ———
create table if not exists public.leadership_certificates (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.church_viongozi (id) on delete cascade,
  certificate_name text not null default '',
  issuer text,
  year int,
  notes text,
  document_storage_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists leadership_certificates_leader_idx on public.leadership_certificates (leader_id, sort_order);

-- ——— E) Ujuzi / karama ———
create table if not exists public.leadership_skills (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.church_viongozi (id) on delete cascade,
  skill_category text not null default 'leadership',
  label text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists leadership_skills_leader_idx on public.leadership_skills (leader_id, skill_category, sort_order);

-- ——— F) Viambatanisho ———
create table if not exists public.leadership_attachments (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.church_viongozi (id) on delete cascade,
  attachment_kind text not null default 'other',
  storage_path text not null,
  file_name text not null default '',
  mime_type text,
  file_size bigint,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists leadership_attachments_leader_idx on public.leadership_attachments (leader_id, sort_order);

-- ——— updated_at kwa profiles ———
create or replace function public.leadership_profiles_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_leadership_profiles_touch_updated_at on public.leadership_profiles;
create trigger trg_leadership_profiles_touch_updated_at
before update on public.leadership_profiles
for each row execute function public.leadership_profiles_touch_updated_at();

-- ——— RLS ———
alter table public.leadership_profiles enable row level security;
alter table public.leadership_experience enable row level security;
alter table public.leadership_education enable row level security;
alter table public.leadership_certificates enable row level security;
alter table public.leadership_skills enable row level security;
alter table public.leadership_attachments enable row level security;

grant select, insert, update, delete on public.leadership_profiles to authenticated;
grant select, insert, update, delete on public.leadership_experience to authenticated;
grant select, insert, update, delete on public.leadership_education to authenticated;
grant select, insert, update, delete on public.leadership_certificates to authenticated;
grant select, insert, update, delete on public.leadership_skills to authenticated;
grant select, insert, update, delete on public.leadership_attachments to authenticated;

-- leadership_profiles
drop policy if exists leadership_profiles_select on public.leadership_profiles;
create policy leadership_profiles_select on public.leadership_profiles
  for select to authenticated
  using (public.portal_has_module_capability ('viongozi', 'view'));

drop policy if exists leadership_profiles_insert on public.leadership_profiles;
create policy leadership_profiles_insert on public.leadership_profiles
  for insert to authenticated
  with check (
    public.portal_has_module_capability ('viongozi', 'create')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_profiles_update on public.leadership_profiles;
create policy leadership_profiles_update on public.leadership_profiles
  for update to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  )
  with check (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_profiles_delete on public.leadership_profiles;
create policy leadership_profiles_delete on public.leadership_profiles
  for delete to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'delete')
    and exists (
      select 1
      from public.church_viongozi v
      where v.id = leader_id
        and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

-- Generic helper: geo + capability kwa leader_id
-- leadership_experience
drop policy if exists leadership_experience_select on public.leadership_experience;
create policy leadership_experience_select on public.leadership_experience
  for select to authenticated
  using (public.portal_has_module_capability ('viongozi', 'view'));

drop policy if exists leadership_experience_insert on public.leadership_experience;
create policy leadership_experience_insert on public.leadership_experience
  for insert to authenticated
  with check (
    public.portal_has_module_capability ('viongozi', 'create')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_experience_update on public.leadership_experience;
create policy leadership_experience_update on public.leadership_experience
  for update to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  )
  with check (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_experience_delete on public.leadership_experience;
create policy leadership_experience_delete on public.leadership_experience
  for delete to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'delete')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

-- leadership_education
drop policy if exists leadership_education_select on public.leadership_education;
create policy leadership_education_select on public.leadership_education
  for select to authenticated
  using (public.portal_has_module_capability ('viongozi', 'view'));

drop policy if exists leadership_education_insert on public.leadership_education;
create policy leadership_education_insert on public.leadership_education
  for insert to authenticated
  with check (
    public.portal_has_module_capability ('viongozi', 'create')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_education_update on public.leadership_education;
create policy leadership_education_update on public.leadership_education
  for update to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  )
  with check (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_education_delete on public.leadership_education;
create policy leadership_education_delete on public.leadership_education
  for delete to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'delete')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

-- leadership_certificates
drop policy if exists leadership_certificates_select on public.leadership_certificates;
create policy leadership_certificates_select on public.leadership_certificates
  for select to authenticated
  using (public.portal_has_module_capability ('viongozi', 'view'));

drop policy if exists leadership_certificates_insert on public.leadership_certificates;
create policy leadership_certificates_insert on public.leadership_certificates
  for insert to authenticated
  with check (
    public.portal_has_module_capability ('viongozi', 'create')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_certificates_update on public.leadership_certificates;
create policy leadership_certificates_update on public.leadership_certificates
  for update to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  )
  with check (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_certificates_delete on public.leadership_certificates;
create policy leadership_certificates_delete on public.leadership_certificates
  for delete to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'delete')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

-- leadership_skills
drop policy if exists leadership_skills_select on public.leadership_skills;
create policy leadership_skills_select on public.leadership_skills
  for select to authenticated
  using (public.portal_has_module_capability ('viongozi', 'view'));

drop policy if exists leadership_skills_insert on public.leadership_skills;
create policy leadership_skills_insert on public.leadership_skills
  for insert to authenticated
  with check (
    public.portal_has_module_capability ('viongozi', 'create')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_skills_update on public.leadership_skills;
create policy leadership_skills_update on public.leadership_skills
  for update to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  )
  with check (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_skills_delete on public.leadership_skills;
create policy leadership_skills_delete on public.leadership_skills
  for delete to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'delete')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

-- leadership_attachments
drop policy if exists leadership_attachments_select on public.leadership_attachments;
create policy leadership_attachments_select on public.leadership_attachments
  for select to authenticated
  using (public.portal_has_module_capability ('viongozi', 'view'));

drop policy if exists leadership_attachments_insert on public.leadership_attachments;
create policy leadership_attachments_insert on public.leadership_attachments
  for insert to authenticated
  with check (
    public.portal_has_module_capability ('viongozi', 'create')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_attachments_update on public.leadership_attachments;
create policy leadership_attachments_update on public.leadership_attachments
  for update to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  )
  with check (
    public.portal_has_module_capability ('viongozi', 'edit')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

drop policy if exists leadership_attachments_delete on public.leadership_attachments;
create policy leadership_attachments_delete on public.leadership_attachments
  for delete to authenticated
  using (
    public.portal_has_module_capability ('viongozi', 'delete')
    and exists (
      select 1 from public.church_viongozi v
      where v.id = leader_id and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
    )
  );

-- ——— Storage bucket (faragha) ———
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadership-cv-attachments',
  'leadership-cv-attachments',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists leadership_cv_storage_select on storage.objects;
create policy leadership_cv_storage_select
on storage.objects for select to authenticated
using (
  bucket_id = 'leadership-cv-attachments'
  and public.portal_has_module_capability ('viongozi', 'view')
  and split_part (name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and exists (
    select 1
    from public.church_viongozi v
    where v.id = split_part (name, '/', 1)::uuid
  )
);

drop policy if exists leadership_cv_storage_insert on storage.objects;
create policy leadership_cv_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'leadership-cv-attachments'
  and public.portal_has_module_capability ('viongozi', 'create')
  and split_part (name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and exists (
    select 1
    from public.church_viongozi v
    where v.id = split_part (name, '/', 1)::uuid
      and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
  )
);

drop policy if exists leadership_cv_storage_update on storage.objects;
create policy leadership_cv_storage_update
on storage.objects for update to authenticated
using (
  bucket_id = 'leadership-cv-attachments'
  and public.portal_has_module_capability ('viongozi', 'edit')
  and split_part (name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and exists (
    select 1
    from public.church_viongozi v
    where v.id = split_part (name, '/', 1)::uuid
      and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
  )
)
with check (
  bucket_id = 'leadership-cv-attachments'
  and public.portal_has_module_capability ('viongozi', 'edit')
  and split_part (name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and exists (
    select 1
    from public.church_viongozi v
    where v.id = split_part (name, '/', 1)::uuid
      and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
  )
);

drop policy if exists leadership_cv_storage_delete on storage.objects;
create policy leadership_cv_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'leadership-cv-attachments'
  and public.portal_has_module_capability ('viongozi', 'delete')
  and split_part (name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and exists (
    select 1
    from public.church_viongozi v
    where v.id = split_part (name, '/', 1)::uuid
      and public.portal_scope_geo_write_allowed (v.dayosisi_id, v.jimbo_id, v.tawi_id)
  )
);

-- ——— Realtime ———
do $pub$
begin
  begin execute 'alter publication supabase_realtime add table public.leadership_profiles'; exception when duplicate_object then null; when undefined_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.leadership_experience'; exception when duplicate_object then null; when undefined_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.leadership_education'; exception when duplicate_object then null; when undefined_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.leadership_certificates'; exception when duplicate_object then null; when undefined_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.leadership_skills'; exception when duplicate_object then null; when undefined_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.leadership_attachments'; exception when duplicate_object then null; when undefined_object then null; end;
end
$pub$;

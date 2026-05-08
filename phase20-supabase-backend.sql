-- PHASE 20: Complete Backend Implementation (Production-ready foundation)
-- KMK(T) National Church Portal

create extension if not exists pgcrypto;

-- ========================================================
-- Core role + scope helpers
-- ========================================================
create table if not exists public.auth_user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  primary_role text not null default 'viewer',
  role_list text[] default array['viewer']::text[],
  diocese_name text,
  jimbo_name text,
  branch_name text,
  department_name text,
  institution_name text,
  must_change_password boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.role_scope_mapping (
  id bigserial primary key,
  role_key text not null unique,
  scope_level text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.confidential_field_rules (
  id bigserial primary key,
  entity_table text not null,
  field_name text not null,
  min_role text not null default 'super_admin',
  visibility text not null default 'Restricted',
  created_at timestamptz default now(),
  unique(entity_table, field_name)
);

-- ========================================================
-- Access slot structure (3 slots default for each scope)
-- ========================================================
create table if not exists public.scoped_access_units (
  id bigserial primary key,
  scope_level text not null check (scope_level in ('Dayosisi','Jimbo','Tawi')),
  unit_name text not null,
  slot_limit int not null default 3 check (slot_limit > 0 and slot_limit <= 12),
  is_locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(scope_level, unit_name)
);

create table if not exists public.scoped_access_assignments (
  id bigserial primary key,
  scoped_unit_id bigint not null references public.scoped_access_units(id) on delete cascade,
  slot_number int not null check (slot_number >= 1),
  user_id uuid references auth.users(id),
  role_key text not null default 'data_officer',
  status text not null default 'Active',
  completion_percent int default 0 check (completion_percent >= 0 and completion_percent <= 100),
  submission_status text default 'Haijawasilishwa',
  last_activity_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(scoped_unit_id, slot_number)
);

create or replace function public.enforce_scoped_slot_limit()
returns trigger
language plpgsql
as $$
declare
  v_limit int;
begin
  select slot_limit into v_limit from public.scoped_access_units where id = new.scoped_unit_id;
  if new.slot_number > coalesce(v_limit, 3) then
    raise exception 'Slot number exceeds configured slot limit for this scope unit';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_scoped_slot_limit on public.scoped_access_assignments;
create trigger trg_enforce_scoped_slot_limit
before insert or update on public.scoped_access_assignments
for each row execute function public.enforce_scoped_slot_limit();

-- ========================================================
-- Super Admin slots (max 4 active)
-- ========================================================
create table if not exists public.super_admin_slots_v2 (
  id bigserial primary key,
  slot_number int not null unique check (slot_number between 1 and 4),
  user_id uuid references auth.users(id),
  full_name text,
  email text,
  phone text,
  status text not null default 'Open',
  registered_at timestamptz,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.enforce_max_active_super_admins()
returns trigger
language plpgsql
as $$
declare
  active_count int;
begin
  select count(*)
  into active_count
  from public.super_admin_slots_v2
  where status in ('Active','Pending Approval')
    and (tg_op = 'INSERT' or id <> coalesce(new.id, -1));

  if new.status in ('Active','Pending Approval') and active_count >= 4 then
    raise exception 'Maximum 4 active Super Admin slots allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_max_active_super_admins on public.super_admin_slots_v2;
create trigger trg_enforce_max_active_super_admins
before insert or update on public.super_admin_slots_v2
for each row execute function public.enforce_max_active_super_admins();

-- ========================================================
-- Workflow engine tables
-- ========================================================
create table if not exists public.submission_records (
  id bigserial primary key,
  module_name text not null,
  scope_level text not null,
  unit_name text not null,
  submitted_by uuid references auth.users(id),
  current_status text not null default 'Haijawasilishwa',
  completion_status text not null default 'Haijakamilika',
  visibility_level text default 'Internal',
  is_locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.submission_status_history (
  id bigserial primary key,
  submission_id bigint not null references public.submission_records(id) on delete cascade,
  changed_by uuid references auth.users(id),
  actor_role text,
  old_status text,
  new_status text not null,
  comment text,
  changed_at timestamptz default now()
);

-- ========================================================
-- Notifications + Audit extensions
-- ========================================================
create table if not exists public.system_notifications (
  id bigserial primary key,
  title text not null,
  body text,
  notification_type text not null,
  channel text not null default 'In-app',
  target_role text,
  target_user uuid references auth.users(id),
  status text default 'new',
  created_at timestamptz default now()
);

create table if not exists public.system_audit_logs (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id),
  actor_role text,
  action text not null,
  module_name text not null,
  record_ref text,
  old_value jsonb,
  new_value jsonb,
  ip_device text,
  status text default 'Success',
  created_at timestamptz default now()
);

-- ========================================================
-- Categories / Types / Custom fields / Files
-- ========================================================
create table if not exists public.global_categories (
  id bigserial primary key,
  module_name text not null,
  category_name text not null,
  created_at timestamptz default now(),
  unique(module_name, category_name)
);

create table if not exists public.global_types (
  id bigserial primary key,
  module_name text not null,
  type_name text not null,
  created_at timestamptz default now(),
  unique(module_name, type_name)
);

create table if not exists public.global_custom_fields (
  id bigserial primary key,
  module_name text not null,
  field_key text not null,
  field_label text not null,
  field_type text not null,
  required boolean default false,
  created_at timestamptz default now(),
  unique(module_name, field_key)
);

create table if not exists public.global_file_uploads (
  id bigserial primary key,
  module_name text not null,
  entity_id bigint,
  bucket_name text not null,
  file_path text not null,
  original_name text,
  mime_type text,
  size_bytes bigint,
  visibility_level text default 'Restricted',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ========================================================
-- Seeds (roles, matrix, status, known church data)
-- ========================================================
insert into public.role_scope_mapping (role_key, scope_level, description) values
('chief_admin','National','Highest authority'),
('super_admin','National','Global management'),
('national_admin','National','National admin operations'),
('office_admin','National','Office operations'),
('diocese_admin','Dayosisi','Diocese scoped admin'),
('diocese_data_officer','Dayosisi','Diocese data entry'),
('jimbo_admin','Jimbo','Jimbo scoped admin'),
('jimbo_data_officer','Jimbo','Jimbo data entry'),
('branch_admin','Tawi','Branch scoped admin'),
('branch_data_officer','Tawi','Branch data entry'),
('department_officer','Department','Department operations'),
('fellowship_officer','Fellowship','Jumuiya operations'),
('choir_officer','Choir','Kwaya operations'),
('institution_officer','Institution','Institution operations'),
('events_officer','Events','Event operations'),
('publications_officer','Publications','Publication operations'),
('approver','National','Approval actions'),
('reviewer','National','Review actions'),
('viewer','Any','Read-only')
on conflict (role_key) do nothing;

insert into public.status_labels (name, color, description) values
('Haijawasilishwa', '#64748b', 'Not Submitted'),
('Rasimu', '#9aa0a6', 'Draft'),
('Imewasilishwa', '#2e83ff', 'Submitted'),
('Inasubiri', '#ffd166', 'Pending'),
('Inakaguliwa', '#f59e0b', 'Under Review'),
('Imeidhinishwa', '#15c55f', 'Approved'),
('Imekataliwa', '#ff595e', 'Rejected'),
('Inahitaji Marekebisho', '#ab47bc', 'Needs Correction'),
('Imewasilishwa Tena', '#4f46e5', 'Resubmitted'),
('Imekamilika', '#10b981', 'Completed'),
('Haijakamilika', '#f97316', 'Not Completed'),
('Imehifadhiwa', '#64748b', 'Archived')
on conflict do nothing;

insert into public.global_categories (module_name, category_name) values
('Jumuiya','JVKMKT'),
('Jumuiya','JWKMK'),
('Idara','Habari na Mawasiliano'),
('Idara','Maombi'),
('Institutions','Chuo cha Biblia'),
('Institutions','Hospital / Health Facility'),
('Publications','Katiba'),
('Publications','Katekisimu'),
('Publications','Miongozo')
on conflict do nothing;

insert into public.global_types (module_name, type_name) values
('Dayosisi','Operational'),
('Jimbo','Urban'),
('Jimbo','Rural'),
('Tawi','Parokia'),
('Tawi','Kituo cha Huduma')
on conflict do nothing;

insert into public.super_admin_slots_v2 (slot_number, status)
values (1,'Open'),(2,'Open'),(3,'Open'),(4,'Open')
on conflict (slot_number) do nothing;

insert into public.scoped_access_units (scope_level, unit_name, slot_limit) values
('Dayosisi','Dayosisi ya Mara',3),
('Dayosisi','Dayosisi ya Mwanza',3),
('Dayosisi','Dayosisi ya Bunda',3),
('Dayosisi','Dayosisi ya Dodoma',3),
('Dayosisi','Dayosisi ya Dar es Salaam',3),
('Dayosisi','Dayosisi ya Kigoma',3),
('Jimbo','Jimbo la Kati',3),
('Jimbo','Jimbo la Mashariki',3),
('Jimbo','Jimbo la Ziwa',3),
('Tawi','Tawi la Amani',3),
('Tawi','Tawi la Neema',3),
('Tawi','Tawi la Tumaini',3)
on conflict do nothing;

insert into public.confidential_field_rules (entity_table, field_name, min_role, visibility) values
('members','nida','super_admin','Restricted'),
('members','home_address','diocese_admin','Restricted'),
('families','notes','super_admin','Restricted'),
('documents','private_attachment','super_admin','Restricted')
on conflict do nothing;

-- ========================================================
-- Chief Admin seed marker (auth user should be created via Supabase Auth)
-- ========================================================
create table if not exists public.chief_admin_seed (
  id bigserial primary key,
  full_name text not null,
  email text not null unique,
  role text not null,
  setup_password_hint text,
  created_at timestamptz default now()
);

insert into public.chief_admin_seed (full_name, email, role, setup_password_hint)
values ('ENOCK FUGO','fugomadata0@gmail.com','Chief Admin / Mkuu wa Mfumo','Initial setup password: 2026 (change on first login)')
on conflict (email) do nothing;

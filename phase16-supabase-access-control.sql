-- PHASE 16: Access Control, Super Admin Registration, Role Assignment, Submission Workflow

create table if not exists public.chief_admin_profile (
  id bigserial primary key,
  full_name text not null,
  email text not null unique,
  phone text,
  password_hash text not null,
  role text not null default 'Chief Admin / Mkuu wa Mfumo',
  access_level text not null default 'Full System Control',
  status text not null default 'Active',
  created_at timestamptz default now()
);

create table if not exists public.super_admin_slots (
  id bigserial primary key,
  slot_number int not null unique check (slot_number between 1 and 4),
  user_id uuid,
  full_name text,
  email text,
  phone text,
  status text default 'Open',
  registered_at timestamptz,
  last_login timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.super_admin_registration_requests (
  id bigserial primary key,
  full_name text not null,
  email text not null,
  phone text not null,
  password_hash text not null,
  slot_number int not null check (slot_number between 1 and 4),
  security_question text,
  registration_status text default 'Pending Approval',
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.unit_access_slots (
  id bigserial primary key,
  level_name text not null,
  unit_name text not null,
  slot_1_user uuid,
  slot_2_user uuid,
  slot_3_user uuid,
  max_slots int default 3,
  access_status text default 'Active',
  completion_status text default 'Haijawasilishwa',
  updated_at timestamptz default now()
);

create table if not exists public.data_submissions (
  id bigserial primary key,
  level_name text not null,
  unit_name text not null,
  assigned_user uuid,
  submitted_by uuid,
  status_sw text not null default 'Haijawasilishwa',
  completion_sw text not null default 'Haijakamilika',
  correction_notes text,
  approver_comments text,
  locked boolean default false,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.role_permissions_matrix (
  id bigserial primary key,
  role_name text not null unique,
  can_view boolean default false,
  can_add boolean default false,
  can_edit boolean default false,
  can_delete boolean default false,
  can_submit boolean default false,
  can_approve boolean default false,
  can_reject boolean default false,
  can_export boolean default false,
  can_print boolean default false,
  can_manage_users boolean default false,
  can_manage_settings boolean default false,
  can_access_confidential boolean default false,
  disabled boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.workflow_notifications (
  id bigserial primary key,
  title text not null,
  notification_type text not null,
  channel text default 'In-app',
  status text default 'new',
  target_role text,
  created_at timestamptz default now()
);

-- seed chief admin (initial demo setup only)
insert into public.chief_admin_profile (full_name, email, phone, password_hash)
values ('ENOCK FUGO', 'fugomadata0@gmail.com', '+255700111000', crypt('2026', gen_salt('bf')))
on conflict (email) do nothing;

insert into public.super_admin_slots (slot_number, status)
values (1, 'Open'), (2, 'Open'), (3, 'Open'), (4, 'Open')
on conflict (slot_number) do nothing;

insert into public.role_permissions_matrix (
  role_name, can_view, can_add, can_edit, can_delete, can_submit, can_approve, can_reject, can_export, can_print, can_manage_users, can_manage_settings, can_access_confidential
)
values
('Chief Admin', true, true, true, true, true, true, true, true, true, true, true, true),
('Super Admin', true, true, true, true, true, true, true, true, true, true, true, true),
('Viewer', true, false, false, false, false, false, false, false, true, false, false, false)
on conflict (role_name) do nothing;

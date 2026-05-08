create extension if not exists pgcrypto;

-- =========================
-- Core Helpers
-- =========================
create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'app_role')::text, 'public_viewer')
$$;

create or replace function public.current_scope_diocese()
returns bigint
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'diocese_id', '')::bigint
$$;

create or replace function public.current_scope_jimbo()
returns bigint
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'jimbo_id', '')::bigint
$$;

create or replace function public.current_scope_branch()
returns bigint
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'branch_id', '')::bigint
$$;

create table if not exists public.status_labels (
  id bigserial primary key,
  name text not null,
  color text,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.tags (
  id bigserial primary key,
  name text not null unique,
  category text,
  created_at timestamptz default now()
);

create table if not exists public.church_settings (
  id bigserial primary key,
  official_name text not null,
  short_name text,
  headquarters text,
  postal_address text,
  phone text,
  email text,
  website text,
  timezone text default 'Africa/Dar_es_Salaam',
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.church_branding_assets (
  id bigserial primary key,
  church_setting_id bigint references public.church_settings(id) on delete cascade,
  logo_url text,
  favicon_url text,
  hero_image_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.hierarchy_levels (
  id bigserial primary key,
  name text not null,
  rank_order int not null,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.dioceses (
  id bigserial primary key,
  name text not null,
  code text unique,
  region text,
  office_city text,
  phone text,
  email text,
  headquarters_address text,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.jimbo_types (
  id bigserial primary key,
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.majimbo (
  id bigserial primary key,
  diocese_id bigint not null references public.dioceses(id) on delete cascade,
  jimbo_type_id bigint references public.jimbo_types(id),
  name text not null,
  code text,
  office_location text,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.local_unit_types (
  id bigserial primary key,
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.local_units (
  id bigserial primary key,
  jimbo_id bigint not null references public.majimbo(id) on delete cascade,
  local_unit_type_id bigint references public.local_unit_types(id),
  name text not null,
  code text,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.hierarchy_nodes (
  id bigserial primary key,
  hierarchy_level_id bigint references public.hierarchy_levels(id),
  parent_node_id bigint references public.hierarchy_nodes(id),
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  node_name text not null,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.national_leadership_positions (
  id bigserial primary key,
  title text not null,
  rank_order int default 0,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.diocese_leadership_positions (
  id bigserial primary key,
  diocese_id bigint references public.dioceses(id) on delete cascade,
  title text not null,
  rank_order int default 0,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.addresses (
  id bigserial primary key,
  country text default 'Tanzania',
  region text,
  district text,
  ward text,
  street text,
  po_box text,
  postcode text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz default now()
);

create table if not exists public.contacts (
  id bigserial primary key,
  phone text,
  whatsapp text,
  email text,
  emergency_contact text,
  created_at timestamptz default now()
);

create table if not exists public.national_leaders (
  id bigserial primary key,
  position_id bigint references public.national_leadership_positions(id),
  full_name text not null,
  first_name text,
  middle_name text,
  last_name text,
  gender text,
  dob date,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  address_id bigint references public.addresses(id),
  contact_id bigint references public.contacts(id),
  appointment_date date,
  term_end_date date,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.diocese_leaders (
  id bigserial primary key,
  diocese_position_id bigint references public.diocese_leadership_positions(id),
  diocese_id bigint references public.dioceses(id),
  full_name text not null,
  gender text,
  dob date,
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  appointment_date date,
  term_end_date date,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.bishops (
  id bigserial primary key,
  diocese_id bigint references public.dioceses(id),
  full_name text not null,
  ordination_date date,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.pastors (
  id bigserial primary key,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  full_name text not null,
  ordination_date date,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.evangelists (
  id bigserial primary key,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  full_name text not null,
  appointment_date date,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.elders (
  id bigserial primary key,
  local_unit_id bigint references public.local_units(id),
  full_name text not null,
  appointment_date date,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.local_leaders (
  id bigserial primary key,
  local_unit_id bigint references public.local_units(id),
  role_name text,
  full_name text not null,
  appointment_date date,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.deacons (
  id bigserial primary key,
  local_unit_id bigint references public.local_units(id),
  full_name text not null,
  appointment_date date,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.families (
  id bigserial primary key,
  family_name text not null,
  head_member_name text,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  category text,
  type text,
  visibility_level text default 'Restricted',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.members (
  id bigserial primary key,
  family_id bigint references public.families(id),
  full_name text not null,
  gender text,
  dob date,
  phone text,
  email text,
  marital_status text,
  occupation text,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  category text,
  type text,
  visibility_level text default 'Restricted',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.ministry_categories (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.ministries (
  id bigserial primary key,
  name text not null,
  ministry_category_id bigint references public.ministry_categories(id),
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.fellowship_types (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.fellowships (
  id bigserial primary key,
  fellowship_type_id bigint references public.fellowship_types(id),
  name text not null,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.department_categories (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.departments (
  id bigserial primary key,
  department_category_id bigint references public.department_categories(id),
  name text not null,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.choir_categories (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.choirs (
  id bigserial primary key,
  choir_category_id bigint references public.choir_categories(id),
  name text not null,
  director_name text,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.catechism_classes (
  id bigserial primary key,
  class_name text not null,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.catechism_teachers (
  id bigserial primary key,
  class_id bigint references public.catechism_classes(id) on delete cascade,
  full_name text not null,
  phone text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.catechism_students (
  id bigserial primary key,
  class_id bigint references public.catechism_classes(id) on delete cascade,
  member_id bigint references public.members(id),
  full_name text not null,
  progress text,
  visibility_level text default 'Restricted',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.partner_organizations (
  id bigserial primary key,
  name text not null,
  partner_type text,
  country text,
  contact_person text,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.global_affiliations (
  id bigserial primary key,
  organization_name text not null,
  relationship_summary text,
  representative_name text,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.institution_types (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.institutions (
  id bigserial primary key,
  institution_type_id bigint references public.institution_types(id),
  name text not null,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.publication_categories (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.publications (
  id bigserial primary key,
  publication_category_id bigint references public.publication_categories(id),
  title text not null,
  author_name text,
  publish_date date,
  category text,
  type text,
  visibility_level text default 'Public',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.media_categories (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.media_posts (
  id bigserial primary key,
  media_category_id bigint references public.media_categories(id),
  title text not null,
  summary text,
  post_date date,
  category text,
  type text,
  visibility_level text default 'Public',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.event_categories (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id bigserial primary key,
  event_category_id bigint references public.event_categories(id),
  event_name text not null,
  start_date date,
  end_date date,
  venue text,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.document_categories (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.documents (
  id bigserial primary key,
  document_category_id bigint references public.document_categories(id),
  title text not null,
  document_number text,
  issue_date date,
  diocese_id bigint references public.dioceses(id),
  jimbo_id bigint references public.majimbo(id),
  local_unit_id bigint references public.local_units(id),
  category text,
  type text,
  visibility_level text default 'Restricted',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.report_templates (
  id bigserial primary key,
  template_name text not null,
  module_name text not null,
  filter_config jsonb default '{}'::jsonb,
  print_layout text,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.notification_templates (
  id bigserial primary key,
  template_name text not null,
  notification_type text not null,
  title text,
  body text,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.user_roles (
  id bigserial primary key,
  role_key text not null unique,
  role_name text not null,
  scope_level text not null,
  visibility_level text default 'Internal',
  created_at timestamptz default now()
);

create table if not exists public.permissions (
  id bigserial primary key,
  permission_key text not null unique,
  permission_name text not null,
  module_name text,
  field_name text,
  visibility_level text default 'Internal',
  created_at timestamptz default now()
);

create table if not exists public.role_permissions (
  id bigserial primary key,
  role_id bigint references public.user_roles(id) on delete cascade,
  permission_id bigint references public.permissions(id) on delete cascade,
  created_at timestamptz default now(),
  unique(role_id, permission_id)
);

create table if not exists public.approval_workflows (
  id bigserial primary key,
  workflow_name text not null,
  module_name text not null,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.approval_steps (
  id bigserial primary key,
  workflow_id bigint references public.approval_workflows(id) on delete cascade,
  step_order int not null,
  stage_name text not null,
  approver_role_id bigint references public.user_roles(id),
  is_required boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_user_id uuid,
  actor_role text,
  action text not null,
  entity_table text not null,
  entity_id text,
  diocese_id bigint,
  jimbo_id bigint,
  local_unit_id bigint,
  visibility_level text default 'Internal',
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.entity_tags (
  id bigserial primary key,
  tag_id bigint references public.tags(id) on delete cascade,
  entity_table text not null,
  entity_id bigint not null,
  created_at timestamptz default now()
);

create table if not exists public.custom_fields (
  id bigserial primary key,
  entity_table text not null,
  field_key text not null,
  field_label text not null,
  field_type text not null,
  is_required boolean default false,
  category text,
  type text,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now(),
  unique(entity_table, field_key)
);

create table if not exists public.custom_field_values (
  id bigserial primary key,
  custom_field_id bigint references public.custom_fields(id) on delete cascade,
  entity_table text not null,
  entity_id bigint not null,
  value_text text,
  value_json jsonb,
  created_at timestamptz default now()
);

create table if not exists public.file_uploads (
  id bigserial primary key,
  entity_table text not null,
  entity_id bigint not null,
  bucket_name text not null,
  storage_path text not null,
  original_name text,
  mime_type text,
  file_size bigint,
  category text,
  type text,
  visibility_level text default 'Restricted',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id bigserial primary key,
  entity_table text not null,
  entity_id bigint not null,
  author_user_id uuid,
  comment_text text not null,
  visibility_level text default 'Internal',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

create table if not exists public.notes (
  id bigserial primary key,
  entity_table text not null,
  entity_id bigint not null,
  note_title text,
  note_body text not null,
  visibility_level text default 'Restricted',
  status_label_id bigint references public.status_labels(id),
  created_at timestamptz default now()
);

-- =========================
-- Storage Buckets
-- =========================
insert into storage.buckets (id, name, public) values
('logos', 'logos', true),
('profile-photos', 'profile-photos', false),
('documents', 'documents', false),
('certificates', 'certificates', false),
('cv-files', 'cv-files', false),
('publications', 'publications', true),
('media', 'media', true),
('event-files', 'event-files', false),
('institution-files', 'institution-files', false),
('private-files', 'private-files', false)
on conflict (id) do nothing;

-- =========================
-- Seed Data
-- =========================
insert into public.status_labels (name, color, description) values
('active', '#15c55f', 'Inatumika'),
('pending', '#ffd166', 'Inasubiri'),
('archived', '#9aa0a6', 'Imehifadhiwa')
on conflict do nothing;

insert into public.church_settings (official_name, short_name, headquarters, postal_address, phone, email, website, visibility_level)
values ('KANISA LA MENNONITE LA KIINJILI TANZANIA', 'KMK(T)', 'Musoma Mjini, Mkoa wa Mara', 'S.L.P 317, Musoma - Tanzania', '+255700000000', 'info@kmkt.or.tz', 'https://kmkt.or.tz', 'Public')
on conflict do nothing;

insert into public.dioceses (name, code, region, office_city, email, visibility_level) values
('Dayosisi ya Mara', 'KMKT-MRA', 'Mara', 'Musoma', 'mara@kmkt.or.tz', 'Internal'),
('Dayosisi ya Mwanza', 'KMKT-MWZ', 'Mwanza', 'Mwanza', 'mwanza@kmkt.or.tz', 'Internal'),
('Dayosisi ya Bunda', 'KMKT-BUN', 'Mara', 'Bunda', 'bunda@kmkt.or.tz', 'Internal'),
('Dayosisi ya Dodoma', 'KMKT-DOD', 'Dodoma', 'Dodoma', 'dodoma@kmkt.or.tz', 'Internal'),
('Dayosisi ya Dar es Salaam', 'KMKT-DAR', 'Dar es Salaam', 'Dar es Salaam', 'dar@kmkt.or.tz', 'Internal'),
('Dayosisi ya Kigoma', 'KMKT-KGM', 'Kigoma', 'Kigoma', 'kigoma@kmkt.or.tz', 'Internal')
on conflict (code) do nothing;

insert into public.jimbo_types (name, description) values
('Urban', 'Jimbo la mjini'),
('Rural', 'Jimbo la vijijini')
on conflict (name) do nothing;

insert into public.local_unit_types (name, description) values
('Tawi', 'Branch'),
('Parokia', 'Parish'),
('Kituo cha Huduma', 'Service point')
on conflict (name) do nothing;

insert into public.majimbo (diocese_id, name, code, visibility_level)
select d.id, x.name, x.code, 'Internal'
from public.dioceses d
join (values
  ('Dayosisi ya Mara', 'Jimbo la Kati', 'MRA-KATI'),
  ('Dayosisi ya Mara', 'Jimbo la Mashariki', 'MRA-MSH'),
  ('Dayosisi ya Mwanza', 'Jimbo la Ziwa', 'MWZ-ZIWA'),
  ('Dayosisi ya Bunda', 'Jimbo la Bunda Kati', 'BUN-KATI')
) as x(diocese_name, name, code)
on d.name = x.diocese_name
on conflict do nothing;

insert into public.ministry_categories (name) values ('Vijana'), ('Wanawake'), ('Wanaume'), ('Mission')
on conflict (name) do nothing;

insert into public.fellowship_types (name) values ('JVKMKT'), ('JWKMK')
on conflict (name) do nothing;

insert into public.department_categories (name) values ('Habari na Mawasiliano'), ('Maombi'), ('Maendeleo')
on conflict (name) do nothing;

insert into public.institution_types (name) values ('Chuo cha Biblia'), ('Hospital / Health Facility'), ('Shule ya Awali')
on conflict (name) do nothing;

insert into public.publication_categories (name) values ('Katiba'), ('Katekisimu'), ('Miongozo')
on conflict (name) do nothing;

insert into public.event_categories (name) values ('Mkutano Mkuu'), ('Kambi'), ('Semina')
on conflict (name) do nothing;

insert into public.document_categories (name) values ('Minutes'), ('Policies'), ('Official Letters')
on conflict (name) do nothing;

insert into public.media_categories (name) values ('News'), ('Gallery'), ('Video')
on conflict (name) do nothing;

insert into public.national_leadership_positions (title, rank_order) values
('Askofu Mkuu', 1),
('Katibu Mkuu', 2),
('Mweka Hazina', 3)
on conflict do nothing;

insert into public.national_leaders (position_id, full_name, appointment_date, visibility_level)
select p.id, 'MCH. SOSPITER MASAMAKI CHANGURU', current_date - interval '1 year', 'Public'
from public.national_leadership_positions p
where p.title = 'Askofu Mkuu'
on conflict do nothing;

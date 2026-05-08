-- KMT Church Tanzania Portal — site content, about page, gallery metadata, audit trail
-- Run in Supabase SQL editor or via CLI. Tighten RLS before production.

-- Site-wide hero / cross / gallery references (single row pattern)
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  hero_image_url text,
  cross_image_url text,
  gallery jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

-- Public “About KMKT” content (single row; use status + published for draft/publish flow)
create table if not exists public.about_kmkt (
  id uuid primary key default gen_random_uuid(),
  church_name text,
  abbreviation text,
  motto text,
  mission text,
  vision text,
  core_values text,
  history text,
  objectives text,
  headquarters text,
  contacts text,
  leadership_message text,
  bible_verse text,
  logo_url text,
  hero_image_url text,
  gallery jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'inactive')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb,
  user_id uuid,
  created_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
alter table public.about_kmkt enable row level security;
alter table public.audit_logs enable row level security;

-- Site settings: readable to everyone; writes limited to authenticated (tighten by role in production)
create policy "site_settings_select_all" on public.site_settings for select using (true);
create policy "site_settings_write_auth" on public.site_settings for all to authenticated using (true) with check (true);

-- About: anonymous users see published row(s) only; authenticated users manage drafts
create policy "about_kmkt_anon_published" on public.about_kmkt for select to anon using (published = true);
create policy "about_kmkt_auth_all" on public.about_kmkt for all to authenticated using (true) with check (true);

create policy "audit_logs_insert_authenticated" on public.audit_logs for insert to authenticated with check (true);
create policy "audit_logs_select_authenticated" on public.audit_logs for select to authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select on public.site_settings, public.about_kmkt to anon, authenticated;
grant all on public.site_settings, public.about_kmkt to authenticated;
grant select, insert on public.audit_logs to authenticated;

-- Storage bucket for public site images (re-run safe)
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

-- Storage policies: allow public read; authenticated upload/update/delete
create policy "site_assets_read" on storage.objects for select using (bucket_id = 'site-assets');
create policy "site_assets_insert" on storage.objects for insert with check (bucket_id = 'site-assets' and auth.role() = 'authenticated');
create policy "site_assets_update" on storage.objects for update using (bucket_id = 'site-assets' and auth.role() = 'authenticated');
create policy "site_assets_delete" on storage.objects for delete using (bucket_id = 'site-assets' and auth.role() = 'authenticated');

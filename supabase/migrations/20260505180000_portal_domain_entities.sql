-- Rekodi za moduli zisizokuwa na jedwali maalum (jumuiya, taasisi, matukio, n.k.)

create table if not exists public.portal_domain_entities (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  submodule_key text not null default '',
  title text not null,
  details text,
  category text,
  reference_code text,
  event_date date,
  extra jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_domain_entities_module_sub_idx on public.portal_domain_entities (module_key, submodule_key);

alter table public.portal_domain_entities enable row level security;

drop policy if exists "portal_domain_entities_anon_all" on public.portal_domain_entities;
create policy "portal_domain_entities_anon_all" on public.portal_domain_entities for all to anon using (true) with check (true);
drop policy if exists "portal_domain_entities_auth_all" on public.portal_domain_entities;
create policy "portal_domain_entities_auth_all" on public.portal_domain_entities for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.portal_domain_entities to anon, authenticated;

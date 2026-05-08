-- Viongozi wa kanisa — viunganishi vya muundo (FK). RLS anon kwa maendeleo.

create table if not exists public.church_viongozi (
  id uuid primary key default gen_random_uuid(),
  jina text not null,
  cheo text,
  ngazi text not null default '',
  dayosisi_id uuid references public.dayosisi (id) on delete set null,
  jimbo_id uuid references public.church_jimbo (id) on delete set null,
  tawi_id uuid references public.church_tawi (id) on delete set null,
  simu text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_viongozi_dayosisi_idx on public.church_viongozi (dayosisi_id);
create index if not exists church_viongozi_jimbo_idx on public.church_viongozi (jimbo_id);
create index if not exists church_viongozi_tawi_idx on public.church_viongozi (tawi_id);

alter table public.church_viongozi enable row level security;

drop policy if exists "church_viongozi_anon_all" on public.church_viongozi;
create policy "church_viongozi_anon_all" on public.church_viongozi for all to anon using (true) with check (true);
drop policy if exists "church_viongozi_auth_all" on public.church_viongozi;
create policy "church_viongozi_auth_all" on public.church_viongozi for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.church_viongozi to anon, authenticated;

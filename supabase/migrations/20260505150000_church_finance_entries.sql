-- Miamala ya fedha — kiasi numeric(sahihi), FK kwa muundo, RLS dev.

create table if not exists public.church_finance_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default (CURRENT_DATE),
  aina text not null check (aina in ('Mapato', 'Matumizi', 'Michango', 'Nyingine')),
  kategoria text,
  amount_tz numeric(18, 2) not null check (amount_tz >= 0 and amount_tz <= 9999999999999999.99),
  ngazi text,
  dayosisi_id uuid references public.dayosisi (id) on delete set null,
  jimbo_id uuid references public.church_jimbo (id) on delete set null,
  tawi_id uuid references public.church_tawi (id) on delete set null,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_finance_entries_date_idx on public.church_finance_entries (entry_date desc);
create index if not exists church_finance_entries_aina_idx on public.church_finance_entries (aina);
create index if not exists church_finance_entries_dayosisi_idx on public.church_finance_entries (dayosisi_id);

alter table public.church_finance_entries enable row level security;

drop policy if exists "church_finance_entries_anon_all" on public.church_finance_entries;
create policy "church_finance_entries_anon_all" on public.church_finance_entries for all to anon using (true) with check (true);
drop policy if exists "church_finance_entries_auth_all" on public.church_finance_entries;
create policy "church_finance_entries_auth_all" on public.church_finance_entries for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.church_finance_entries to anon, authenticated;

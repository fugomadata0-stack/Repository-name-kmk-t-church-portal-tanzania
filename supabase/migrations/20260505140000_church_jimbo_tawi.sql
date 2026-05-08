-- Majimbo na matawi — muundo halisi (FK dayosisi / jimbo). RLS anon kwa dev.

create table if not exists public.church_jimbo (
  id uuid primary key default gen_random_uuid(),
  dayosisi_id uuid not null references public.dayosisi (id) on delete restrict,
  jina text not null,
  mkuu text,
  mkoa text,
  simu text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_jimbo_dayosisi_idx on public.church_jimbo (dayosisi_id);
create unique index if not exists church_jimbo_name_per_diocese_uq on public.church_jimbo (dayosisi_id, lower(trim(jina)));

create table if not exists public.church_tawi (
  id uuid primary key default gen_random_uuid(),
  jimbo_id uuid not null references public.church_jimbo (id) on delete restrict,
  jina text not null,
  aina text not null default 'Tawi',
  kiongozi text,
  simu text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_tawi_jimbo_idx on public.church_tawi (jimbo_id);
create unique index if not exists church_tawi_name_per_jimbo_uq on public.church_tawi (jimbo_id, lower(trim(jina)));

alter table public.church_jimbo enable row level security;
alter table public.church_tawi enable row level security;

drop policy if exists "church_jimbo_anon_all" on public.church_jimbo;
create policy "church_jimbo_anon_all" on public.church_jimbo for all to anon using (true) with check (true);
drop policy if exists "church_jimbo_auth_all" on public.church_jimbo;
create policy "church_jimbo_auth_all" on public.church_jimbo for all to authenticated using (true) with check (true);

drop policy if exists "church_tawi_anon_all" on public.church_tawi;
create policy "church_tawi_anon_all" on public.church_tawi for all to anon using (true) with check (true);
drop policy if exists "church_tawi_auth_all" on public.church_tawi;
create policy "church_tawi_auth_all" on public.church_tawi for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.church_jimbo to anon, authenticated;
grant select, insert, update, delete on public.church_tawi to anon, authenticated;

insert into public.church_jimbo (dayosisi_id, jina, mkuu, mkoa, simu, status)
select d.id, 'Jimbo la Mfano', 'Mch. Mfano', 'Mara', '+255700000010', 'active'
from public.dayosisi d
where d.code = 'MARA'
  and not exists (select 1 from public.church_jimbo j where j.jina = 'Jimbo la Mfano' and j.dayosisi_id = d.id);

insert into public.church_tawi (jimbo_id, jina, aina, kiongozi, simu, status)
select j.id, 'Tawi la Mfano — Muundo', 'Tawi', 'Kiongozi Mfano', '+255700000011', 'active'
from public.church_jimbo j
join public.dayosisi d on d.id = j.dayosisi_id
where d.code = 'MARA' and j.jina = 'Jimbo la Mfano'
  and not exists (select 1 from public.church_tawi t where t.jina = 'Tawi la Mfano — Muundo' and t.jimbo_id = j.id);

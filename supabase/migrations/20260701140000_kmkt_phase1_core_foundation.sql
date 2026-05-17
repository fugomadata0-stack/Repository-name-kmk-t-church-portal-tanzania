-- KMK(T) Phase 1 — Core Foundation (additive, production-safe)
-- Membership statistics · Finance distribution ledger · Church institution projects

-- ——— Members: ministry segment (KE, ME, JVKMK(T), JWKMK(T)) ———
alter table if exists public.church_members
  add column if not exists ministry_segment text
    check (ministry_segment is null or ministry_segment in ('none', 'ke', 'me', 'jvkmkt', 'jwkmkt'));

create index if not exists church_members_ministry_segment_idx
  on public.church_members (ministry_segment)
  where ministry_segment is not null and ministry_segment <> 'none';

comment on column public.church_members.ministry_segment is
  'Makundi maalum: ke, me, jvkmkt, jwkmkt — inalinganishwa na takwimu za uanachama.';

-- ——— Finance entries: approval, receipt, balances ———
alter table if exists public.church_finance_entries
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('draft', 'pending', 'approved', 'rejected', 'cancelled')),
  add column if not exists receipt_number text,
  add column if not exists income_line_id uuid references public.church_income_lines (id) on delete set null,
  add column if not exists transfer_amount_tz numeric(18, 2) check (transfer_amount_tz is null or transfer_amount_tz >= 0),
  add column if not exists remaining_amount_tz numeric(18, 2) check (remaining_amount_tz is null or remaining_amount_tz >= 0),
  add column if not exists balance_after_tz numeric(18, 2) check (balance_after_tz is null);

create index if not exists church_finance_entries_approval_idx on public.church_finance_entries (approval_status);
create unique index if not exists church_finance_entries_receipt_uq
  on public.church_finance_entries (receipt_number)
  where receipt_number is not null and length(trim(receipt_number)) > 0;

-- ——— Income lines: receipt + approval ———
alter table if exists public.church_income_lines
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('draft', 'pending', 'approved', 'rejected', 'cancelled')),
  add column if not exists receipt_number text;

-- ——— Per-hop distribution settings (Tawi retain → Jimbo → Dayosisi → KMK(T)) ———
create table if not exists public.church_income_distribution_settings (
  id uuid primary key default gen_random_uuid(),
  scope_level text not null check (scope_level in ('tawi', 'jimbo', 'dayosisi', 'kmkt')),
  entity_id uuid,
  retain_percent numeric(5, 2) not null default 65
    check (retain_percent >= 0 and retain_percent <= 100),
  upward_percent numeric(5, 2) not null default 35
    check (upward_percent >= 0 and upward_percent <= 100),
  direct_to_kmkt_allowed boolean not null default true,
  notes text,
  updated_at timestamptz not null default now(),
  unique (scope_level, entity_id)
);

comment on table public.church_income_distribution_settings is
  'Asilimia za kushikilia vs kutuma juu kwa kila ngazi; direct_to_kmkt_allowed = michango ya moja kwa moja KMK(T).';

insert into public.church_income_distribution_settings (scope_level, entity_id, retain_percent, upward_percent, direct_to_kmkt_allowed, notes)
values
  ('kmkt', null, 0, 100, true, 'Makao makuu — pokea moja kwa moja na kutoka dayosisi'),
  ('dayosisi', null, 65, 35, true, 'Chaguo-msingi dayosisi'),
  ('jimbo', null, 65, 35, true, 'Chaguo-msingi jimbo'),
  ('tawi', null, 65, 35, true, 'Chaguo-msingi tawi')
on conflict (scope_level, entity_id) do nothing;

-- ——— Remittance ledger (multi-hop) ———
create table if not exists public.church_income_remittances (
  id uuid primary key default gen_random_uuid(),
  income_line_id uuid references public.church_income_lines (id) on delete set null,
  from_level text not null check (from_level in ('tawi', 'jimbo', 'dayosisi', 'kmkt', 'external')),
  to_level text not null check (to_level in ('tawi', 'jimbo', 'dayosisi', 'kmkt')),
  from_entity_id uuid,
  to_entity_id uuid,
  amount_tz numeric(18, 2) not null check (amount_tz >= 0),
  transfer_amount_tz numeric(18, 2) not null default 0 check (transfer_amount_tz >= 0),
  remaining_amount_tz numeric(18, 2) not null default 0 check (remaining_amount_tz >= 0),
  approval_status text not null default 'pending'
    check (approval_status in ('draft', 'pending', 'approved', 'rejected', 'cancelled')),
  receipt_number text,
  period_start date,
  period_end date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_income_remittances_line_idx on public.church_income_remittances (income_line_id);
create index if not exists church_income_remittances_status_idx on public.church_income_remittances (approval_status);
create index if not exists church_income_remittances_levels_idx on public.church_income_remittances (from_level, to_level);

-- ——— Church institution projects ———
create table if not exists public.church_institution_projects (
  id uuid primary key default gen_random_uuid(),
  project_type text not null check (project_type in (
    'bible_college', 'school', 'hospital_clinic', 'admin_center',
    'mission_center', 'training_center', 'other'
  )),
  name text not null,
  registration_number text,
  location_region text,
  location_district text,
  location_address text,
  leader_name text,
  leader_phone text,
  leader_title text,
  dayosisi_id uuid references public.dayosisi (id) on delete set null,
  jimbo_id uuid references public.church_jimbo (id) on delete set null,
  tawi_id uuid references public.church_tawi (id) on delete set null,
  budget_income_tz numeric(18, 2) not null default 0 check (budget_income_tz >= 0),
  budget_expense_tz numeric(18, 2) not null default 0 check (budget_expense_tz >= 0),
  balance_tz numeric(18, 2) not null default 0,
  approval_status text not null default 'active'
    check (approval_status in ('draft', 'pending', 'active', 'suspended', 'closed')),
  documents_json jsonb not null default '[]'::jsonb,
  kpi_json jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_institution_projects_type_idx on public.church_institution_projects (project_type);
create index if not exists church_institution_projects_geo_idx on public.church_institution_projects (dayosisi_id, jimbo_id, tawi_id);

-- ——— RLS ———
alter table public.church_income_distribution_settings enable row level security;
alter table public.church_income_remittances enable row level security;
alter table public.church_institution_projects enable row level security;

drop policy if exists church_income_distribution_settings_select on public.church_income_distribution_settings;
create policy church_income_distribution_settings_select on public.church_income_distribution_settings
  for select to authenticated
  using (
    public.portal_has_module_capability('fedha', 'view')
    or public.portal_has_module_capability('mapato_income', 'view')
    or public.portal_has_module_capability('vyanzo_mapato', 'view')
  );

drop policy if exists church_income_distribution_settings_mutate on public.church_income_distribution_settings;
create policy church_income_distribution_settings_mutate on public.church_income_distribution_settings
  for all to authenticated
  using (
    public.portal_has_module_capability('fedha', 'edit')
    or public.portal_has_module_capability('mapato_income', 'edit')
  )
  with check (
    public.portal_has_module_capability('fedha', 'edit')
    or public.portal_has_module_capability('mapato_income', 'edit')
  );

drop policy if exists church_income_remittances_select on public.church_income_remittances;
create policy church_income_remittances_select on public.church_income_remittances
  for select to authenticated
  using (
    public.portal_has_module_capability('fedha', 'view')
    or public.portal_has_module_capability('mapato_income', 'view')
  );

drop policy if exists church_income_remittances_mutate on public.church_income_remittances;
create policy church_income_remittances_mutate on public.church_income_remittances
  for all to authenticated
  using (
    public.portal_has_module_capability('fedha', 'edit')
    or public.portal_has_module_capability('mapato_income', 'edit')
  )
  with check (
    public.portal_has_module_capability('fedha', 'create')
    or public.portal_has_module_capability('mapato_income', 'create')
    or public.portal_has_module_capability('fedha', 'edit')
    or public.portal_has_module_capability('mapato_income', 'edit')
  );

drop policy if exists church_institution_projects_select on public.church_institution_projects;
create policy church_institution_projects_select on public.church_institution_projects
  for select to authenticated
  using (public.portal_has_module_capability('taasisi', 'view'));

drop policy if exists church_institution_projects_mutate on public.church_institution_projects;
create policy church_institution_projects_mutate on public.church_institution_projects
  for all to authenticated
  using (public.portal_has_module_capability('taasisi', 'edit'))
  with check (
    public.portal_has_module_capability('taasisi', 'create')
    or public.portal_has_module_capability('taasisi', 'edit')
  );

grant select, insert, update, delete on public.church_income_distribution_settings to authenticated;
grant select, insert, update, delete on public.church_income_remittances to authenticated;
grant select, insert, update, delete on public.church_institution_projects to authenticated;

-- ——— Membership statistics RPC (Tawi → Jimbo → Dayosisi → KMK(T)) ———
create or replace function public.portal_membership_statistics(
  p_scope text default 'kmkt',
  p_entity_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_scope text := lower(trim(coalesce(p_scope, 'kmkt')));
  v_result jsonb;
begin
  if not (
    public.portal_has_module_capability('waumini', 'view')
    or public.portal_has_module_capability('ripoti', 'view')
  ) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  with base as (
    select m.*
    from public.church_members m
    where
      case v_scope
        when 'tawi' then p_entity_id is null or m.tawi_id = p_entity_id
        when 'jimbo' then p_entity_id is null or m.jimbo_id = p_entity_id
        when 'dayosisi' then p_entity_id is null or m.dayosisi_id = p_entity_id
        else true
      end
  ),
  agg as (
    select
      count(*)::bigint as total,
      count(*) filter (where lower(coalesce(gender, '')) in ('m', 'me', 'male', 'kiume', 'wanaume'))::bigint as wanaume,
      count(*) filter (where lower(coalesce(gender, '')) in ('f', 'ke', 'female', 'kike', 'wanawake'))::bigint as wanawake,
      count(*) filter (
        where birth_date is not null
          and extract(year from age(current_date, birth_date)) between 13 and 35
      )::bigint as vijana,
      count(*) filter (
        where birth_date is not null
          and extract(year from age(current_date, birth_date)) < 13
      )::bigint as watoto,
      count(*) filter (
        where birth_date is not null
          and extract(year from age(current_date, birth_date)) >= 60
      )::bigint as wazee,
      count(*) filter (where membership_status = 'visitor')::bigint as wageni,
      count(*) filter (where coalesce(is_baptized, false))::bigint as waliobatizwa,
      count(*) filter (where not coalesce(is_baptized, false))::bigint as wasio_batizwa,
      count(*) filter (where ministry_segment = 'ke')::bigint as ke,
      count(*) filter (where ministry_segment = 'me')::bigint as me,
      count(*) filter (where ministry_segment = 'jvkmkt')::bigint as jvkmkt,
      count(*) filter (where ministry_segment = 'jwkmkt')::bigint as jwkmkt
    from base
  )
  select jsonb_build_object(
    'scope', v_scope,
    'entity_id', p_entity_id,
    'generated_at', now(),
    'categories', jsonb_build_object(
      'total', total,
      'wanaume', wanaume,
      'wanawake', wanawake,
      'vijana', vijana,
      'watoto', watoto,
      'wazee', wazee,
      'wageni', wageni,
      'waliobatizwa', waliobatizwa,
      'wasio_batizwa', wasio_batizwa,
      'ke', ke,
      'me', me,
      'jvkmkt', jvkmkt,
      'jwkmkt', jwkmkt
    )
  )
  into v_result
  from agg;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

comment on function public.portal_membership_statistics(text, uuid) is
  'Takwimu za uanachama kwa ngazi — categories kwa KMK(T) portal.';

-- ——— Finance distribution summary RPC ———
create or replace function public.portal_finance_distribution_summary(
  p_scope text default 'kmkt',
  p_entity_id uuid default null,
  p_period_start date default null,
  p_period_end date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_scope text := lower(trim(coalesce(p_scope, 'kmkt')));
  v_start date := coalesce(p_period_start, date_trunc('month', current_date)::date);
  v_end date := coalesce(p_period_end, current_date);
  v_result jsonb;
begin
  if not (
    public.portal_has_module_capability('fedha', 'view')
    or public.portal_has_module_capability('mapato_income', 'view')
  ) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  with lines as (
    select l.*
    from public.church_income_lines l
    where coalesce(l.collection_date, l.service_event_date, l.created_at::date) >= v_start
      and coalesce(l.collection_date, l.service_event_date, l.created_at::date) <= v_end
      and case v_scope
        when 'tawi' then p_entity_id is null or l.tawi_id = p_entity_id
        when 'jimbo' then p_entity_id is null or l.jimbo_id = p_entity_id
        when 'dayosisi' then p_entity_id is null or l.dayosisi_id = p_entity_id
        else true
      end
  ),
  fin as (
    select f.*
    from public.church_finance_entries f
    where f.entry_date >= v_start and f.entry_date <= v_end
      and case v_scope
        when 'tawi' then p_entity_id is null or f.tawi_id = p_entity_id
        when 'jimbo' then p_entity_id is null or f.jimbo_id = p_entity_id
        when 'dayosisi' then p_entity_id is null or f.dayosisi_id = p_entity_id
        else true
      end
  ),
  rem as (
    select r.*
    from public.church_income_remittances r
    where coalesce(r.period_start, v_start) >= v_start
      and coalesce(r.period_end, v_end) <= v_end
  ),
  agg as (
    select
      coalesce((select sum(amount_tz) from lines), 0)::numeric(18,2) as income_total,
      coalesce((select sum(amount_local_tz) from lines), 0)::numeric(18,2) as income_local,
      coalesce((select sum(amount_upward_tz) from lines), 0)::numeric(18,2) as income_upward,
      coalesce((select sum(amount_tz) from fin where lower(coalesce(aina, kategoria, '')) like '%matumizi%'), 0)::numeric(18,2) as expenses_total,
      coalesce((select sum(amount_tz) from rem where approval_status = 'approved'), 0)::numeric(18,2) as transfers_approved,
      coalesce((select sum(amount_tz) from rem where approval_status = 'pending'), 0)::numeric(18,2) as transfers_pending
  )
  select jsonb_build_object(
    'scope', v_scope,
    'entity_id', p_entity_id,
    'period_start', v_start,
    'period_end', v_end,
    'income_total', income_total,
    'income_local', income_local,
    'income_upward', income_upward,
    'expenses_total', expenses_total,
    'balance', income_total - expenses_total,
    'transfers_approved', transfers_approved,
    'transfers_pending', transfers_pending,
    'remaining', income_total - expenses_total - transfers_approved
  )
  into v_result
  from agg;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.portal_membership_statistics(text, uuid) from public;
grant execute on function public.portal_membership_statistics(text, uuid) to anon, authenticated;

revoke all on function public.portal_finance_distribution_summary(text, uuid, date, date) from public;
grant execute on function public.portal_finance_distribution_summary(text, uuid, date, date) to anon, authenticated;

notify pgrst, 'reload schema';

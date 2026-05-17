-- KMK(T) Step 5 — Church Projects Engine (additive)

alter table public.church_institution_projects
  drop constraint if exists church_institution_projects_project_type_check;

alter table public.church_institution_projects
  add constraint church_institution_projects_project_type_check
  check (project_type in (
    'bible_college', 'school', 'hospital', 'clinic', 'hospital_clinic',
    'admin_center', 'mission_center', 'training_center', 'other'
  ));

-- ——— Per-project expense lines ———
create table if not exists public.church_institution_project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.church_institution_projects (id) on delete cascade,
  expense_date date not null default current_date,
  category text,
  description text,
  amount_tz numeric(18, 2) not null default 0 check (amount_tz >= 0),
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists church_institution_project_expenses_project_idx
  on public.church_institution_project_expenses (project_id, expense_date desc);

alter table public.church_institution_project_expenses enable row level security;

drop policy if exists church_institution_project_expenses_select on public.church_institution_project_expenses;
create policy church_institution_project_expenses_select on public.church_institution_project_expenses
  for select to authenticated
  using (public.portal_has_module_capability('taasisi', 'view'));

drop policy if exists church_institution_project_expenses_mutate on public.church_institution_project_expenses;
create policy church_institution_project_expenses_mutate on public.church_institution_project_expenses
  for all to authenticated
  using (public.portal_has_module_capability('taasisi', 'edit'))
  with check (
    public.portal_has_module_capability('taasisi', 'create')
    or public.portal_has_module_capability('taasisi', 'edit')
  );

grant select, insert, update, delete on public.church_institution_project_expenses to authenticated;

-- ——— Analytics summary RPC ———
create or replace function public.portal_church_projects_analytics(
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
begin
  if not public.portal_has_module_capability('taasisi', 'view') then
    return jsonb_build_object('error', 'forbidden');
  end if;

  return (
    with base as (
      select p.*
      from public.church_institution_projects p
      where case v_scope
        when 'tawi' then p_entity_id is null or p.tawi_id = p_entity_id
        when 'jimbo' then
          p_entity_id is null
          or p.jimbo_id = p_entity_id
          or p.tawi_id in (select t.id from public.church_tawi t where t.jimbo_id = p_entity_id)
        when 'dayosisi' then
          p_entity_id is null
          or p.dayosisi_id = p_entity_id
          or p.jimbo_id in (select j.id from public.church_jimbo j where j.dayosisi_id = p_entity_id)
        else true
      end
    ),
    agg as (
      select
        count(*)::int as project_count,
        coalesce(sum(budget_income_tz), 0)::numeric(18,2) as income_total,
        coalesce(sum(budget_expense_tz), 0)::numeric(18,2) as expense_total,
        coalesce(sum(balance_tz), 0)::numeric(18,2) as balance_total,
        count(*) filter (where approval_status = 'active')::int as active_count
      from base
    ),
    by_type as (
      select project_type, count(*)::int as cnt,
        coalesce(sum(budget_income_tz), 0)::numeric(18,2) as income,
        coalesce(sum(balance_tz), 0)::numeric(18,2) as balance
      from base
      group by project_type
    )
    select jsonb_build_object(
      'scope', v_scope,
      'entity_id', p_entity_id,
      'project_count', (select project_count from agg),
      'income_total', (select income_total from agg),
      'expense_total', (select expense_total from agg),
      'balance_total', (select balance_total from agg),
      'active_count', (select active_count from agg),
      'by_type', coalesce((select jsonb_agg(jsonb_build_object(
        'project_type', project_type,
        'count', cnt,
        'income', income,
        'balance', balance
      )) from by_type), '[]'::jsonb)
    )
  );
end;
$$;

grant execute on function public.portal_church_projects_analytics(text, uuid) to authenticated;

notify pgrst, 'reload schema';

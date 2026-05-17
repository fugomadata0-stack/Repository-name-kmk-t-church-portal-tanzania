-- KMK(T) Step 3 — Finance Distribution Engine (additive)

alter table if exists public.church_income_remittances
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

create index if not exists church_income_remittances_receipt_idx
  on public.church_income_remittances (receipt_number)
  where receipt_number is not null and length(trim(receipt_number)) > 0;

-- ——— Improved finance summary (accurate totals + direct KMK(T)) ———
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
        when 'jimbo' then
          p_entity_id is null
          or l.jimbo_id = p_entity_id
          or l.tawi_id in (select t.id from public.church_tawi t where t.jimbo_id = p_entity_id)
        when 'dayosisi' then
          p_entity_id is null
          or l.dayosisi_id = p_entity_id
          or l.jimbo_id in (select j.id from public.church_jimbo j where j.dayosisi_id = p_entity_id)
          or l.tawi_id in (
            select t.id from public.church_tawi t
            inner join public.church_jimbo j on j.id = t.jimbo_id
            where j.dayosisi_id = p_entity_id
          )
        else true
      end
  ),
  fin as (
    select f.*
    from public.church_finance_entries f
    where f.entry_date >= v_start and f.entry_date <= v_end
      and case v_scope
        when 'tawi' then p_entity_id is null or f.tawi_id = p_entity_id
        when 'jimbo' then
          p_entity_id is null
          or f.jimbo_id = p_entity_id
          or f.tawi_id in (select t.id from public.church_tawi t where t.jimbo_id = p_entity_id)
        when 'dayosisi' then
          p_entity_id is null
          or f.dayosisi_id = p_entity_id
          or f.jimbo_id in (select j.id from public.church_jimbo j where j.dayosisi_id = p_entity_id)
        else true
      end
  ),
  rem as (
    select r.*
    from public.church_income_remittances r
    where coalesce(r.period_start, v_start) <= v_end
      and coalesce(r.period_end, v_end) >= v_start
  ),
  agg as (
    select
      coalesce((select sum(amount_tz) from lines), 0)::numeric(18,2) as income_total,
      coalesce((select sum(coalesce(amount_local_tz, 0)) from lines), 0)::numeric(18,2) as income_local,
      coalesce((select sum(coalesce(amount_upward_tz, 0)) from lines), 0)::numeric(18,2) as income_upward,
      coalesce((select sum(amount_tz) from fin where lower(coalesce(aina, kategoria, '')) like '%matumizi%'), 0)::numeric(18,2) as expenses_total,
      coalesce((select sum(coalesce(transfer_amount_tz, amount_tz, 0)) from rem where approval_status = 'approved'), 0)::numeric(18,2) as transfers_approved,
      coalesce((select sum(coalesce(transfer_amount_tz, amount_tz, 0)) from rem where approval_status = 'pending'), 0)::numeric(18,2) as transfers_pending,
      coalesce((select sum(coalesce(transfer_amount_tz, amount_tz, 0)) from rem where from_level = 'external' and to_level = 'kmkt'), 0)::numeric(18,2) as direct_kmkt_total,
      coalesce((select sum(coalesce(remaining_amount_tz, 0)) from rem where approval_status = 'approved'), 0)::numeric(18,2) as retain_recorded
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
    'direct_kmkt_total', direct_kmkt_total,
    'remaining', greatest(income_local - transfers_approved, income_total - expenses_total - transfers_approved)
  )
  into v_result
  from agg;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

-- ——— Receipt number generator (optional call from app) ———
create or replace function public.portal_generate_finance_receipt_number(p_prefix text default 'KMKT-RCP')
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_seq bigint;
  v_prefix text := upper(trim(coalesce(p_prefix, 'KMKT-RCP')));
begin
  select count(*) + 1 into v_seq from public.church_income_remittances;
  return v_prefix || '-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_seq::text, 5, '0');
end;
$$;

grant execute on function public.portal_generate_finance_receipt_number(text) to authenticated;

notify pgrst, 'reload schema';

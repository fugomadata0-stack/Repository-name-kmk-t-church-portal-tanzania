create or replace function public.current_app_role()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'app_role')::text, 'member') $$;
create or replace function public.current_dayosisi()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'dayosisi')::text, '') $$;
create or replace function public.current_tawi()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'tawi')::text, '') $$;

alter table public.finance_transactions enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_approvals enable row level security;
alter table public.finance_reports enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "finance_transactions_select_strict" on public.finance_transactions;
create policy "finance_transactions_select_strict" on public.finance_transactions
for select to authenticated
using (
  public.current_app_role() in ('super_admin','admin')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() in ('mchungaji','finance_officer') and tawi = public.current_tawi())
  or (public.current_app_role() = 'member' and status = 'approved')
);

drop policy if exists "finance_transactions_rw_strict" on public.finance_transactions;
create policy "finance_transactions_rw_strict" on public.finance_transactions
for all to authenticated
using (
  public.current_app_role() in ('super_admin','admin','finance_officer')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
)
with check (
  public.current_app_role() in ('super_admin','admin','finance_officer')
  or (public.current_app_role() = 'askofu_dayosisi' and dayosisi = public.current_dayosisi())
  or (public.current_app_role() = 'mchungaji' and tawi = public.current_tawi())
);

drop policy if exists "finance_budgets_rw_strict" on public.finance_budgets;
create policy "finance_budgets_rw_strict" on public.finance_budgets
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','finance_officer','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','finance_officer','askofu_dayosisi'));

drop policy if exists "finance_approvals_rw_strict" on public.finance_approvals;
create policy "finance_approvals_rw_strict" on public.finance_approvals
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi'));

drop policy if exists "finance_reports_select_strict" on public.finance_reports;
create policy "finance_reports_select_strict" on public.finance_reports
for select to authenticated
using (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','finance_officer'));

drop policy if exists "audit_logs_insert_strict" on public.audit_logs;
create policy "audit_logs_insert_strict" on public.audit_logs
for insert to authenticated
with check (public.current_app_role() in ('super_admin','admin','askofu_dayosisi','finance_officer','mchungaji'));

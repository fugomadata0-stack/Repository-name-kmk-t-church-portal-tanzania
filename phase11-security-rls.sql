create or replace function public.current_app_role()
returns text language sql stable as $$ select coalesce((auth.jwt() ->> 'app_role')::text, 'member') $$;

alter table public.payment_transactions enable row level security;
alter table public.payment_verifications enable row level security;
alter table public.refund_requests enable row level security;
alter table public.payment_settings enable row level security;
alter table public.payment_logs enable row level security;

drop policy if exists "payments_select_strict" on public.payment_transactions;
create policy "payments_select_strict" on public.payment_transactions
for select to authenticated
using (
  public.current_app_role() in ('super_admin','admin','finance_officer','askofu_dayosisi')
  or (public.current_app_role() = 'member' and final_status = 'success')
);

drop policy if exists "payments_rw_strict" on public.payment_transactions;
create policy "payments_rw_strict" on public.payment_transactions
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','finance_officer','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','finance_officer','askofu_dayosisi'));

drop policy if exists "verifications_rw_strict" on public.payment_verifications;
create policy "verifications_rw_strict" on public.payment_verifications
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','finance_officer','askofu_dayosisi'))
with check (public.current_app_role() in ('super_admin','admin','finance_officer','askofu_dayosisi'));

drop policy if exists "refunds_rw_strict" on public.refund_requests;
create policy "refunds_rw_strict" on public.refund_requests
for all to authenticated
using (public.current_app_role() in ('super_admin','admin','finance_officer'))
with check (public.current_app_role() in ('super_admin','admin','finance_officer'));

drop policy if exists "settings_rw_strict" on public.payment_settings;
create policy "settings_rw_strict" on public.payment_settings
for all to authenticated
using (public.current_app_role() in ('super_admin','admin'))
with check (public.current_app_role() in ('super_admin','admin'));

drop policy if exists "payment_logs_insert_strict" on public.payment_logs;
create policy "payment_logs_insert_strict" on public.payment_logs
for insert to authenticated
with check (public.current_app_role() in ('super_admin','admin','finance_officer','askofu_dayosisi'));

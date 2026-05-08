create table if not exists payment_methods (
  id bigserial primary key,
  method_name text not null, -- M-Pesa, Airtel Money, Tigo Pesa, HaloPesa, Card
  is_enabled boolean default true,
  created_at timestamptz default now()
);

create table if not exists payment_transactions (
  id text primary key,
  tarehe date,
  mlipaji text,
  mawasiliano text,
  channel text,
  purpose text,
  amount numeric(14,2) default 0,
  reference text,
  verification_status text default 'pending',
  final_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists payment_verifications (
  id text primary key,
  tx_id text,
  mlipaji text,
  reference text,
  verification_status text default 'pending',
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists refund_requests (
  id text primary key,
  tx_id text,
  requester text,
  amount numeric(14,2) default 0,
  reason text,
  status text default 'pending',
  date date,
  created_at timestamptz default now()
);

create table if not exists donation_forms (
  id bigserial primary key,
  name text,
  phone text,
  email text,
  dayosisi text,
  jimbo text,
  tawi text,
  donation_type text,
  amount numeric(14,2),
  payment_method text,
  created_at timestamptz default now()
);

create table if not exists payment_settings (
  id bigserial primary key,
  key text unique not null,
  value text,
  created_at timestamptz default now()
);

create table if not exists payment_logs (
  id bigserial primary key,
  actor_role text,
  action text,
  description text,
  payload jsonb,
  created_at timestamptz default now()
);

alter table payment_methods enable row level security;
alter table payment_transactions enable row level security;
alter table payment_verifications enable row level security;
alter table refund_requests enable row level security;
alter table donation_forms enable row level security;
alter table payment_settings enable row level security;
alter table payment_logs enable row level security;

drop policy if exists "payment_methods_all_auth" on payment_methods;
create policy "payment_methods_all_auth" on payment_methods for all to authenticated using (true) with check (true);
drop policy if exists "payment_transactions_all_auth" on payment_transactions;
create policy "payment_transactions_all_auth" on payment_transactions for all to authenticated using (true) with check (true);
drop policy if exists "payment_verifications_all_auth" on payment_verifications;
create policy "payment_verifications_all_auth" on payment_verifications for all to authenticated using (true) with check (true);
drop policy if exists "refund_requests_all_auth" on refund_requests;
create policy "refund_requests_all_auth" on refund_requests for all to authenticated using (true) with check (true);
drop policy if exists "donation_forms_all_auth" on donation_forms;
create policy "donation_forms_all_auth" on donation_forms for all to authenticated using (true) with check (true);
drop policy if exists "payment_settings_all_auth" on payment_settings;
create policy "payment_settings_all_auth" on payment_settings for all to authenticated using (true) with check (true);
drop policy if exists "payment_logs_all_auth" on payment_logs;
create policy "payment_logs_all_auth" on payment_logs for all to authenticated using (true) with check (true);

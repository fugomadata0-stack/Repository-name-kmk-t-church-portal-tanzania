create table if not exists notifications (
  id bigserial primary key,
  title text not null,
  type text,
  priority text,
  audience text,
  scheduled_date date,
  status text default 'draft',
  sent_by text,
  created_at timestamptz default now()
);

create table if not exists sms_campaigns (
  id bigserial primary key,
  campaign_name text,
  audience text,
  message_preview text,
  count integer default 0,
  scheduled_date date,
  delivery_status text default 'draft',
  cost text,
  created_at timestamptz default now()
);

create table if not exists email_campaigns (
  id bigserial primary key,
  campaign_name text,
  subject text,
  audience text,
  scheduled_date date,
  sent_count integer default 0,
  open_rate text,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists message_templates (
  id bigserial primary key,
  template_name text,
  type text,
  language text,
  audience text,
  last_updated date,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists scheduled_messages (
  id bigserial primary key,
  channel text,
  payload jsonb,
  scheduled_for timestamptz,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists delivery_reports (
  id bigserial primary key,
  channel text,
  sent integer default 0,
  delivered integer default 0,
  failed integer default 0,
  created_at timestamptz default now()
);

create table if not exists notification_logs (
  id bigserial primary key,
  actor_role text,
  action text,
  description text,
  payload jsonb,
  status text,
  created_at timestamptz default now()
);

alter table notifications enable row level security;
alter table sms_campaigns enable row level security;
alter table email_campaigns enable row level security;
alter table message_templates enable row level security;
alter table scheduled_messages enable row level security;
alter table delivery_reports enable row level security;
alter table notification_logs enable row level security;

drop policy if exists "notifications_all_auth" on notifications;
create policy "notifications_all_auth" on notifications for all to authenticated using (true) with check (true);
drop policy if exists "sms_campaigns_all_auth" on sms_campaigns;
create policy "sms_campaigns_all_auth" on sms_campaigns for all to authenticated using (true) with check (true);
drop policy if exists "email_campaigns_all_auth" on email_campaigns;
create policy "email_campaigns_all_auth" on email_campaigns for all to authenticated using (true) with check (true);
drop policy if exists "message_templates_all_auth" on message_templates;
create policy "message_templates_all_auth" on message_templates for all to authenticated using (true) with check (true);
drop policy if exists "scheduled_messages_all_auth" on scheduled_messages;
create policy "scheduled_messages_all_auth" on scheduled_messages for all to authenticated using (true) with check (true);
drop policy if exists "delivery_reports_all_auth" on delivery_reports;
create policy "delivery_reports_all_auth" on delivery_reports for all to authenticated using (true) with check (true);
drop policy if exists "notification_logs_all_auth" on notification_logs;
create policy "notification_logs_all_auth" on notification_logs for all to authenticated using (true) with check (true);

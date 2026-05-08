create table if not exists events (
  id bigserial primary key,
  jina text not null, aina text, dayosisi text, jimbo text, tawi text,
  tarehe date, muda_kuanza text, muda_kumaliza text, mahali text, msimamizi text,
  maelezo text, status text default 'planned', notes text, created_at timestamptz default now()
);
create table if not exists camps (
  id bigserial primary key,
  jina text not null, theme text, andiko text, kusudi text, dayosisi text, jimbo text, tawi text,
  mahali text, kuanza date, mwisho date, mhubiri text, mfundishaji text, organizer text,
  target text, budget numeric(14,2), maelezo text, status text default 'planned', notes text, created_at timestamptz default now()
);
create table if not exists event_participants (
  id bigserial primary key, jina text, simu text, event_id bigint references events(id) on delete cascade,
  tawi text, role text, payment_status text, attendance_status text, notes text, created_at timestamptz default now()
);
create table if not exists camp_participants (
  id bigserial primary key, jina text, simu text, camp_id bigint references camps(id) on delete cascade,
  tawi text, role text, payment_status text, attendance_status text, notes text, created_at timestamptz default now()
);
create table if not exists camp_speakers (
  id bigserial primary key, jina text, role text, item text, simu text, email text, topic text, andiko text, notes text, status text, created_at timestamptz default now()
);
create table if not exists camp_budgets (
  id bigserial primary key, kambi text, kipengele text, planned numeric(14,2), used numeric(14,2), balance numeric(14,2), status text, created_at timestamptz default now()
);
create table if not exists camp_attendance (
  id bigserial primary key, kambi text, mshiriki text, tarehe date, status text, notes text, created_at timestamptz default now()
);
create table if not exists camp_media (
  id bigserial primary key, kambi text, file_name text, type text, uploaded_by text, date date, visibility text, created_at timestamptz default now()
);
create table if not exists scheduled_messages (
  id bigserial primary key, target_type text, target_id text, channel text, payload jsonb, status text default 'pending', scheduled_for timestamptz, created_at timestamptz default now()
);

alter table events enable row level security;
alter table camps enable row level security;
alter table event_participants enable row level security;
alter table camp_participants enable row level security;
alter table camp_speakers enable row level security;
alter table camp_budgets enable row level security;
alter table camp_attendance enable row level security;
alter table camp_media enable row level security;
alter table scheduled_messages enable row level security;

drop policy if exists "events_all_auth" on events;
create policy "events_all_auth" on events for all to authenticated using (true) with check (true);
drop policy if exists "camps_all_auth" on camps;
create policy "camps_all_auth" on camps for all to authenticated using (true) with check (true);
drop policy if exists "event_participants_all_auth" on event_participants;
create policy "event_participants_all_auth" on event_participants for all to authenticated using (true) with check (true);
drop policy if exists "camp_participants_all_auth" on camp_participants;
create policy "camp_participants_all_auth" on camp_participants for all to authenticated using (true) with check (true);
drop policy if exists "camp_speakers_all_auth" on camp_speakers;
create policy "camp_speakers_all_auth" on camp_speakers for all to authenticated using (true) with check (true);
drop policy if exists "camp_budgets_all_auth" on camp_budgets;
create policy "camp_budgets_all_auth" on camp_budgets for all to authenticated using (true) with check (true);
drop policy if exists "camp_attendance_all_auth" on camp_attendance;
create policy "camp_attendance_all_auth" on camp_attendance for all to authenticated using (true) with check (true);
drop policy if exists "camp_media_all_auth" on camp_media;
create policy "camp_media_all_auth" on camp_media for all to authenticated using (true) with check (true);
drop policy if exists "scheduled_messages_all_auth" on scheduled_messages;
create policy "scheduled_messages_all_auth" on scheduled_messages for all to authenticated using (true) with check (true);

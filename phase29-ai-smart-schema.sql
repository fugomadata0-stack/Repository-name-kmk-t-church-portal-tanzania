-- PHASE 29: AI Smart Assistant / Msaidizi Mwerevu
-- Future-ready placeholder schema (no real AI API integration)

create table if not exists ai_insights (
  id bigserial primary key,
  insight_id text unique,
  module text,
  type text,
  priority text,
  message_preview text,
  suggested_action text,
  status text default 'New',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists smart_alerts (
  id bigserial primary key,
  alert_type text,
  alert_message text,
  priority text,
  status text default 'new',
  created_at timestamptz default now()
);

create table if not exists duplicate_checks (
  id bigserial primary key,
  source_module text,
  duplicate_key text,
  details text,
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists prediction_snapshots (
  id bigserial primary key,
  prediction_type text,
  snapshot_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists recommendation_logs (
  id bigserial primary key,
  recommendation text,
  target_module text,
  status text default 'new',
  created_at timestamptz default now()
);

create table if not exists ai_activity_logs (
  id bigserial primary key,
  action text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

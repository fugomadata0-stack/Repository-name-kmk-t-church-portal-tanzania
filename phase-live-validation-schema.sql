-- Live Validation Center history table
create table if not exists public.validation_runs (
  id bigserial primary key,
  run_at timestamptz not null default now(),
  pass_count integer not null default 0,
  warn_count integer not null default 0,
  fail_count integer not null default 0,
  total_count integer not null default 0,
  mode text not null default 'supabase'
);

create index if not exists idx_validation_runs_run_at on public.validation_runs (run_at desc);

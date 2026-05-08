import { getSafeSupabase, safeAsync } from "./phase-integration-core.js";
const RUNS_KEY = "kmt_validation_runs";

const tableChecks = [
  "members",
  "leaders",
  "ministries",
  "events",
  "attendance_records",
  "finance_transactions",
  "payment_transactions",
  "media_items",
  "reports_registry",
  "system_settings",
  "chief_admin_profile",
  "super_admin_slots",
  "system_health",
  "admin_actions",
];

function ok(name, detail) {
  return { name, status: "PASS", detail };
}
function warn(name, detail) {
  return { name, status: "WARN", detail };
}
function fail(name, detail) {
  return { name, status: "FAIL", detail };
}

export async function runLiveValidation() {
  const results = [];
  const s = getSafeSupabase();
  if (!s) {
    results.push(fail("Supabase Client", "Config haijakamilika au supabase lib haijapakiwa."));
    return results;
  }

  const ping = await safeAsync("validation_ping", async () => s.from("members").select("id", { count: "exact", head: true }), null);
  if (!ping || ping.error) {
    results.push(fail("Supabase Connectivity", ping?.error?.message || "Ping query failed."));
    return results;
  }
  results.push(ok("Supabase Connectivity", "Connection iko hai."));

  for (const table of tableChecks) {
    const res = await safeAsync(`validation_table_${table}`, async () => s.from(table).select("id", { count: "exact", head: true }), null);
    if (!res || res.error) {
      results.push(fail(`Table: ${table}`, res?.error?.message || "Not accessible."));
    } else {
      results.push(ok(`Table: ${table}`, `Accessible, count=${res.count ?? 0}`));
    }
  }

  const relationRes = await safeAsync(
    "validation_relation_admin_actions_error_logs",
    async () => s.from("admin_actions").select("id,related_error:error_logs(id)").limit(1),
    null
  );
  if (!relationRes || relationRes.error) {
    results.push(warn("Relation: admin_actions -> error_logs", relationRes?.error?.message || "Relation check failed."));
  } else {
    results.push(ok("Relation: admin_actions -> error_logs", "Join/select ya relation imefaulu."));
  }

  const writeProbe = await safeAsync(
    "validation_write_probe_diagnostics_logs",
    async () =>
      s.from("diagnostics_logs").insert({ note: "Validation probe", created_at: new Date().toISOString() }).select("id").limit(1),
    null
  );
  if (!writeProbe || writeProbe.error) {
    results.push(warn("Write Probe: diagnostics_logs", writeProbe?.error?.message || "Insert probe failed (possible RLS)."));
  } else {
    results.push(ok("Write Probe: diagnostics_logs", "Insert probe imefaulu."));
  }

  const dashboardRes = await safeAsync(
    "validation_dashboard_metrics",
    async () => s.from("dashboard_metrics").select("*").order("id", { ascending: false }).limit(1),
    null
  );
  if (!dashboardRes || dashboardRes.error) {
    results.push(warn("Dashboard Data Feed", dashboardRes?.error?.message || "dashboard_metrics haipatikani."));
  } else {
    results.push(ok("Dashboard Data Feed", "dashboard_metrics readable."));
  }

  return results;
}

export async function saveValidationRun(results) {
  const summary = {
    run_at: new Date().toISOString(),
    pass_count: results.filter((x) => x.status === "PASS").length,
    warn_count: results.filter((x) => x.status === "WARN").length,
    fail_count: results.filter((x) => x.status === "FAIL").length,
    total_count: results.length,
    mode: getSafeSupabase() ? "supabase" : "local",
  };

  try {
    const raw = localStorage.getItem(RUNS_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    rows.unshift(summary);
    localStorage.setItem(RUNS_KEY, JSON.stringify(rows.slice(0, 100)));
  } catch (_) {
    // ignore storage issue
  }

  const s = getSafeSupabase();
  if (!s) return summary;
  await safeAsync(
    "validation_save_run",
    async () =>
      s.from("validation_runs").insert({
        run_at: summary.run_at,
        pass_count: summary.pass_count,
        warn_count: summary.warn_count,
        fail_count: summary.fail_count,
        total_count: summary.total_count,
        mode: summary.mode,
      }),
    null
  );
  return summary;
}

export async function loadValidationHistory() {
  const s = getSafeSupabase();
  if (s) {
    const live = await safeAsync(
      "validation_load_history",
      async () => s.from("validation_runs").select("*").order("run_at", { ascending: false }).limit(50),
      null
    );
    if (live && !live.error && Array.isArray(live.data) && live.data.length) {
      return live.data.map((r) => ({
        run_at: r.run_at,
        pass_count: r.pass_count || 0,
        warn_count: r.warn_count || 0,
        fail_count: r.fail_count || 0,
        total_count: r.total_count || 0,
        mode: r.mode || "supabase",
      }));
    }
  }
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch (_) {
    return [];
  }
}

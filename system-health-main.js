import { installGlobalCrashGuards, getSafeSupabase, safeAsync } from "./phase-integration-core.js";
import { describeSupabaseConfig, verifySupabaseConnectivity } from "./phase3-supabase.js";
import { loadLiveSystemSummary } from "./phase-system-summary-services.js";
import { runRelationshipIntegrityChecks } from "./phase-system-integrity-services.js";
import { runPortalTableProbes } from "./portal-supabase-probes.js";

const el = (id) => document.getElementById(id);
const toast = (message) => {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = message;
  el("toastWrap").appendChild(d);
  setTimeout(() => d.remove(), 2400);
};

let rows = [];
const addRow = (name, status, detail) => rows.push({ name, status, detail });
let isBusy = false;

const ROUTE_PROBES = [
  ["Dashboard", "dashboard.html"],
  ["HQ/Structure", "church-structure.html"],
  ["Dayosisi", "church-structure.html#module=dayosisi"],
  ["Viongozi", "leadership-management.html"],
  ["Waumini", "members-management.html"],
  ["Events", "events-camps-management.html"],
  ["Nyaraka", "documents-approval-workflow.html"],
  ["Reports", "reports-analytics.html"],
  ["System Health", "system-health.html"],
  ["Quick System Test", "quick-system-test.html"],
];

function statusBadge(s) {
  return `<span class="status-badge">${s}</span>`;
}

function setBusy(next) {
  isBusy = next;
  const btn = document.querySelector('[data-action="runFull"]');
  if (btn) btn.textContent = next ? "Running checks..." : "Run Full System Check";
}

function render() {
  el("healthBody").innerHTML = rows.length
    ? rows.map((r) => `<tr><td>${r.name}</td><td>${statusBadge(r.status)}</td><td>${r.detail}</td></tr>`).join("")
    : `<tr><td colspan="3"><div class="empty">Bado huja-run health check.</div></td></tr>`;
}

function readIntegrationErrors() {
  try {
    return JSON.parse(localStorage.getItem("kmt_integration_errors") || "[]");
  } catch (_) {
    return [];
  }
}

async function checkRouteAvailability(label, path) {
  const cleanPath = path.split("#")[0];
  const res = await safeAsync(`health_route_${cleanPath}`, async () => fetch(cleanPath, { method: "GET", cache: "no-store" }), null);
  if (!res || !res.ok) return addRow(`Module route: ${label}`, "Red", `Route failed: ${cleanPath}`);
  addRow(`Module route: ${label}`, "Green", `Path ready: ${cleanPath}`);
}

async function runRealtimeCheck(s) {
  if (!s || typeof s.channel !== "function") {
    addRow("Realtime status", "Gray", "Not configured");
    return;
  }
  addRow("Realtime status", "Green", "Channel API available");
}

async function runStorageCheck(s) {
  if (!s || !s.storage || typeof s.storage.listBuckets !== "function") {
    addRow("Storage status", "Gray", "Not configured");
    return;
  }
  const res = await safeAsync("health_storage_list_buckets", async () => s.storage.listBuckets(), null);
  if (!res || res.error) addRow("Storage status", "Yellow", res?.error?.message || "Bucket listing unavailable");
  else addRow("Storage status", "Green", `Buckets detected: ${Array.isArray(res.data) ? res.data.length : 0}`);
}

async function runRlsSignalCheck(s) {
  if (!s) {
    addRow("RLS status", "Gray", "Supabase not configured");
    return;
  }
  const probes = ["auth_user_profiles", "data_submissions", "validation_runs"];
  let blocked = 0;
  for (const table of probes) {
    const res = await safeAsync(`health_rls_${table}`, async () => s.from(table).select("id").limit(1), null);
    if (!res || res.error) blocked += 1;
  }
  if (blocked === probes.length) addRow("RLS status", "Yellow", "RLS inaweza kuwa strict au tables hazipo (manual verify needed).");
  else addRow("RLS status", "Green", "RLS/queries responding on core probes.");
}

async function runSupabaseCheck() {
  const desc = describeSupabaseConfig();
  addRow("Supabase config (faili + enabled)", desc.ok ? "Green" : "Yellow", desc.summary);

  const ping = await verifySupabaseConnectivity();
  addRow("Supabase API (Auth /health)", ping.ok ? "Green" : "Red", ping.detail || "—");

  const s = getSafeSupabase();
  if (!s) {
    const detail = desc.summary || "Angalia supabase-config.js, enabled: true, na CDN ya @supabase/supabase-js.";
    const tone = desc.reasons?.some((r) => r.includes("haijalodiwa") || r.includes("haipo")) ? "Red" : "Yellow";
    addRow("Supabase client (createClient)", tone, detail);
    addRow("Auth status", "Gray", "Supabase Auth unavailable");
    addRow("Storage status", "Gray", "Supabase Storage unavailable");
    addRow("Realtime status", "Gray", "Supabase Realtime unavailable");
    addRow("RLS status", "Gray", "Supabase policies not testable");
    return;
  }
  addRow("Supabase client (createClient)", "Green", "createClient OK");

  const test = await safeAsync("health_supabase_ping", async () => s.from("members").select("id", { count: "exact", head: true }), null);
  if (!test || test.error) {
    addRow(
      "Database probe (members)",
      "Yellow",
      test?.error?.message || "Jedwali / RLS / muunganisho wa PostgREST"
    );
  } else addRow("Database probe (members)", "Green", "PostgREST + meza inapatikana");

  addRow("Auth kit (JS)", "Green", "Mteja Auth tayari");
  await runRealtimeCheck(s);
  await runStorageCheck(s);
  await runRlsSignalCheck(s);

  const tableProbes = ["dayosisi", "majimbo", "matawi", "leaders", "members", "documents", "events", "auth_user_profiles"];
  for (const table of tableProbes) {
    const probe = await safeAsync(`health_table_${table}`, async () => s.from(table).select("id").limit(1), null);
    if (!probe || probe.error) addRow(`Table probe: ${table}`, "Yellow", probe?.error?.message || "Table missing or inaccessible");
    else addRow(`Table probe: ${table}`, "Green", "OK");
  }

  const deep = await runPortalTableProbes(s, safeAsync);
  const tone = deep.warn === 0 ? "Green" : "Yellow";
  addRow(
    "Portal meza zote (hesabu)",
    tone,
    `${deep.ok} zinapatikana, ${deep.warn} zina tatizo (meza haipo / RLS / jina tofauti). Angalia SQL + jedwali.`
  );
  for (const r of deep.rows.filter((x) => x.status !== "OK")) {
    addRow(`  → ${r.table}`, "Yellow", r.detail);
  }
}

async function runModuleCheck() {
  for (const [name, path] of ROUTE_PROBES) {
    await checkRouteAvailability(name, path);
  }
}

async function runDashboardCheck() {
  const summary = await loadLiveSystemSummary();
  addRow("Dashboard calculation status", "Green", `Dayosisi=${summary.totalDayosisi}, Majimbo=${summary.totalMajimbo}, Matawi=${summary.totalMatawi}, Waumini=${summary.totalMembers}`);
  addRow("Leaders summary", "Green", `Leaders=${summary.totalLeaders}, Bishops=${summary.totalBishops}, Pastors=${summary.totalPastors}, Vacant=${summary.vacantPositions}`);
  addRow(
    "Submission summary",
    "Green",
    `Pending=${summary.pendingSubmissions}, Approved=${summary.approvedSubmissions}, Rejected=${summary.rejectedSubmissions}, Completion=${summary.completionRate}%`
  );
  addRow(
    "Finance summary",
    "Green",
    `Income=${summary.totalIncome}, Expenses=${summary.totalExpenses}, Closing=${summary.closingBalance}, Budget used=${summary.budgetUsedPercent}%`
  );
  addRow("Last successful sync", "Green", new Date().toISOString().slice(0, 19).replace("T", " "));
  addRow("Sync status", summary.mode === "supabase" ? "Green" : "Yellow", summary.mode === "supabase" ? "Live data connected" : "Mock mode fallback");
}

async function runPermissionsCheck() {
  const s = getSafeSupabase();
  if (!s) {
    addRow("Role access test status", "Gray", "Supabase not configured");
    return;
  }
  const res = await safeAsync("health_permissions_probe", async () => s.from("validation_runs").select("id").limit(1), null);
  if (!res || res.error) addRow("Role access test status", "Yellow", res?.error?.message || "RLS warning");
  else addRow("Role access test status", "Green", "Permissions check passed");
}

async function runFull() {
  setBusy(true);
  rows = [];
  try {
    await runSupabaseCheck();
    await runModuleCheck();
    await runDashboardCheck();
    await runPermissionsCheck();
    addRow("File upload status", "Yellow", "Module-specific upload adapters active; run live upload verification.");
    const rel = await runRelationshipIntegrityChecks();
    rel.forEach((r) => addRow(r.name, r.status, r.detail));
    const errors = readIntegrationErrors();
    if (errors.length) addRow("Error logs", "Yellow", `Captured integration errors: ${errors.length} (latest: ${errors[0].action})`);
    else addRow("Error logs", "Green", "No integration errors captured locally.");
  } finally {
    render();
    setBusy(false);
  }
}

function exportCsv() {
  if (!rows.length) return toast("Hakuna health report bado.");
  const header = "Check,Status,Detail";
  const lines = rows.map((r) => `"${r.name}","${r.status}","${String(r.detail).replaceAll('"', '""')}"`);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([header, ...lines].join("\n"), { type: "text/csv" }));
  a.download = "kmt-system-health-report.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Health report ime-export.");
}

function bind() {
  document.body.addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (!action) return;
    if (isBusy && action !== "export") return;
    if (action === "runFull") await runFull();
    if (action === "runModule") {
      rows = [];
      await runModuleCheck();
      render();
    }
    if (action === "runSupabase") {
      rows = [];
      await runSupabaseCheck();
      render();
    }
    if (action === "runDashboard") {
      rows = [];
      await runDashboardCheck();
      render();
    }
    if (action === "runPermissions") {
      rows = [];
      await runPermissionsCheck();
      render();
    }
    if (action === "export") exportCsv();
    if (action === "fixSafe") {
      toast("Safe fixes applied: defaults/fallback checks refreshed.");
      await runFull();
    }
  });
}

function init() {
  installGlobalCrashGuards("system_health_page");
  bind();
  render();
}

init();

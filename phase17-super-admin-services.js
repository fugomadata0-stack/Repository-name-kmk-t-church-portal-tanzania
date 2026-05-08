import { supabasePhase17Tables } from "./phase17-super-admin-hooks.js";
import { asArray, getSafeSupabase, recordIntegrationError, safeAsync } from "./phase-integration-core.js";
import { useLevelOwnership } from "./hooks/use-level-ownership.js";
import { useWorkflowEngine } from "./hooks/use-workflow-engine.js";
import { useComplianceTracking } from "./hooks/use-compliance-tracking.js";
import { buildReportMetadata, exportReportPlaceholder, resolveReportRows } from "./services/report-center-service.js";
import { getLocalAuditLogs, writeAuditLog } from "./services/audit-trail-service.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const stamp = () => Date.now() + Math.floor(Math.random() * 999);
const useSupabase = () => !!getSafeSupabase();

/** Set when maintenance_flags rows are loaded or first persisted (for UPDATE). */
let maintenanceFlagRowId = null;

/** When set, KPI "Realtime Connections" uses DB `online_users` count instead of mock nodes. */
let liveOnlineCountForKpi = null;

const DEFAULT_REALTIME_STATUS = [
  { node: "Realtime Node A", connections: 55, channel_health: "Healthy", status: "Online" },
  { node: "Realtime Node B", connections: 43, channel_health: "Healthy", status: "Online" },
  { node: "Realtime Node C", connections: 40, channel_health: "Monitoring", status: "Online" },
];

const state = {
  topKpis: [
    { label: "System Health", value: "98%", color: "green" },
    { label: "Active Modules", value: "14/14", color: "blue" },
    { label: "Error Count", value: "3", color: "red" },
    { label: "Storage Usage", value: "62%", color: "purple" },
    { label: "Realtime Connections", value: "138", color: "emerald" },
    { label: "API Status", value: "Stable", color: "yellow" },
    { label: "Background Jobs", value: "11 Running", color: "slate" },
    { label: "Maintenance Status", value: "Off", color: "gray" },
  ],
  systemHealth: [
    { name: "Auth Status", status: "Healthy", detail: "Supabase Auth ready", color: "green" },
    { name: "Database Placeholder", status: "Monitoring", detail: "Connection stable", color: "blue" },
    { name: "Storage Status", status: "Healthy", detail: "Buckets available", color: "green" },
    { name: "Realtime Status", status: "Healthy", detail: "Channels stable", color: "emerald" },
    { name: "Notification Services", status: "Healthy", detail: "In-app active", color: "green" },
    { name: "Payment Gateway Placeholder", status: "Placeholder", detail: "Future integration", color: "slate" },
    { name: "Media Processing Placeholder", status: "Placeholder", detail: "Queue staged", color: "slate" },
    { name: "Report Engine", status: "Healthy", detail: "Generation available", color: "green" },
  ],
  serviceStatus: [
    { id: 1, service_name: "Auth Service", status: "Online", latency_ms: 44, uptime: "99.98%" },
    { id: 2, service_name: "Database", status: "Online", latency_ms: 55, uptime: "99.91%" },
    { id: 3, service_name: "Storage", status: "Online", latency_ms: 62, uptime: "99.87%" },
    { id: 4, service_name: "Realtime", status: "Online", latency_ms: 41, uptime: "99.94%" },
  ],
  moduleHealth: [
    { id: 1, module_name: "Access Control", status: "Healthy", last_sync: now(), coverage: "100%" },
    { id: 2, module_name: "People & Ministry", status: "Healthy", last_sync: now(), coverage: "98%" },
    { id: 3, module_name: "Reports", status: "Healthy", last_sync: now(), coverage: "97%" },
    { id: 4, module_name: "Library", status: "Warning", last_sync: now(), coverage: "90%" },
  ],
  errorLogs: [
    { id: 1, timestamp: now(), severity: "Warning", module: "Auth", error_type: "Login Retry", message_preview: "Repeated login attempts from one IP.", status: "Open", assigned_to: "Security Team" },
    { id: 2, timestamp: now(), severity: "Info", module: "Reports", error_type: "Timeout", message_preview: "Report generation exceeded target duration.", status: "Monitoring", assigned_to: "Reports Team" },
  ],
  performanceMetrics: [
    { id: 1, metric_name: "Page Load Trend", metric_value: "1.4s avg", metric_status: "Good" },
    { id: 2, metric_name: "API Response Placeholder", metric_value: "220ms avg", metric_status: "Stable" },
    { id: 3, metric_name: "Storage Growth", metric_value: "+4.1% monthly", metric_status: "Track" },
    { id: 4, metric_name: "Media Upload Trend", metric_value: "286/day", metric_status: "High" },
    { id: 5, metric_name: "Notification Queue Placeholder", metric_value: "31 pending", metric_status: "Normal" },
    { id: 6, metric_name: "Report Generation Trend", metric_value: "84/day", metric_status: "Good" },
  ],
  storageUsage: [
    { bucket: "documents-private", used: "124 GB", limit: "500 GB", growth: "+3.2%" },
    { bucket: "media-library", used: "378 GB", limit: "1000 GB", growth: "+5.1%" },
    { bucket: "public-assets", used: "29 GB", limit: "200 GB", growth: "+1.0%" },
  ],
  realtimeStatus: DEFAULT_REALTIME_STATUS.map((r) => ({ ...r })),
  maintenanceFlag: { enabled: false, message: "Normal operations", updated_at: now() },
  debugMode: false,
  visitors: [
    { id: 1, jina: "Guest", role: "Visitor", device: "Mobile", browser: "Chrome", current_page: "dashboard.html", login_time: now(), last_seen: now(), session_duration: "00:08:11", online_status: "Online", location: "TZ Placeholder" },
    { id: 2, jina: "REV. MUSA", role: "Chief Admin", device: "Desktop", browser: "Edge", current_page: "super-admin-control-center.html", login_time: now(), last_seen: now(), session_duration: "00:41:56", online_status: "Online", location: "TZ Placeholder" },
  ],
};

const ownershipHook = useLevelOwnership();
const workflowHook = useWorkflowEngine();
const complianceHook = useComplianceTracking();

function formatDurationSeconds(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return [h, m, r].map((n) => String(n).padStart(2, "0")).join(":");
}

/** @param {number | null} [rowLimit] max rows (omit for no limit) */
async function readTable(tableName, orderBy = "id", ascending = false, rowLimit = null) {
  if (!useSupabase()) return [];
  const s = getSafeSupabase();
  if (!s) return [];
  const result = await safeAsync(
    `phase17_read_${tableName}`,
    async () => {
      let q = s.from(tableName).select("*").order(orderBy, { ascending });
      if (rowLimit != null && Number.isFinite(rowLimit) && rowLimit > 0) q = q.limit(rowLimit);
      return q;
    },
    null
  );
  if (!result || result.error) {
    if (result?.error) recordIntegrationError(`phase17_read_${tableName}_failed`, result.error, { tableName });
    return [];
  }
  return asArray(result.data);
}

async function getAuthUserId() {
  const s = getSafeSupabase();
  if (!s) return null;
  const res = await safeAsync("phase17_auth_get_user", () => s.auth.getUser(), null);
  if (!res || res.error) return null;
  return res.data?.user?.id ?? null;
}

async function ensureMaintenanceRowId() {
  if (maintenanceFlagRowId != null) return maintenanceFlagRowId;
  if (!useSupabase()) return null;
  const s = getSafeSupabase();
  if (!s) return null;
  const res = await safeAsync(
    "phase17_maintenance_select_id",
    async () =>
      s.from(supabasePhase17Tables.maintenanceFlags).select("id").order("id", { ascending: true }).limit(1).maybeSingle(),
    null
  );
  if (res?.data?.id) {
    maintenanceFlagRowId = res.data.id;
    return maintenanceFlagRowId;
  }
  return null;
}

async function persistMaintenanceFlag() {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  const updated_at = new Date().toISOString();
  const updated_by = await getAuthUserId();
  const patch = {
    enabled: state.maintenanceFlag.enabled,
    message: state.maintenanceFlag.message,
    updated_at,
    updated_by,
  };
  let id = await ensureMaintenanceRowId();
  if (id != null) {
    const res = await safeAsync(
      "phase17_maintenance_update",
      async () => s.from(supabasePhase17Tables.maintenanceFlags).update(patch).eq("id", id),
      null
    );
    if (res?.error) recordIntegrationError("phase17_maintenance_update_failed", res.error, { id });
    return;
  }
  const ins = await safeAsync(
    "phase17_maintenance_insert",
    async () =>
      s
        .from(supabasePhase17Tables.maintenanceFlags)
        .insert({ enabled: patch.enabled, message: patch.message, updated_by })
        .select("id")
        .single(),
    null
  );
  if (ins?.error) recordIntegrationError("phase17_maintenance_insert_failed", ins.error, {});
  else if (ins?.data?.id) maintenanceFlagRowId = ins.data.id;
}

/**
 * Inapakia data zote za dashboard za Phase 17 kwa mzunguko mmoja wa maombi ya parallel
 * (afya ya mfumo, huduma, makosa, wageni/wavuti, nk.).
 */
export async function loadSuperAdminControlData() {
  if (!useSupabase()) {
    liveOnlineCountForKpi = null;
    return;
  }

  const [
    systemRows,
    moduleRows,
    serviceRows,
    errorRows,
    metricRows,
    maintenanceRows,
    visitorRows,
    onlineUserRows,
  ] = await Promise.all([
    readTable(supabasePhase17Tables.systemHealth, "id", true),
    readTable(supabasePhase17Tables.moduleHealth, "id", true),
    readTable(supabasePhase17Tables.serviceStatus, "id", true),
    readTable(supabasePhase17Tables.errorLogs, "id", false, 400),
    readTable(supabasePhase17Tables.performanceMetrics, "id", true),
    readTable(supabasePhase17Tables.maintenanceFlags, "id", false),
    readTable(supabasePhase17Tables.visitorTracking, "id", false, 120),
    readTable(supabasePhase17Tables.onlineUsers, "id", false, 250),
  ]);

  if (systemRows.length) {
    state.systemHealth = systemRows.map((r) => ({
      name: r.name || "Health Item",
      status: r.status || "Monitoring",
      detail: r.detail || "-",
      color: r.color || "blue",
    }));
  }
  if (moduleRows.length) {
    state.moduleHealth = moduleRows.map((r) => ({
      id: r.id,
      module_name: r.module_name || r.module || "Module",
      status: r.status || "Unknown",
      last_sync: r.last_sync ? String(r.last_sync).slice(0, 19).replace("T", " ") : now(),
      coverage: r.coverage || "0%",
    }));
  }
  if (serviceRows.length) {
    state.serviceStatus = serviceRows.map((r) => ({
      id: r.id,
      service_name: r.service_name || "Service",
      status: r.status || "Unknown",
      latency_ms: r.latency_ms ?? 0,
      uptime: r.uptime || "-",
    }));
  }
  if (errorRows.length) {
    state.errorLogs = errorRows.map((r) => ({
      id: r.id,
      timestamp: r.created_at ? String(r.created_at).slice(0, 19).replace("T", " ") : now(),
      severity: r.severity || "Info",
      module: r.module_name || r.module || "Unknown",
      error_type: r.error_type || "System",
      message_preview: r.message_preview || r.message || "-",
      status: r.status || "Open",
      assigned_to: r.assigned_to || "Unassigned",
    }));
  }
  if (metricRows.length) {
    state.performanceMetrics = metricRows.map((r) => ({
      id: r.id,
      metric_name: r.metric_name || "Metric",
      metric_value: r.metric_value || "-",
      metric_status: r.metric_status || "Normal",
    }));
  }
  if (maintenanceRows.length) {
    const m = maintenanceRows[0];
    maintenanceFlagRowId = m.id ?? maintenanceFlagRowId;
    state.maintenanceFlag = {
      enabled: !!m.enabled,
      message: m.message || "Maintenance state updated",
      updated_at: m.updated_at ? String(m.updated_at).slice(0, 19).replace("T", " ") : now(),
    };
  } else {
    maintenanceFlagRowId = null;
  }
  if (visitorRows.length) {
    state.visitors = visitorRows.map((r) => ({
      id: r.id,
      jina: r.actor_name || "Guest",
      role: r.role || "Visitor",
      device: r.device_type || "-",
      browser: r.browser || "-",
      current_page: r.current_page || "-",
      login_time: r.login_time ? String(r.login_time).slice(0, 19).replace("T", " ") : now(),
      last_seen: r.last_seen ? String(r.last_seen).slice(0, 19).replace("T", " ") : now(),
      session_duration: formatDurationSeconds(r.session_duration_seconds),
      online_status: String(r.online_status || "").toLowerCase() === "online" ? "Online" : "Offline",
      location: r.location_placeholder || "—",
    }));
  } else {
    state.visitors = [];
  }

  if (onlineUserRows.length) {
    liveOnlineCountForKpi = onlineUserRows.filter((r) => String(r.online_status || "").toLowerCase() === "online").length;
    const total = onlineUserRows.length;
    const rest = Math.max(0, total - liveOnlineCountForKpi);
    state.realtimeStatus = [
      {
        node: "Waliopo mtandaoni (DB)",
        connections: liveOnlineCountForKpi,
        channel_health: liveOnlineCountForKpi ? "Healthy" : "Monitoring",
        status: "Online",
      },
      { node: "Jumla ya rekodi (online_users)", connections: total, channel_health: "OK", status: "Online" },
      { node: "Nje ya mtandao / nyingine", connections: rest, channel_health: rest ? "Monitoring" : "Healthy", status: "Online" },
    ];
  } else {
    liveOnlineCountForKpi = null;
    state.realtimeStatus = DEFAULT_REALTIME_STATUS.map((r) => ({ ...r }));
  }

  syncTopKpis();
}

/** Jina mbadala: sync ya kiotomatiki ya data zote za command center (ndani ya load moja ya parallel). */
export async function syncSuperAdminCommandCenter() {
  await loadSuperAdminControlData();
}

function syncTopKpis() {
  const openErrors = state.errorLogs.filter((x) => x.status !== "Resolved").length;
  const activeModules = state.moduleHealth.filter((x) => x.status !== "Down").length;
  const rtConnections =
    liveOnlineCountForKpi != null
      ? liveOnlineCountForKpi
      : state.realtimeStatus.reduce((sum, n) => sum + Number(n.connections || 0), 0);
  state.topKpis = state.topKpis.map((k) => {
    if (k.label === "Active Modules") return { ...k, value: `${activeModules}/${state.moduleHealth.length || 0}` };
    if (k.label === "Error Count") return { ...k, value: String(openErrors) };
    if (k.label === "Realtime Connections") return { ...k, value: String(rtConnections) };
    if (k.label === "Maintenance Status") return { ...k, value: state.maintenanceFlag.enabled ? "On" : "Off", color: state.maintenanceFlag.enabled ? "yellow" : "gray" };
    return k;
  });
}

async function logAdminAction(action_name, action_payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  const actor_user_id = await getAuthUserId();
  const res = await safeAsync(
    "phase17_admin_action_log",
    async () => s.from(supabasePhase17Tables.adminActions).insert({ action_name, action_payload, actor_user_id }),
    null
  );
  if (res?.error) recordIntegrationError("phase17_admin_action_insert_failed", res.error, { action_name });
}

async function logDiagnostics(note) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  const actor_user_id = await getAuthUserId();
  const res = await safeAsync(
    "phase17_diagnostics_log",
    async () =>
      s.from(supabasePhase17Tables.diagnosticsLogs).insert({
        note,
        actor_user_id,
        created_at: new Date().toISOString(),
      }),
    null
  );
  if (res?.error) recordIntegrationError("phase17_diagnostics_insert_failed", res.error, {});
}

export function getTopKpis() {
  return [...state.topKpis];
}
export function getSystemHealthCards() {
  return [...state.systemHealth];
}
export function getServicesStatus() {
  return [...state.serviceStatus];
}
export function getModuleStatus() {
  return [...state.moduleHealth];
}
export function getErrorLogs() {
  return [...state.errorLogs];
}
export function getPerformanceMetrics() {
  return [...state.performanceMetrics];
}
export function getStorageUsage() {
  return [...state.storageUsage];
}
export function getRealtimeStatus() {
  return [...state.realtimeStatus];
}
export function getMaintenanceState() {
  return { ...state.maintenanceFlag, debugMode: state.debugMode };
}
export function getOwnershipRows() {
  return ownershipHook.getRows();
}
export function getWorkflowRows() {
  return workflowHook.getRecords();
}
export function getFilteredWorkflowRows(filters = {}) {
  if (typeof workflowHook.getFilteredRecords === "function") return workflowHook.getFilteredRecords(filters);
  return workflowHook.getRecords();
}
export function getComplianceRows() {
  return complianceHook.getRows();
}
export function getApprovalDashboardSummary(filters = {}) {
  return workflowHook.getSummary(filters);
}
export function getComplianceSummary() {
  return complianceHook.getSummary();
}
export function getVisitorTrackingRows() {
  return [...state.visitors];
}
export function getAuditRows() {
  return getLocalAuditLogs().slice(0, 120);
}
export function getFilteredAuditRows(filters = {}) {
  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const rows = getAuditRows();
  const userFilter = normalize(filters.user);
  const roleFilter = normalize(filters.role);
  const moduleFilter = normalize(filters.module);
  const actionFilter = normalize(filters.action);
  const statusFilter = normalize(filters.status);
  const searchFilter = normalize(filters.search);

  return rows.filter((row) => {
    if (userFilter && userFilter !== "all" && normalize(row.user) !== userFilter) return false;
    if (roleFilter && roleFilter !== "all" && normalize(row.role) !== roleFilter) return false;
    if (moduleFilter && moduleFilter !== "all" && normalize(row.module) !== moduleFilter) return false;
    if (actionFilter && actionFilter !== "all" && normalize(row.action) !== actionFilter) return false;
    if (statusFilter && statusFilter !== "all" && normalize(row.status) !== statusFilter) return false;
    if (searchFilter) {
      const content = [row.user, row.role, row.module, row.action, row.record, row.status, row.device, row.location_placeholder]
        .map((item) => normalize(item))
        .join(" ");
      if (!content.includes(searchFilter)) return false;
    }
    return true;
  });
}

export async function resolveError(id) {
  const row = state.errorLogs.find((x) => x.id === id);
  if (!row) return;
  row.status = "Resolved";
  syncTopKpis();
  if (useSupabase()) {
    const s = getSafeSupabase();
    if (s) {
      const res = await safeAsync(
        "phase17_error_resolve",
        async () => s.from(supabasePhase17Tables.errorLogs).update({ status: "Resolved" }).eq("id", id),
        null
      );
      if (res?.error) recordIntegrationError("phase17_error_resolve_failed", res.error, { id });
    }
  }
  await logAdminAction("resolve_error", { error_id: id });
}

export async function reopenError(id) {
  const row = state.errorLogs.find((x) => x.id === id);
  if (!row) return;
  row.status = "Open";
  syncTopKpis();
  if (useSupabase()) {
    const s = getSafeSupabase();
    if (s) {
      const res = await safeAsync(
        "phase17_error_reopen",
        async () => s.from(supabasePhase17Tables.errorLogs).update({ status: "Open" }).eq("id", id),
        null
      );
      if (res?.error) recordIntegrationError("phase17_error_reopen_failed", res.error, { id });
    }
  }
  await logAdminAction("reopen_error", { error_id: id });
}

export async function clearError(id) {
  state.errorLogs = state.errorLogs.filter((x) => x.id !== id);
  syncTopKpis();
  if (useSupabase()) {
    const s = getSafeSupabase();
    if (s) {
      const res = await safeAsync(
        "phase17_error_delete_one",
        async () => s.from(supabasePhase17Tables.errorLogs).delete().eq("id", id),
        null
      );
      if (res?.error) recordIntegrationError("phase17_error_delete_failed", res.error, { id });
    }
  }
  await logAdminAction("clear_error", { error_id: id });
}

export async function clearAllErrors() {
  state.errorLogs = [];
  syncTopKpis();
  if (useSupabase()) {
    const s = getSafeSupabase();
    if (s) {
      const res = await safeAsync(
        "phase17_error_delete_all",
        async () => s.from(supabasePhase17Tables.errorLogs).delete().neq("id", -1),
        null
      );
      if (res?.error) recordIntegrationError("phase17_error_delete_all_failed", res.error, {});
    }
  }
  await logAdminAction("clear_all_errors", {});
}

export async function refreshDashboardMetrics() {
  await syncSuperAdminCommandCenter();
  await logAdminAction("refresh_dashboard_metrics", {});
}

export async function recalculateSummaries() {
  await logAdminAction("recalculate_summaries", { at: now() });
}

export async function rerunReports() {
  await logAdminAction("rerun_reports", { at: now() });
}

export async function toggleMaintenanceMode() {
  state.maintenanceFlag.enabled = !state.maintenanceFlag.enabled;
  state.maintenanceFlag.updated_at = now();
  state.maintenanceFlag.message = state.maintenanceFlag.enabled ? "Maintenance mode enabled" : "Maintenance mode disabled";
  syncTopKpis();
  await persistMaintenanceFlag();
  await logAdminAction("toggle_maintenance", { enabled: state.maintenanceFlag.enabled });
}

export async function emergencyLogoutAllSessions() {
  await logAdminAction("emergency_logout_all_sessions", { at: now() });
}

export async function clearCachePlaceholder() {
  await logAdminAction("clear_cache_placeholder", { at: now() });
}

export async function rebuildIndexPlaceholder() {
  await logAdminAction("rebuild_index_placeholder", { at: now() });
}

export async function backupTriggerPlaceholder() {
  await logAdminAction("backup_trigger_placeholder", { at: now() });
}

export async function toggleDebugMode() {
  state.debugMode = !state.debugMode;
  await logAdminAction("toggle_debug_mode", { enabled: state.debugMode });
}

export async function panicLockdown() {
  state.maintenanceFlag.enabled = true;
  state.maintenanceFlag.message = "Emergency lockdown activated";
  state.maintenanceFlag.updated_at = now();
  syncTopKpis();
  await persistMaintenanceFlag();
  await logAdminAction("panic_lockdown", { event_id: stamp() });
}

export async function runDiagnostics() {
  await logDiagnostics("Manual diagnostics triggered by Super Admin.");
  await logAdminAction("run_diagnostics", { at: now() });
}

export async function assignOwnership(levelId, payload, actor = {}) {
  await ownershipHook.assign(levelId, payload, actor);
}

export async function reassignOwnership(levelId, payload, actor = {}) {
  await ownershipHook.assign(levelId, payload, actor);
}

export async function removeOwnership(levelId, actor = {}) {
  await ownershipHook.remove(levelId, actor);
}

export async function toggleOwnershipLock(levelId, shouldLock, actor = {}) {
  if (shouldLock) await ownershipHook.lock(levelId, actor);
  else await ownershipHook.unlock(levelId, actor);
}

export async function runWorkflowAction(recordId, action, actor = {}) {
  const map = {
    submit: "Submitted",
    review: "Under Review",
    approve: "Approved",
    reject: "Rejected",
    correction: "Needs Correction",
    draft: "Draft",
    lock: "Locked",
  };
  const next = map[action];
  if (!next) return;
  await workflowHook.updateStatus(recordId, next, actor);
}

export function generateReportCenterItem(format, reportType, filters = {}) {
  return {
    ...exportReportPlaceholder(format, reportType, filters),
    header_branding: "KMK(T) NATIONAL CHURCH PORTAL",
    metadata: buildReportMetadata(filters.generated_by || "SUPER ADMIN"),
  };
}

export async function getReportCenterRows(reportType, filters = {}, fallbackRows = []) {
  const tableMap = {
    workflow_pending: supabasePhase17Tables.workflowRecords,
    workflow_approved: supabasePhase17Tables.workflowRecords,
    workflow_rejected: supabasePhase17Tables.workflowRecords,
    compliance_incomplete: supabasePhase17Tables.complianceRows,
    audit_logs: supabasePhase17Tables.auditLogs,
  };
  const statusMap = {
    workflow_pending: "Submitted",
    workflow_approved: "Approved",
    workflow_rejected: "Rejected",
  };
  const result = await resolveReportRows({
    tableName: tableMap[reportType],
    filters: { ...filters, status: statusMap[reportType] || filters.status || "all" },
    fallbackRows,
  });
  return result;
}

export async function writeSystemAudit(entry) {
  await writeAuditLog(entry);
}

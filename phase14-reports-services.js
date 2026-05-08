import { getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const state = {
  mode: "mock",
  reports: [
    { id: 1, report_name: "Leadership Directory Q2", module: "Leadership Directory", scope: "National", format: "PDF", filter_tag: "active_only", template_name: "Leadership Default", print_layout: "Executive", approval_stage: "Approved", last_generated: "2026-04-26", generated_by: "National Admin", status: "ready" },
    { id: 2, report_name: "Vacant Positions Summary", module: "Vacant Positions Reports", scope: "Dayosisi", format: "Excel", filter_tag: "vacant", template_name: "Vacancy Matrix", print_layout: "Detailed", approval_stage: "Under Review", last_generated: "2026-04-25", generated_by: "Office Admin", status: "processing" },
  ],
  exports: [
    { id: 1, file_name: "leadership-directory-q2.pdf", module: "Leadership Directory", format: "PDF", generated_by: "National Admin", date: "2026-04-26", size: "2.4 MB" },
    { id: 2, file_name: "vacant-positions.xlsx", module: "Vacant Positions Reports", format: "Excel", generated_by: "Office Admin", date: "2026-04-25", size: "1.1 MB" },
  ],
  templates: [
    { id: 1, name: "Leadership Default", category: "Leadership", module: "Leadership Directory", filters: "status=active", print_layout: "Executive" },
    { id: 2, name: "Membership Deep Audit", category: "Membership", module: "Membership Reports", filters: "incomplete=true", print_layout: "Detailed" },
  ],
  reportCategories: ["Leadership", "Membership", "Events", "Publications", "Governance"],
  printLayouts: ["Executive", "Summary", "Detailed"],
  searchScopes: ["All Modules", "Leadership", "Membership", "Events", "Institutions", "Publications", "Documents"],
  searchPresets: [
    { id: 1, name: "Vacant Roles", keywords: "vacant role", scope: "Leadership", filters: "status=vacant" },
    { id: 2, name: "Incomplete Profiles", keywords: "incomplete profile", scope: "Membership", filters: "required_missing=true" },
  ],
  searchRows: [
    { id: 1, module: "Leadership", name: "Askofu Mkuu", dayosisi: "Mara", jimbo: "-", branch: "-", position: "Askofu Mkuu", role: "National", ministry: "-", institution: "-", publication: "-", event: "-", document: "Appointment Letter", choir: "-", department: "Executive", partner: "MWC", tags: "leadership,approved" },
    { id: 2, module: "Membership", name: "Anna Mushi", dayosisi: "Mwanza", jimbo: "Kati", branch: "Amani", position: "-", role: "Member", ministry: "Wanawake", institution: "-", publication: "-", event: "Women Conference", document: "Member Card", choir: "Kwaya ya Amani", department: "-", partner: "-", tags: "active,baptized" },
    { id: 3, module: "Publications", name: "Katiba ya KMT", dayosisi: "-", jimbo: "-", branch: "-", position: "-", role: "-", ministry: "-", institution: "HQ Library", publication: "Katiba", event: "-", document: "PDF", choir: "-", department: "Media", partner: "Local Print", tags: "policy,public" },
  ],
  roles: [
    { id: 1, role_name: "Super Admin", role_key: "super_admin", module_permissions: "all", field_permissions: "all", document_permissions: "all", visibility: "Super Admin Only" },
    { id: 2, role_name: "National Admin", role_key: "national_admin", module_permissions: "national", field_permissions: "manage", document_permissions: "manage", visibility: "Internal" },
    { id: 3, role_name: "Office Admin", role_key: "office_admin", module_permissions: "office", field_permissions: "manage", document_permissions: "manage", visibility: "Internal" },
    { id: 4, role_name: "Dayosisi Admin", role_key: "dayosisi_admin", module_permissions: "dayosisi", field_permissions: "edit", document_permissions: "edit", visibility: "Restricted" },
    { id: 5, role_name: "Jimbo Admin", role_key: "jimbo_admin", module_permissions: "jimbo", field_permissions: "edit", document_permissions: "view", visibility: "Restricted" },
    { id: 6, role_name: "Branch Admin", role_key: "branch_admin", module_permissions: "branch", field_permissions: "limited", document_permissions: "view", visibility: "Restricted" },
    { id: 7, role_name: "Executive Viewer", role_key: "executive_viewer", module_permissions: "executive_read", field_permissions: "view", document_permissions: "view", visibility: "Internal" },
    { id: 8, role_name: "Public Viewer", role_key: "public_viewer", module_permissions: "public", field_permissions: "public_only", document_permissions: "public_only", visibility: "Public" },
  ],
  permissionGroups: [
    { id: 1, group_name: "Leadership Management", module_scope: "Leadership", field_level: "edit", document_level: "view", visibility: "Restricted" },
    { id: 2, group_name: "Publications Review", module_scope: "Publications", field_level: "view", document_level: "approve", visibility: "Internal" },
  ],
  workflowTypes: [
    { id: 1, workflow_name: "Publication Workflow", module: "Publication Reports", current_stage: "Under Review", approver_role: "Office Admin" },
    { id: 2, workflow_name: "Leadership Approval", module: "Leadership Directory", current_stage: "Approved", approver_role: "National Admin" },
  ],
  approvalStages: ["Draft", "Submitted", "Under Review", "Approved", "Published", "Archived", "Rejected", "Needs Update"],
  approverRoles: ["Super Admin", "National Admin", "Office Admin", "Dayosisi Admin", "Executive Viewer"],
  auditLogs: [
    { id: 1, actor: "national_admin", action: "create", target: "Leadership Directory Q2", module: "Reports", at: "2026-04-26 20:15", detail: "Generated PDF report" },
    { id: 2, actor: "office_admin", action: "permission_change", target: "Publications Review Group", module: "RBAC", at: "2026-04-26 19:48", detail: "Changed document-level permission to approve" },
  ],
  notifications: [
    { id: 1, type: "Success", title: "Report Completed", message: "Leadership Directory report imekamilika.", status: "new", at: "2026-04-26 20:22" },
    { id: 2, type: "Pending Approval", title: "Waiting Review", message: "Vacant Positions report inasubiri approval.", status: "new", at: "2026-04-26 20:10" },
    { id: 3, type: "Expiring Term", title: "Term Alert", message: "Viongozi 4 term zao zinaisha ndani ya siku 30.", status: "read", at: "2026-04-26 18:43" },
  ],
  insights: [
    { id: 1, title: "Incomplete data hotspot", detail: "Membership profiles 12% zina fields zilizokosekana." },
    { id: 2, title: "Vacant role trend", detail: "Vacant positions zimepungua 8% mwezi huu." },
    { id: 3, title: "Approval bottleneck", detail: "Average Under Review time ni siku 3.1." },
  ],
  metrics: { reportsGenerated: 178, savedTemplates: 24, searchQueries: 932, approvalQueue: 17, auditEvents: 551, unreadNotifications: 9, rbacRoles: 8, systemHealth: "Healthy" },
};

const useSupabase = () => !!getSafeSupabase();
export const getMode = () => state.mode;

export async function loadReportsData() {
  if (!useSupabase()) { state.mode = "mock"; return; }
  state.mode = "supabase";
  const s = getSafeSupabase();
  if (!s) { state.mode = "mock"; return; }
  const result = await safeAsync(
    "phase14_load_reports_data",
    async () =>
      Promise.all([
        s.from("reports_registry").select("*").order("id", { ascending: false }),
        s.from("report_exports").select("*").order("id", { ascending: false }),
        s.from("dashboard_metrics").select("*").order("id", { ascending: false }).limit(1),
        s.from("smart_insights").select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) { state.mode = "mock"; return; }
  const [registry, exports, metrics, insights] = result;
  if (!registry.error) state.reports = registry.data || [];
  if (!exports.error) state.exports = exports.data || [];
  if (!insights.error) state.insights = insights.data || [];
  if (!metrics.error && metrics.data?.length) state.metrics = metrics.data[0];
}

const arr = (k) => [...state[k]];
async function save(k, payload, id = null) {
  if (!useSupabase()) {
    if (id) state[k] = state[k].map((x) => (x.id === id ? { ...x, ...payload } : x));
    else state[k].unshift({ id: Date.now(), ...payload });
    return;
  }
  const table = k === "reports" ? "reports_registry" : k === "exports" ? "report_exports" : k === "insights" ? "smart_insights" : "dashboard_metrics";
  const s = getSafeSupabase();
  if (!s) return;
  const q = id ? s.from(table).update(payload).eq("id", id) : s.from(table).insert(payload);
  const { error } = await q; if (error) throw error; await loadReportsData();
}
async function remove(k, id) {
  if (!useSupabase()) { state[k] = state[k].filter((x) => x.id !== id); return; }
  const table = k === "reports" ? "reports_registry" : "report_exports";
  const s = getSafeSupabase();
  if (!s) return;
  const { error } = await s.from(table).delete().eq("id", id); if (error) throw error; await loadReportsData();
}
async function clear(k) {
  if (!useSupabase()) { state[k] = []; return; }
  const table = k === "reports" ? "reports_registry" : "report_exports";
  const s = getSafeSupabase();
  if (!s) return;
  const { error } = await s.from(table).delete().neq("id", -1); if (error) throw error; await loadReportsData();
}

export const getReports = () => arr("reports");
export const getExports = () => arr("exports");
export const getTemplates = () => arr("templates");
export const getReportCategories = () => [...state.reportCategories];
export const getPrintLayouts = () => [...state.printLayouts];
export const getSearchScopes = () => [...state.searchScopes];
export const getSearchPresets = () => arr("searchPresets");
export const getSearchRows = () => arr("searchRows");
export const getRoles = () => arr("roles");
export const getPermissionGroups = () => arr("permissionGroups");
export const getWorkflowTypes = () => arr("workflowTypes");
export const getApprovalStages = () => [...state.approvalStages];
export const getApproverRoles = () => [...state.approverRoles];
export const getAuditLogs = () => arr("auditLogs");
export const getNotifications = () => arr("notifications");
export const getInsights = () => arr("insights");
export const getMetrics = () => ({ ...state.metrics });
export const saveReport = (p, id) => save("reports", p, id);
export const saveExport = (p, id) => save("exports", p, id);
export const saveTemplate = (p, id) => save("templates", p, id);
export const saveSearchPreset = (p, id) => save("searchPresets", p, id);
export const saveRole = (p, id) => save("roles", p, id);
export const savePermissionGroup = (p, id) => save("permissionGroups", p, id);
export const saveWorkflowType = (p, id) => save("workflowTypes", p, id);
export const saveAuditLog = (p, id) => save("auditLogs", p, id);
export const saveNotification = (p, id) => save("notifications", p, id);
export const deleteReport = (id) => remove("reports", id);
export const deleteExport = (id) => remove("exports", id);
export const clearReports = () => clear("reports");
export const clearExports = () => clear("exports");

export function addReportCategory(name) {
  if (!name) return;
  if (!state.reportCategories.includes(name)) state.reportCategories.unshift(name);
}
export function addPrintLayout(name) {
  if (!name) return;
  if (!state.printLayouts.includes(name)) state.printLayouts.unshift(name);
}
export function addSearchScope(name) {
  if (!name) return;
  if (!state.searchScopes.includes(name)) state.searchScopes.unshift(name);
}
export function addApprovalStage(name) {
  if (!name) return;
  if (!state.approvalStages.includes(name)) state.approvalStages.push(name);
}
export function addApproverRole(name) {
  if (!name) return;
  if (!state.approverRoles.includes(name)) state.approverRoles.push(name);
}
export function queryGlobalSearch({ q = "", scope = "", groupBy = "module" } = {}) {
  const text = String(q || "").toLowerCase().trim();
  const scopeLower = String(scope || "").toLowerCase();
  const rows = state.searchRows.filter((row) => {
    const scoped = !scope || scope === "All Modules" || String(row.module || "").toLowerCase().includes(scopeLower);
    if (!scoped) return false;
    if (!text) return true;
    const hay = [
      row.name, row.dayosisi, row.jimbo, row.branch, row.position, row.role,
      row.ministry, row.institution, row.publication, row.event, row.document,
      row.choir, row.department, row.partner, row.tags,
    ].join(" ").toLowerCase();
    return hay.includes(text);
  });
  const grouped = {};
  rows.forEach((row) => {
    const key = row[groupBy] || "Other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });
  return { rows, grouped };
}

export async function logReportActivity(role, action, description, payload = {}) {
  const entry = {
    actor: role,
    action,
    target: payload.report_name || payload.name || payload.id || "system",
    module: payload.module || "Portal",
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    detail: description,
  };
  state.auditLogs.unshift({ id: Date.now(), ...entry });
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync("phase14_log_report_activity", async () => s.from("report_logs").insert({ actor_role: role, action, description, payload }), null);
}

import { systemRoleAccess, reportFields } from "./phase14-reports-hooks.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";
import {
  loadReportsData, getMode, getReports, getExports, getInsights, getMetrics,
  getSearchScopes, getRoles, getPermissionGroups, getWorkflowTypes, getAuditLogs, getNotifications,
  saveReport, saveExport, saveSearchPreset, saveRole, savePermissionGroup, saveWorkflowType, saveNotification,
  deleteReport, deleteExport, clearReports, clearExports, addReportCategory, addPrintLayout,
  addSearchScope, addApprovalStage, addApproverRole, queryGlobalSearch, logReportActivity,
} from "./phase14-reports-services.js";

const el = (id) => document.getElementById(id);
let role = localStorage.getItem("mock_role") || "national_admin";
let formMeta = { id: null };
let deleteMeta = { type: "", id: null };
let confirmMeta = { fn: null };
let loading = false;
const can = (k) => !!(systemRoleAccess[role] || systemRoleAccess.public_viewer)[k];
const toast = (m) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; el("toastWrap").appendChild(d); setTimeout(() => d.remove(), 2500); };
const badge = (v) => `<span class="status ${resolveFinalStatusColor(v)}">${v || "-"}</span>`;
const csv = (rows) => { if (!rows.length) return ""; const k = Object.keys(rows[0]); return [k.join(","), ...rows.map((r) => k.map((x) => `"${String(r[x] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n"); };
const download = (n, rows) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv" })); a.download = `${n}.csv`; a.click(); URL.revokeObjectURL(a.href); };
const spark = (pts) => {
  const max = Math.max(...pts, 1);
  const step = 90 / (pts.length - 1 || 1);
  const p = pts.map((x, i) => `${i * step},${30 - (x / max) * 24}`).join(" ");
  return `<svg class="trend" viewBox="0 0 90 30"><polyline points="${p}" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="2"/></svg>`;
};

function renderKpis() {
  const m = getMetrics();
  const data = [
    ["k1", "Reports Generated", m.reportsGenerated || 0, "📊", [18, 21, 24, 27, 31, 34]],
    ["k2", "Saved Templates", m.savedTemplates || 0, "🧩", [10, 12, 15, 18, 21, 24]],
    ["k3", "Global Searches", m.searchQueries || 0, "🔎", [620, 700, 745, 801, 866, 932]],
    ["k4", "Approval Queue", m.approvalQueue || 0, "⏳", [31, 29, 26, 23, 20, 17]],
    ["k5", "Audit Events", m.auditEvents || 0, "🛡️", [420, 447, 468, 499, 530, 551]],
    ["k6", "Unread Notifications", m.unreadNotifications || 0, "🔔", [15, 14, 13, 12, 10, 9]],
    ["k7", "RBAC Roles", m.rbacRoles || 0, "👥", [6, 6, 7, 7, 8, 8]],
    ["k8", "Overall System Health", m.systemHealth || "-", "🛡️", [80, 82, 84, 86, 88, 90]],
  ];
  el("kpiGrid").innerHTML = data.map(([k, l, v, i, t]) => `<article class="kpi ${k}"><div class="icon">${i}</div><p>${l}</p><h3>${v}</h3>${spark(t)}</article>`).join("");
}

function renderFilters() {
  const options = (label, key, items) => `<label>${label}<select data-filter="${key}"><option value="">All</option>${items.map((x) => `<option>${x}</option>`).join("")}</select></label>`;
  el("filtersBar").innerHTML =
    `${options("By Dayosisi","dayosisi",["Mara","Mwanza","Dodoma","Kigoma"])}${options("By Jimbo","jimbo",["Kati","Ziwa","Mashariki","Magharibi"])}${options("By Branch","branch",["Amani","Neema","Tumaini"])}${options("By Module","module",["Leadership","Membership","Events","Publications","Institution"])}<label>From<input type="date" data-filter="from" /></label><label>To<input type="date" data-filter="to" /></label>${options("By Workflow","stage",["Draft","Submitted","Under Review","Approved","Published"])}${options("By Visibility","visibility",["Public","Internal","Restricted","Super Admin Only"])}`;
}

function reportActions(id) {
  return `<button class="btn tiny" data-type="report" data-a="view" data-id="${id}">View</button><button class="btn tiny" data-type="report" data-a="pdf" data-id="${id}">PDF</button><button class="btn tiny" data-type="report" data-a="excel" data-id="${id}">Excel</button><button class="btn tiny" data-type="report" data-a="schedule" data-id="${id}" ${can("schedule") ? "" : "disabled"}>Schedule</button><button class="btn tiny" data-type="report" data-a="export" data-id="${id}" ${can("export") ? "" : "disabled"}>Export</button><button class="btn tiny danger" data-type="report" data-a="delete" data-id="${id}" ${can("delete") ? "" : "disabled"}>Delete</button>`;
}
function exportActions(id) {
  return `<button class="btn tiny" data-type="export" data-a="download" data-id="${id}">Download</button><button class="btn tiny" data-type="export" data-a="regen" data-id="${id}">Re-generate</button><button class="btn tiny" data-type="export" data-a="again" data-id="${id}">Export Again</button><button class="btn tiny danger" data-type="export" data-a="delete" data-id="${id}" ${can("delete") ? "" : "disabled"}>Delete</button>`;
}

function renderTables() {
  el("reportsBody").innerHTML = getReports().map((r) => `<tr><td>${r.report_name}</td><td>${r.module}</td><td>${r.scope}</td><td>${r.format}</td><td>${r.last_generated}</td><td>${r.generated_by || "-"}</td><td>${badge(r.status)}</td><td>${reportActions(r.id)}</td></tr>`).join("") || `<tr><td colspan="8">No reports</td></tr>`;
  el("exportsBody").innerHTML = getExports().map((r) => `<tr><td>${r.file_name}</td><td>${r.module}</td><td>${r.format}</td><td>${r.generated_by}</td><td>${r.date}</td><td>${r.size}</td><td>${exportActions(r.id)}</td></tr>`).join("") || `<tr><td colspan="7">No exports</td></tr>`;
  el("rbacBody").innerHTML = getRoles().map((r) => `<tr><td>${r.role_name}</td><td>${r.module_permissions}</td><td>${r.field_permissions}</td><td>${r.document_permissions}</td><td>${r.visibility}</td></tr>`).join("");
  el("permissionGroupsBody").innerHTML = getPermissionGroups().map((g) => `<tr><td>${g.group_name}</td><td>${g.module_scope}</td><td>${g.field_level}</td><td>${g.document_level}</td><td>${g.visibility}</td></tr>`).join("");
  el("workflowBody").innerHTML = getWorkflowTypes().map((w) => `<tr><td>${w.workflow_name}</td><td>${w.module}</td><td>${w.current_stage}</td><td>${w.approver_role}</td></tr>`).join("");
  el("auditBody").innerHTML = getAuditLogs().map((l) => `<tr><td>${l.actor}</td><td>${l.action}</td><td>${l.target}</td><td>${l.module}</td><td>${l.at}</td><td>${l.detail}</td></tr>`).join("");
  el("notificationBody").innerHTML = getNotifications().map((n) => `<tr><td>${n.type}</td><td>${n.title}</td><td>${n.message}</td><td>${badge(n.status)}</td><td>${n.at}</td></tr>`).join("");
}

function renderInsights() {
  el("insightGrid").innerHTML = getInsights().map((i) => `<article class="insight-card"><h4>${i.title}</h4><p>${i.detail || i.body || "-"}</p></article>`).join("");
}

function renderSearchScopes() {
  const target = el("searchScope");
  if (!target) return;
  target.innerHTML = getSearchScopes().map((s) => `<option value="${s}">${s}</option>`).join("");
}

function renderSearchResults() {
  const q = el("globalSearchInput")?.value || "";
  const scope = el("searchScope")?.value || "All Modules";
  const groupBy = el("groupBy")?.value || "module";
  const { grouped } = queryGlobalSearch({ q, scope, groupBy });
  const blocks = Object.entries(grouped).map(([key, rows]) => `
    <article class="insight-card">
      <h4>${key} (${rows.length})</h4>
      <p>${rows.slice(0, 4).map((r) => `${r.name} • ${r.tags}`).join(" | ")}</p>
    </article>
  `);
  el("searchResults").innerHTML = blocks.join("") || `<p class="empty-note">Hakuna matokeo yaliyopatikana kwa vichujio ulivyochagua.</p>`;
}

function setLoading(next) {
  loading = next;
  const kpi = el("kpiGrid");
  if (!kpi) return;
  if (loading) kpi.classList.add("loading-skeleton");
  else kpi.classList.remove("loading-skeleton");
}

function openForm(row = null) {
  formMeta = { id: row?.id || null };
  el("formTitle").textContent = `${row ? "Edit" : "Generate"} Report`;
  el("formBody").innerHTML = reportFields.map((f) => {
    const v = row?.[f.key] ?? "";
    if (f.options) return `<label>${f.label}<select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    return `<label>${f.label}<input type="${f.type || "text"}" name="${f.key}" value="${v}" /></label>`;
  }).join("");
  el("formModal").classList.add("open");
}
function closeForm() { el("formModal").classList.remove("open"); formMeta = { id: null }; }
function openConfirm({ title = "Confirm", message = "Una uhakika?", dangerLabel = "Continue", onConfirm = null } = {}) {
  confirmMeta = { fn: onConfirm };
  el("confirmTitle").textContent = title;
  el("confirmMessage").textContent = message;
  el("confirmDeleteBtn").textContent = dangerLabel;
  el("confirmModal").classList.add("open");
}
function askDelete(type, id) {
  deleteMeta = { type, id };
  openConfirm({
    title: `Delete ${type}`,
    message: "Hatua hii inaweza kuathiri records za mfumo. Endelea?",
    dangerLabel: "Delete",
    onConfirm: doDelete,
  });
}
function closeDelete() {
  deleteMeta = { type: "", id: null };
  confirmMeta = { fn: null };
  el("confirmDeleteBtn").textContent = "Delete";
  el("confirmModal").classList.remove("open");
}

async function saveForm() {
  const payload = Object.fromEntries(new FormData(el("formBody")).entries());
  try {
    await saveReport(payload, formMeta.id);
    await saveExport({ file_name: `${payload.report_name || "report"}.${(payload.format || "pdf").toLowerCase()}`, module: payload.module, format: payload.format, generated_by: role, date: payload.last_generated, size: "1.8 MB" });
    await logReportActivity(role, formMeta.id ? "edit" : "generate", "Report generated", payload);
    closeForm(); refresh(); toast("Report generated.");
  } catch (e) { toast(e.message || "Save failed"); }
}

async function doDelete() {
  try {
    if (deleteMeta.type === "report") await deleteReport(deleteMeta.id);
    if (deleteMeta.type === "export") await deleteExport(deleteMeta.id);
    await logReportActivity(role, "delete", `Deleted ${deleteMeta.type}`, { id: deleteMeta.id });
    refresh(); toast("Deleted.");
  } catch (e) { toast(e.message || "Delete failed"); }
}

async function handleReportAction(a, id) {
  const row = getReports().find((x) => x.id === id); if (!row) return;
  if (a === "view") toast(`Viewing ${row.report_name}`);
  if (a === "pdf") toast("PDF download started.");
  if (a === "excel") toast("Excel download started.");
  if (a === "export") toast("Report exported.");
  if (a === "schedule" && can("schedule")) {
    await saveReport({ ...row, status: "processing" }, id);
    toast("Report scheduled.");
  }
  if (a === "delete" && can("delete")) askDelete("report", id);
}
async function handleExportAction(a, id) {
  const row = getExports().find((x) => x.id === id); if (!row) return;
  if (a === "download") toast(`Downloading ${row.file_name}`);
  if (a === "regen" || a === "again") {
    await saveExport({ ...row, date: new Date().toISOString().slice(0, 10) }, id);
    toast("Export regenerated.");
  }
  if (a === "delete" && can("delete")) askDelete("export", id);
}

function bind() {
  document.body.addEventListener("click", async (e) => {
    const a = e.target.dataset.action; if (!a) return;
    if (a === "generate" && can("generate")) openForm();
    if (a === "clearReports" && can("delete")) {
      openConfirm({
        title: "Clear Reports",
        message: "Utaondoa ripoti zote zilizopo. Unathibitisha?",
        dangerLabel: "Clear",
        onConfirm: async () => { await clearReports(); refresh(); toast("Reports zime-clear."); },
      });
    }
    if (a === "exportReports" && can("export")) download("reports-registry", getReports());
    if (a === "printReports") window.print();
    if (a === "clearExports" && can("delete")) {
      openConfirm({
        title: "Clear Exports",
        message: "Utaondoa export history yote. Endelea?",
        dangerLabel: "Clear",
        onConfirm: async () => { await clearExports(); refresh(); toast("Exports zime-clear."); },
      });
    }
    if (a === "exportAgain" && can("export")) download("export-center", getExports());
    if (a === "runSearch") renderSearchResults();
    if (a === "addReportCategory") { const name = prompt("Ingiza report category mpya"); addReportCategory(name || ""); toast("Report category added."); refresh(); }
    if (a === "addReportTemplate") { const name = prompt("Ingiza template name"); if (name) { await saveSearchPreset({ name, keywords: "", scope: "All Modules", filters: "custom" }); toast("Report template saved."); } refresh(); }
    if (a === "addPrintLayout") { const name = prompt("Ingiza print layout type"); addPrintLayout(name || ""); toast("Print layout imeongezwa."); }
    if (a === "addSearchScope") { const name = prompt("Ingiza search scope mpya"); addSearchScope(name || ""); refresh(); toast("Search scope added."); }
    if (a === "saveFilterSet") { const query = el("globalSearchInput")?.value || ""; await saveSearchPreset({ name: `Preset-${Date.now()}`, keywords: query, scope: el("searchScope")?.value || "All Modules", filters: "manual" }); toast("Filter set saved."); }
    if (a === "filterPreset") { toast("Filter presets loaded."); }
    if (a === "addCustomRole") { const name = prompt("Role name mpya"); if (name) { await saveRole({ role_name: name, role_key: name.toLowerCase().replaceAll(" ", "_"), module_permissions: "custom", field_permissions: "custom", document_permissions: "custom", visibility: "Restricted" }); await logReportActivity(role, "role_create", "Custom role created", { name, module: "RBAC" }); refresh(); } }
    if (a === "addPermissionGroup") { const name = prompt("Permission group name"); if (name) { await savePermissionGroup({ group_name: name, module_scope: "Custom", field_level: "custom", document_level: "custom", visibility: "Restricted" }); await logReportActivity(role, "permission_group_create", "Permission group added", { name, module: "RBAC" }); refresh(); } }
    if (a === "addWorkflowType") { const name = prompt("Workflow type name"); if (name) { await saveWorkflowType({ workflow_name: name, module: "Custom", current_stage: "Draft", approver_role: "Office Admin" }); await logReportActivity(role, "workflow_create", "Workflow type added", { name, module: "Workflow" }); refresh(); } }
    if (a === "addApprovalStage") { const name = prompt("Approval stage mpya"); addApprovalStage(name || ""); toast("Approval stage added."); }
    if (a === "addApproverRole") { const name = prompt("Approver role mpya"); addApproverRole(name || ""); toast("Approver role imeongezwa."); }
    if (a === "addNotification") { await saveNotification({ type: "Reminder", title: "Manual Notification", message: "Taarifa mpya imeongezwa.", status: "new", at: new Date().toISOString().slice(0, 16).replace("T", " ") }); await logReportActivity(role, "notify_create", "Manual notification created", { module: "Notifications" }); refresh(); }
    if (a === "addCategory" || a === "addType" || a === "addCustomField") { toast(`${a} function iko tayari kwa eneo hili.`); }
  });
  document.body.addEventListener("click", (e) => {
    const type = e.target.dataset.type; const a = e.target.dataset.a; const id = Number(e.target.dataset.id); if (!type || !a) return;
    if (type === "report") handleReportAction(a, id);
    if (type === "export") handleExportAction(a, id);
  });
  el("cancelFormBtn").addEventListener("click", closeForm);
  el("saveFormBtn").addEventListener("click", saveForm);
  el("cancelDeleteBtn").addEventListener("click", closeDelete);
  el("confirmDeleteBtn").addEventListener("click", async () => {
    if (typeof confirmMeta.fn === "function") await confirmMeta.fn();
    closeDelete();
  });
  el("globalSearchInput")?.addEventListener("input", renderSearchResults);
  el("searchScope")?.addEventListener("change", renderSearchResults);
  el("groupBy")?.addEventListener("change", renderSearchResults);
}

function refresh() {
  const modeLabel = getMode() === "supabase" ? "Supabase" : "Mock";
  el("modeBadge").textContent = `Data: ${modeLabel} • Role: ${role}`;
  el("envTag").textContent = modeLabel === "Supabase" ? "Live Supabase" : "Mock Mode";
  el("lastUpdated").textContent = new Date().toLocaleString("sw-TZ");
  renderKpis();
  renderFilters();
  renderSearchScopes();
  renderTables();
  renderInsights();
  renderSearchResults();
}

async function init() {
  installGlobalCrashGuards("phase14_reports");
  try {
    setLoading(true);
    await loadReportsData();
    refresh();
    bind();
  } catch (error) {
    console.error(error);
    const banner = el("appErrorBanner");
    if (banner) banner.classList.remove("hidden");
    toast("System error imejitokeza. Tafadhali jaribu tena.");
  } finally {
    setLoading(false);
  }
}
init();

window.addEventListener("error", () => {
  const banner = el("appErrorBanner");
  if (banner) banner.classList.remove("hidden");
});

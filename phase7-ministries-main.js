import { ministryCards, ministryColumns, ministryFieldConfig, ministryRoleAccess, moduleCategories } from "./phase7-ministries-hooks.js";
import {
  loadAllMinistryData, getMode, getMinistries, getMinistryMembers, getMinistryLeaders, getMinistryActivities, getMinistryContributions,
  saveMinistry, deleteMinistry, clearMinistries,
  saveMinistryMember, deleteMinistryMember, clearMinistryMembers,
  saveMinistryLeader, deleteMinistryLeader, clearMinistryLeaders,
  saveMinistryActivity, deleteMinistryActivity, clearMinistryActivities,
  saveMinistryContribution, deleteMinistryContribution, clearMinistryContributions,
  getMinistryFilterOptions, logMinistryActivity, getHierarchySeed,
} from "./phase7-ministries-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";

let page = 1;
const pageSize = 8;
let filters = { search: "", type: "", dayosisi: "", jimbo: "", tawi: "", status: "", leader: "" };
let currentRole = "admin";
const currentScope = {
  dayosisi: localStorage.getItem("mock_dayosisi") || "",
  tawi: localStorage.getItem("mock_tawi") || "",
  ministry: localStorage.getItem("mock_ministry") || "",
};
let editId = null;
let deleteScope = "";
let deleteId = null;
let entryType = "";
let entryEditId = null;
let isLoading = false;
let selectedProfileId = null;
let activeModuleTab = "all";

const el = (id) => document.getElementById(id);
const can = (action) => !!(ministryRoleAccess[currentRole] || ministryRoleAccess.member)[action];
const statusBadge = (v) => `<span class="status ${String(v || "").toLowerCase()}">${v || "-"}</span>`;
const toast = (m) => { const w = el("toastWrap"); const d = document.createElement("div"); d.className = "toast"; d.textContent = m; w.appendChild(d); setTimeout(() => d.remove(), 2600); };
const toCsv = (rows) => { if (!rows.length) return ""; const keys = Object.keys(rows[0]); return [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n"); };
const downloadCsv = (name, rows) => { const csv = toCsv(rows); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(a.href); };
const setLoading = (v, text = "Inapakia taarifa za ministries...") => { isLoading = v; const b = el("loadingBar"); if (!b) return; b.textContent = text; b.classList.toggle("show", v); };

function inScope(record) {
  if (currentRole === "chief_admin" || currentRole === "super_admin" || currentRole === "admin") return true;
  if (currentRole === "askofu_dayosisi") return !currentScope.dayosisi || record.dayosisi === currentScope.dayosisi;
  if (currentRole === "mchungaji") return !currentScope.tawi || record.branch === currentScope.tawi;
  if (currentRole === "kiongozi_idara") return !currentScope.ministry || record.name === currentScope.ministry || record.module === currentScope.ministry;
  if (currentRole === "member") return record.status === "active";
  return false;
}

const matches = (r) => (!filters.search || `${r.name || ""} ${r.module || ""} ${r.leader || ""}`.toLowerCase().includes(filters.search.toLowerCase()))
  && (activeModuleTab === "all" || r.module === activeModuleTab)
  && (!filters.type || r.module === filters.type)
  && (!filters.dayosisi || r.dayosisi === filters.dayosisi)
  && (!filters.jimbo || r.jimbo === filters.jimbo)
  && (!filters.tawi || r.branch === filters.tawi)
  && (!filters.status || r.status === filters.status)
  && (!filters.leader || (r.leader || r.name) === filters.leader);

function renderModuleTabs() {
  const tabs = ["all", ...ministryCards, "MWC Global Relations"];
  el("moduleTabs").innerHTML = tabs
    .map((t) => `<button class="module-tab ${activeModuleTab === t ? "active" : ""}" data-module-tab="${t}">${t === "all" ? "All Modules" : t}</button>`)
    .join("");
}

function renderKpis() {
  const m = getMinistries().filter(inScope);
  const leaders = m;
  const reportsPending = getMinistryActivities().filter((a) => inScope(a) && a.status === "pending").length;
  el("kpiGrid").innerHTML = [
    ["Jumla ya Modules", m.length],
    ["Jumla ya Members", m.reduce((n, x) => n + Number(x.members || x.students || 0), 0)],
    ["Active", m.filter((x) => x.status === "active").length],
    ["Archived", m.filter((x) => x.status === "archived").length],
    ["Inactive", m.filter((x) => x.status === "inactive").length],
    ["Org Links", getMinistryLeaders().filter(inScope).length + getMinistryMembers().filter(inScope).length],
    ["Reports Pending", reportsPending],
  ].map(([k, v]) => `<article class="kpi"><p>${k}</p><h3>${v}</h3></article>`).join("");
}

function renderMinistryCards() {
  const ministries = getMinistries().filter(inScope);
  el("ministryCards").innerHTML = ministryCards.map((name) => {
    const row = ministries.find((r) => r.module === name);
    return `<article class="mini-card"><h4>${name}</h4><p><b>Name:</b> ${row?.name || "TBA"}</p><p><b>Leader:</b> ${row?.leader || row?.teacher || row?.director || "-"}</p><p><b>Scope:</b> ${row?.scope || "-"}</p><div>${statusBadge(row?.status || "inactive")}</div><button class="btn" data-view="${row?.id || ""}">View</button></article>`;
  }).join("");
}

function renderFilters() {
  const f = getMinistryFilterOptions();
  const s = (id, label, items) => `<label>${label}<select data-filter="${id}"><option value="">All</option>${items.map((x) => `<option ${filters[id] === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>`;
  el("filtersBar").innerHTML = `<label>Search module<input data-filter="search" placeholder="Search module" value="${filters.search}" /></label>${s("type", "Filter by module", f.type)}${s("dayosisi", "Filter by Dayosisi", f.dayosisi)}${s("jimbo", "Filter by Jimbo", f.jimbo)}${s("tawi", "Filter by Branch", f.tawi)}${s("status", "Filter by status", f.status)}${s("leader", "Filter by leader", f.leader)}`;
}

function renderMinistriesTable() {
  const labels = { id: "ID", name: "Name", short_code: "Short Code", module: "Module", scope: "Scope", leader: "Leader/Teacher/Director", dayosisi: "Dayosisi", jimbo: "Jimbo", branch: "Branch", members: "Members/Students", status: "Status" };
  el("ministriesHead").innerHTML = ministryColumns.map((c) => `<th>${c === "actions" ? "Actions" : labels[c] || c}</th>`).join("");
  const rows = getMinistries().filter((r) => inScope(r) && matches(r));
  const max = Math.max(1, Math.ceil(rows.length / pageSize));
  if (page > max) page = max;
  const items = rows.slice((page - 1) * pageSize, page * pageSize);
  el("ministriesBody").innerHTML = items.length ? items.map((r) => `<tr><td>${r.id}</td><td>${r.name || "-"}</td><td>${r.short_code || "-"}</td><td>${r.module}</td><td>${r.scope || "-"}</td><td>${r.leader || r.teacher || r.director || "-"}</td><td>${r.dayosisi || "-"}</td><td>${r.jimbo || "-"}</td><td>${r.branch || "-"}</td><td>${r.members || r.students || "-"}</td><td>${statusBadge(r.status)}</td><td><button class="btn tiny" data-act="view" data-id="${r.id}">View</button><button class="btn tiny" data-act="edit" data-id="${r.id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny danger" data-act="delete" data-id="${r.id}" ${can("delete") ? "" : "disabled"}>Delete</button><button class="btn tiny" data-act="print" data-id="${r.id}">Print</button><button class="btn tiny" data-act="excel" data-id="${r.id}">Export</button></td></tr>`).join("") : `<tr><td colspan="12" class="empty">No modules found.</td></tr>`;
  el("ministriesCardsMobile").innerHTML = items.map((r) => `<article class="m-card"><h4>${r.name || "-"}</h4><p>${r.module} • ${r.scope || "-"}</p><p>${r.dayosisi || "-"} / ${r.jimbo || "-"} / ${r.branch || "-"}</p><div class="actions"><button class="btn tiny" data-act="view" data-id="${r.id}">View</button><button class="btn tiny" data-act="edit" data-id="${r.id}" ${can("edit") ? "" : "disabled"}>Edit</button></div></article>`).join("");
  el("pageInfo").textContent = `Page ${page} / ${max} • Total ${rows.length}`;
}

function rowActionButtons(scope, id) {
  return `<button class="btn tiny" data-scope="${scope}" data-a="view" data-id="${id}">View</button><button class="btn tiny" data-scope="${scope}" data-a="edit" data-id="${id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny" data-scope="${scope}" data-a="delete" data-id="${id}" ${can("delete") ? "" : "disabled"}>Delete</button>`;
}

function renderMinis() {
  el("membersBody").innerHTML = getMinistryMembers().filter(inScope).map((r) => `<tr><td>${r.id}</td><td>${r.jina}</td><td>${r.idara}</td><td>${r.role}</td><td>${r.tawi}</td><td>${r.simu || "-"}</td><td>${r.kujiunga || "-"}</td><td>${statusBadge(r.status)}</td><td>${rowActionButtons("member", r.id)}</td></tr>`).join("") || `<tr><td colspan="9" class="empty">No member rows.</td></tr>`;
  el("leadersBody").innerHTML = getMinistryLeaders().filter(inScope).map((r) => `<tr><td>${r.kiongozi}</td><td>${r.idara}</td><td>${r.cheo}</td><td>${r.dayosisi}</td><td>${r.jimbo}</td><td>${r.tawi}</td><td>${r.simu || "-"}</td><td>${r.email || "-"}</td><td>${statusBadge(r.status)}</td><td>${rowActionButtons("leader", r.id)}</td></tr>`).join("") || `<tr><td colspan="10" class="empty">No leader rows.</td></tr>`;
  el("activitiesBody").innerHTML = getMinistryActivities().filter(inScope).map((r) => `<tr><td>${r.jina}</td><td>${r.idara}</td><td>${r.tarehe}</td><td>${r.mahali}</td><td>${r.msimamizi}</td><td>${r.washiriki || 0}</td><td>${statusBadge(r.status)}</td><td>${rowActionButtons("activity", r.id)}</td></tr>`).join("") || `<tr><td colspan="8" class="empty">No activities.</td></tr>`;
  el("contributionsBody").innerHTML = getMinistryContributions().filter(inScope).map((r) => `<tr><td>${r.idara}</td><td>${r.aina}</td><td>${r.kiasi}</td><td>${r.mlipaji}</td><td>${r.tarehe}</td><td>${r.method}</td><td>${statusBadge(r.status)}</td><td>${rowActionButtons("contribution", r.id)}</td></tr>`).join("") || `<tr><td colspan="8" class="empty">No contributions.</td></tr>`;
}

function renderMinistryForm(record = null) {
  editId = record?.id || null;
  el("ministryModalTitle").textContent = editId ? "Edit Module" : "Add Module";
  el("ministryForm").innerHTML = ministryFieldConfig.map((f) => {
    const v = record?.[f.key] ?? "";
    if (f.key === "category") {
      const selectedModule = record?.module || "Jumuiya";
      const opts = moduleCategories[selectedModule] || [];
      return `<label>${f.label}<select name="${f.key}">${opts.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    }
    if (f.options) return `<label>${f.label}<select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    if (f.textarea) return `<label class="full">${f.label}<textarea name="${f.key}" placeholder="${f.label}">${v}</textarea></label>`;
    return `<label>${f.label}<input name="${f.key}" type="${f.type || "text"}" placeholder="${f.label}" value="${v}" /></label>`;
  }).join("");
  const h = getHierarchySeed();
  const moduleSel = el("ministryForm").querySelector("[name='module']");
  const catSel = el("ministryForm").querySelector("[name='category']");
  const dSel = el("ministryForm").querySelector("[name='dayosisi']");
  const jSel = el("ministryForm").querySelector("[name='jimbo']");
  const tSel = el("ministryForm").querySelector("[name='branch']");
  if (!dSel || !jSel || !tSel) return;
  dSel.innerHTML = `<option value="">Chagua Dayosisi</option>${h.dayosisi.map((d) => `<option ${record?.dayosisi === d ? "selected" : ""}>${d}</option>`).join("")}`;
  const loadJimbo = () => {
    const j = h.jimboByDayosisi[dSel.value] || [];
    jSel.innerHTML = `<option value="">Chagua Jimbo</option>${j.map((x) => `<option ${record?.jimbo === x ? "selected" : ""}>${x}</option>`).join("")}`;
  };
  const loadTawi = () => {
    const t = h.tawiByJimbo[jSel.value] || [];
    tSel.innerHTML = `<option value="">Chagua Tawi</option>${t.map((x) => `<option ${record?.branch === x ? "selected" : ""}>${x}</option>`).join("")}`;
  };
  loadJimbo();
  loadTawi();
  dSel.addEventListener("change", () => { record = null; loadJimbo(); tSel.innerHTML = `<option value="">Chagua Tawi</option>`; });
  jSel.addEventListener("change", () => { record = null; loadTawi(); });
  moduleSel?.addEventListener("change", () => {
    const opts = moduleCategories[moduleSel.value] || [];
    catSel.innerHTML = opts.map((o) => `<option>${o}</option>`).join("");
  });
}

function openMinistryForm(record = null) { renderMinistryForm(record); el("ministryModal").classList.add("open"); }
function closeMinistryForm() { el("ministryModal").classList.remove("open"); el("ministryFormError").textContent = ""; }

function getEntryConfig(type) {
  if (type === "member") return [{ key: "jina", label: "Chagua Muumini", required: true }, { key: "idara", label: "Chagua Idara", required: true }, { key: "role", label: "Role ndani ya Idara", required: true }, { key: "kujiunga", label: "Tarehe ya Kujiunga", type: "date", required: true }, { key: "notes", label: "Notes", textarea: true }, { key: "status", label: "Status", options: ["active", "inactive", "suspended"], required: true }];
  if (type === "leader") return [{ key: "kiongozi", label: "Kiongozi", required: true }, { key: "idara", label: "Idara", required: true }, { key: "cheo", label: "Cheo", required: true }, { key: "dayosisi", label: "Dayosisi", required: true }, { key: "jimbo", label: "Jimbo", required: true }, { key: "tawi", label: "Tawi", required: true }, { key: "simu", label: "Simu", required: true }, { key: "email", label: "Email", required: false }, { key: "status", label: "Status", options: ["active", "inactive"], required: true }];
  if (type === "activity") return [{ key: "jina", label: "Jina la Shughuli", required: true }, { key: "idara", label: "Chagua Idara", required: true }, { key: "tarehe", label: "Tarehe", type: "date", required: true }, { key: "muda", label: "Muda", required: false }, { key: "mahali", label: "Mahali", required: true }, { key: "msimamizi", label: "Msimamizi", required: true }, { key: "maelezo", label: "Maelezo", textarea: true }, { key: "budget", label: "Budget optional", type: "number" }, { key: "status", label: "Status", options: ["planned", "pending", "done"], required: true }, { key: "notes", label: "Notes", textarea: true }];
  return [{ key: "idara", label: "Idara", required: true }, { key: "aina", label: "Aina ya Mchango", required: true }, { key: "kiasi", label: "Kiasi", type: "number", required: true }, { key: "mlipaji", label: "Mlipaji", required: true }, { key: "tarehe", label: "Tarehe", type: "date", required: true }, { key: "method", label: "Payment Method", required: true }, { key: "status", label: "Status", options: ["pending", "received", "rejected"], required: true }];
}

function openEntryForm(type, record = null) {
  entryType = type;
  entryEditId = record?.id || null;
  el("entryModalTitle").textContent = `${entryEditId ? "Edit" : "Add"} ${type}`;
  const form = el("entryForm");
  form.innerHTML = getEntryConfig(type).map((f) => {
    const v = record?.[f.key] ?? "";
    if (f.options) return `<label>${f.label}<select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    if (f.textarea) return `<label class="full">${f.label}<textarea name="${f.key}">${v}</textarea></label>`;
    return `<label>${f.label}<input type="${f.type || "text"}" name="${f.key}" value="${v}" /></label>`;
  }).join("");
  el("entryModal").classList.add("open");
}

function closeEntryForm() { el("entryModal").classList.remove("open"); entryType = ""; entryEditId = null; el("entryFormError").textContent = ""; }

function requestDelete(scope, id) { deleteScope = scope; deleteId = id; el("confirmTitle").textContent = `Delete ${scope}`; el("confirmModal").classList.add("open"); }
function closeDelete() { el("confirmModal").classList.remove("open"); deleteScope = ""; deleteId = null; }

function renderProfileDrawer(record) {
  const docs = [
    `Documents: ${record.documents || "not uploaded"}`,
    `Document Type: ${record.document_type || "default"}`,
    `Report Type: ${record.report_type || "default"}`,
    `Projects: ${record.projects_linked || "-"}`,
  ];
  el("profileDrawerContent").innerHTML = `
    <div class="profile-grid">
      <div class="profile-item"><b>Name:</b> ${record.name || "-"}</div>
      <div class="profile-item"><b>Module:</b> ${record.module || "-"}</div>
      <div class="profile-item"><b>Short Code:</b> ${record.short_code || "-"}</div>
      <div class="profile-item"><b>Scope:</b> ${record.scope || "-"}</div>
      <div class="profile-item"><b>Leaders:</b> ${record.leader || record.teacher || record.director || "-"}</div>
      <div class="profile-item"><b>Members/Students:</b> ${record.members || record.students || "-"}</div>
      <div class="profile-item"><b>Dayosisi / Jimbo / Branch:</b> ${record.dayosisi || "-"} / ${record.jimbo || "-"} / ${record.branch || "-"}</div>
      <div class="profile-item"><b>Category / Type:</b> ${record.category || "-"} / ${record.type || "-"}</div>
      <div class="profile-item"><b>Calendar / Reports:</b> ${record.calendar || "-"} / ${record.reports || "-"}</div>
      <div class="profile-item"><b>Status:</b> ${record.status || "-"}</div>
    </div>
    <div class="profile-block"><b>Activities</b><p>${record.activities || "-"}</p></div>
    <div class="profile-block"><b>Constitution / Rules</b><p>${record.constitution_rules || "-"}</p></div>
    <div class="profile-block"><b>Media</b><p>${record.media || "-"}</p></div>
    <div class="profile-block"><b>Documents Panel</b><ul>${docs.map((x) => `<li>${x}</li>`).join("")}</ul></div>
    <div class="profile-block"><b>History / Notes</b><p>${record.history || record.notes || "-"}</p></div>
  `;
}

function openProfileDrawer(id) {
  const row = getMinistries().find((r) => r.id === id);
  if (!row) return toast("Profile haijapatikana.");
  selectedProfileId = id;
  renderProfileDrawer(row);
  el("profileDrawer").classList.add("open");
}

function closeProfileDrawer() {
  el("profileDrawer").classList.remove("open");
  selectedProfileId = null;
}

function applyRoleUI() {
  document.querySelectorAll("[data-action='add']").forEach((b) => (b.disabled = !can("add")));
  document.querySelectorAll("[data-action='clear']").forEach((b) => (b.disabled = !can("clear")));
  document.querySelectorAll("[data-action='export']").forEach((b) => (b.disabled = !can("export")));
  document.querySelectorAll("[data-action='print']").forEach((b) => (b.disabled = !can("print")));
  document.querySelectorAll("[data-members='add'],[data-leaders='add'],[data-activities='add'],[data-contributions='add']").forEach((b) => (b.disabled = !can("add")));
  document.querySelectorAll("[data-members='clear'],[data-leaders='clear'],[data-activities='clear'],[data-contributions='clear']").forEach((b) => (b.disabled = !can("clear")));
}

async function saveMinistryForm() {
  if (isLoading) return;
  const fd = new FormData(el("ministryForm"));
  const errField = ministryFieldConfig.find((f) => f.required && !String(fd.get(f.key) || "").trim());
  if (errField) return (el("ministryFormError").textContent = `${errField.label} inahitajika.`);
  const payload = Object.fromEntries(fd.entries());
  if (!inScope(payload)) return toast("Hii ministry iko nje ya scope yako.");
  try {
    setLoading(true, "Inahifadhi ministry...");
    await saveMinistry(payload, editId);
    await logMinistryActivity(currentRole, editId ? "edit" : "create", "Saved ministry", payload);
    closeMinistryForm();
    await refresh();
    toast("Ministry saved.");
  } catch (error) {
    toast(error.message || "Imeshindikana kuhifadhi ministry.");
  } finally {
    setLoading(false);
  }
}

async function saveEntryForm() {
  if (isLoading) return;
  const fd = new FormData(el("entryForm"));
  const payload = Object.fromEntries(fd.entries());
  const cfg = getEntryConfig(entryType);
  const errField = cfg.find((f) => f.required && !String(payload[f.key] || "").trim());
  if (errField) return (el("entryFormError").textContent = `${errField.label} inahitajika.`);
  if (!inScope(payload)) return toast("Hii rekodi iko nje ya scope yako.");
  try {
    setLoading(true, "Inahifadhi taarifa...");
    if (entryType === "member") await saveMinistryMember(payload, entryEditId);
    if (entryType === "leader") await saveMinistryLeader(payload, entryEditId);
    if (entryType === "activity") await saveMinistryActivity(payload, entryEditId);
    if (entryType === "contribution") await saveMinistryContribution(payload, entryEditId);
    await logMinistryActivity(currentRole, entryEditId ? "edit" : "create", `Saved ${entryType}`, payload);
    closeEntryForm();
    await refresh();
    toast("Saved successfully.");
  } catch (error) {
    toast(error.message || "Imeshindikana kuhifadhi record.");
  } finally {
    setLoading(false);
  }
}

async function onConfirmDelete() {
  if (isLoading) return;
  if (!deleteScope || deleteId === null) return closeDelete();
  const scopeRecord = deleteScope === "ministry" ? getMinistries().find((x) => x.id === deleteId)
    : deleteScope === "member" ? getMinistryMembers().find((x) => x.id === deleteId)
      : deleteScope === "leader" ? getMinistryLeaders().find((x) => x.id === deleteId)
        : deleteScope === "activity" ? getMinistryActivities().find((x) => x.id === deleteId)
          : getMinistryContributions().find((x) => x.id === deleteId);
  if (!scopeRecord || !inScope(scopeRecord)) return closeDelete();
  try {
    setLoading(true, "Inafuta taarifa...");
    if (deleteScope === "ministry") await deleteMinistry(deleteId);
    if (deleteScope === "member") await deleteMinistryMember(deleteId);
    if (deleteScope === "leader") await deleteMinistryLeader(deleteId);
    if (deleteScope === "activity") await deleteMinistryActivity(deleteId);
    if (deleteScope === "contribution") await deleteMinistryContribution(deleteId);
    await logMinistryActivity(currentRole, "delete", `Deleted ${deleteScope}`, { id: deleteId });
    closeDelete();
    await refresh();
    toast("Record deleted.");
  } catch (error) {
    toast(error.message || "Imeshindikana kufuta record.");
  } finally {
    setLoading(false);
  }
}

async function refresh() {
  renderKpis();
  renderModuleTabs();
  renderMinistryCards();
  renderFilters();
  renderMinistriesTable();
  renderMinis();
  applyRoleUI();
  el("modeBadge").textContent = `Data: ${getMode() === "supabase" ? "Supabase" : "Mock"} • Role: ${currentRole}`;
  const m = getMinistries().filter(inScope);
  const contrib = getMinistryContributions().filter(inScope).reduce((s, x) => s + (Number(x.kiasi) || 0), 0);
  const done = getMinistryActivities().filter((x) => inScope(x) && x.status === "done").length;
  const totalA = getMinistryActivities().filter(inScope).length || 1;
  el("reportsGrid").innerHTML = [
    ["Modules zenye Activities", m.filter((x) => String(x.activities || "").trim()).length],
    ["Completion Rate", `${Math.round((done / totalA) * 100)}%`],
    ["Total Michango", contrib.toLocaleString()],
    ["Active Leaders", getMinistryLeaders().filter((x) => inScope(x) && x.status === "active").length],
  ].map(([k, v]) => `<article class="kpi"><p>${k}</p><h3>${v}</h3></article>`).join("");
}

function bind() {
  el("topActions").addEventListener("click", async (e) => {
    const a = e.target.dataset.action;
    if (!a) return;
    if (a === "add") { if (!can("add")) return toast("Huna ruhusa."); openMinistryForm(); }
    if (a === "clear") { if (!can("clear")) return toast("Huna ruhusa."); await clearMinistries(); await logMinistryActivity(currentRole, "clear", "Cleared ministries"); await refresh(); }
    if (a === "export") { if (!can("export")) return toast("Huna ruhusa."); downloadCsv("ministries", getMinistries().filter(inScope)); }
    if (a === "print") { if (!can("print")) return toast("Huna ruhusa."); window.print(); }
  });
  el("moduleTabs").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const moduleTab = t.getAttribute("data-module-tab");
    if (!moduleTab) return;
    activeModuleTab = moduleTab;
    page = 1;
    renderModuleTabs();
    renderMinistriesTable();
  });
  el("filtersBar").addEventListener("input", (e) => { const k = e.target.dataset.filter; if (!k) return; filters[k] = e.target.value; page = 1; renderMinistriesTable(); });
  document.body.addEventListener("click", (e) => {
    const cardViewId = Number(e.target.dataset.view);
    if (cardViewId) {
      openProfileDrawer(cardViewId);
      return;
    }
    const act = e.target.dataset.act;
    const id = Number(e.target.dataset.id);
    if (!act) return;
    if (act === "view") openProfileDrawer(id);
    if (act === "edit") { if (!can("edit")) return toast("No permission."); const row = getMinistries().find((r) => r.id === id); if (row && inScope(row)) openMinistryForm(row); }
    if (act === "delete") { if (!can("delete")) return toast("No permission."); requestDelete("ministry", id); }
    if (act === "print") window.print();
    if (act === "pdf") downloadCsv("profile_pdf_ready", getMinistries().filter((r) => r.id === id));
    if (act === "excel") downloadCsv("personnel_export_excel_ready", getMinistries().filter((r) => r.id === id));
    if (act === "cv") toast("Upload Document action ready.");
    if (act === "appt") toast("Add Report Type action ready.");
    if (act === "cert") toast("Add Document Type action ready.");
    if (act === "ordi") toast("Add Activity Category action ready.");
  });
  document.body.addEventListener("click", (e) => {
    const scope = e.target.dataset.scope;
    const a = e.target.dataset.a;
    const id = Number(e.target.dataset.id);
    if (!scope || !a) return;
    if (a === "view") toast(`Viewing ${scope} #${id}`);
    if (a === "edit") {
      if (!can("edit")) return toast("No permission.");
      if (scope === "member") openEntryForm("member", getMinistryMembers().find((x) => x.id === id));
      if (scope === "leader") openEntryForm("leader", getMinistryLeaders().find((x) => x.id === id));
      if (scope === "activity") openEntryForm("activity", getMinistryActivities().find((x) => x.id === id));
      if (scope === "contribution") openEntryForm("contribution", getMinistryContributions().find((x) => x.id === id));
    }
    if (a === "delete") requestDelete(scope, id);
  });
  el("saveMinistryBtn").addEventListener("click", saveMinistryForm);
  el("cancelMinistryBtn").addEventListener("click", closeMinistryForm);
  el("saveEntryBtn").addEventListener("click", saveEntryForm);
  el("cancelEntryBtn").addEventListener("click", closeEntryForm);
  el("cancelDeleteBtn").addEventListener("click", closeDelete);
  el("confirmDeleteBtn").addEventListener("click", onConfirmDelete);
  el("prevBtn").addEventListener("click", () => { if (page > 1) { page -= 1; renderMinistriesTable(); } });
  el("nextBtn").addEventListener("click", () => { const max = Math.max(1, Math.ceil(getMinistries().filter((r) => inScope(r) && matches(r)).length / pageSize)); if (page < max) { page += 1; renderMinistriesTable(); } });

  document.querySelector("[data-members='add']").addEventListener("click", () => { if (!can("add")) return toast("No permission."); openEntryForm("member"); });
  document.querySelector("[data-members='clear']").addEventListener("click", async () => { if (!can("clear")) return toast("No permission."); await clearMinistryMembers(); await refresh(); });
  document.querySelector("[data-members='export']").addEventListener("click", () => downloadCsv("ministry_members", getMinistryMembers().filter(inScope)));
  document.querySelector("[data-leaders='add']").addEventListener("click", () => { if (!can("add")) return toast("No permission."); openEntryForm("leader"); });
  document.querySelector("[data-leaders='clear']").addEventListener("click", async () => { if (!can("clear")) return toast("No permission."); await clearMinistryLeaders(); await refresh(); });
  document.querySelector("[data-leaders='export']").addEventListener("click", () => downloadCsv("ministry_leaders", getMinistryLeaders().filter(inScope)));
  document.querySelector("[data-activities='add']").addEventListener("click", () => { if (!can("add")) return toast("No permission."); openEntryForm("activity"); });
  document.querySelector("[data-activities='clear']").addEventListener("click", async () => { if (!can("clear")) return toast("No permission."); await clearMinistryActivities(); await refresh(); });
  document.querySelector("[data-activities='export']").addEventListener("click", () => downloadCsv("ministry_activities", getMinistryActivities().filter(inScope)));
  document.querySelector("[data-activities='print']").addEventListener("click", () => window.print());
  document.querySelector("[data-contributions='add']").addEventListener("click", () => { if (!can("add")) return toast("No permission."); openEntryForm("contribution"); });
  document.querySelector("[data-contributions='clear']").addEventListener("click", async () => { if (!can("clear")) return toast("No permission."); await clearMinistryContributions(); await refresh(); });
  document.querySelector("[data-contributions='export']").addEventListener("click", () => downloadCsv("ministry_contributions", getMinistryContributions().filter(inScope)));
  el("closeProfileDrawerBtn").addEventListener("click", closeProfileDrawer);
  el("profilePrintBtn").addEventListener("click", () => window.print());
  el("profilePdfBtn").addEventListener("click", () => {
    if (!selectedProfileId) return;
    downloadCsv("profile_pdf_ready", getMinistries().filter((r) => r.id === selectedProfileId));
  });
  el("profileExcelBtn").addEventListener("click", () => {
    if (!selectedProfileId) return;
    downloadCsv("profile_excel_ready", getMinistries().filter((r) => r.id === selectedProfileId));
  });

  const extraActions = [
    ["Add Category", () => toast("Add Category imewezeshwa kupitia field ya category.")],
    ["Add Type", () => toast("Add Type imewezeshwa kupitia field ya type.")],
    ["Add Custom Field", () => toast("Add Custom Field placeholder ready.")],
    ["Add Custom Section", () => toast("Add Custom Section placeholder ready.")],
    ["Add Access Level", () => toast("Add Access Level action ready.")],
    ["Add Approval Status", () => toast("Add Approval Status action ready.")],
    ["Draft / Review / Publish", () => toast("Draft/Review/Publish workflow action ready.")],
    ["Add Leader Category", () => toast("Add Leader Category action ready.")],
    ["Add Activity Category", () => toast("Add Activity Category action ready.")],
    ["Add Document Type", () => toast("Add Document Type action ready.")],
    ["Add Project Type", () => toast("Add Project Type action ready.")],
    ["Add Report Type", () => toast("Add Report Type action ready.")],
  ];
  const top = el("topActions");
  extraActions.forEach(([label, handler]) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = label;
    btn.type = "button";
    btn.addEventListener("click", handler);
    top.appendChild(btn);
  });
}

async function init() {
  installGlobalCrashGuards("phase7_ministries");
  try {
    const session = JSON.parse(localStorage.getItem("kmt_session") || "{}");
    currentRole = session.role || localStorage.getItem("mock_role") || "admin";
  } catch (_) {
    currentRole = localStorage.getItem("mock_role") || "admin";
  }
  try {
    setLoading(true, "Inapakia Ministries module...");
    await loadAllMinistryData();
    await refresh();
    bind();
  } catch (error) {
    toast(error.message || "Imeshindikana kuanzisha module ya ministries.");
  } finally {
    setLoading(false);
  }
}
init();

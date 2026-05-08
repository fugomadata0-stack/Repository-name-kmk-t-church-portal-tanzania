import { leaderColumns, leaderFieldConfig, leaderModuleTabs, nationalDefaultRoles, roleAccess } from "./phase5-leadership-hooks.js";
import {
  clearDocuments,
  clearHistory,
  clearLeaders,
  getDocs,
  getFilterOptions,
  getHistory,
  getLeadershipMode,
  getLeaders,
  loadLeadershipData,
  logLeadershipActivity,
  logLeadershipActivityDb,
  removeDocumentItem,
  removeHistoryItem,
  removeLeader,
  saveDocumentItem,
  saveHistoryItem,
  saveLeader,
  saveMetaItem,
  removeMetaItem,
  getMetaItems,
  uploadLeaderAsset,
  canManageByRole,
  submitLeader,
  approveLeader,
  rejectLeader,
  requestLeaderCorrection,
  restoreLeader,
  getTransfers,
  getVacancies,
} from "./phase5-leadership-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";
import { normalizePayloadByFieldMap } from "./utils/input-normalization.js";

let selectedLeaderId = null;
let editingLeaderId = null;
let page = 1;
const perPage = 6;
let activeTab = leaderModuleTabs[0];
let currentRole = "member";
let loading = true;
let pendingDeleteScope = "leader";
let activeMetaKind = "positions";
let editingMetaId = null;

function normalizeLeadershipLevel(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "diocesan" || raw === "dayosisi") return "Dayosisi";
  if (raw === "national" || raw === "ngazi kuu") return "Ngazi Kuu";
  return value || "-";
}

function toast(text) {
  const wrap = document.getElementById("toastWrap");
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function getInitialTabFromRoute() {
  const params = new URLSearchParams(window.location.search);
  const routeTab = params.get("tab");
  if (!routeTab) return leaderModuleTabs[0];
  const decoded = decodeURIComponent(routeTab);
  return leaderModuleTabs.includes(decoded) ? decoded : leaderModuleTabs[0];
}

function can(action) {
  return !!(roleAccess[currentRole] || roleAccess.member)[action] && canManageByRole(currentRole, action);
}

function renderKpis() {
  const rows = getLeaders();
  const total = rows.filter((r) => !r.is_archived).length;
  const national = rows.filter((r) => normalizeLeadershipLevel(r.leadership_level) === "Ngazi Kuu" || r.leader_type === "NGAZI_KUU").length;
  const dayosisi = rows.filter((r) => normalizeLeadershipLevel(r.leadership_level) === "Dayosisi").length;
  const maaskofu = rows.filter((r) => r.leader_type === "ASKOFU").length;
  const wachungaji = rows.filter((r) => r.leader_type === "MCHUNGAJI").length;
  const wainjilisti = rows.filter((r) => r.leader_type === "MWINJILISTI").length;
  const wazee = rows.filter((r) => r.leader_type === "MZEE").length;
  const mashemasi = rows.filter((r) => r.leader_type === "SHEMASI").length;
  const tawiLeaders = rows.filter((r) => r.leader_type === "KIONGOZI_TAWI").length;
  const active = rows.filter((r) => r.status === "active").length;
  const pending = rows.filter((r) => r.approval_status === "pending" || r.status === "submitted").length;
  const vacant = getVacancies().length;
  const incomplete = rows.filter((r) => !r.phone || !r.email || !r.role_name).length;
  const expiring = rows.filter((r) => r.end_of_term && new Date(r.end_of_term) <= new Date(Date.now() + 1000 * 60 * 60 * 24 * 120)).length;
  const items = [
    ["Jumla ya Viongozi wa Ngazi Kuu", national], ["Jumla ya Maaskofu", maaskofu], ["Jumla ya Wachungaji", wachungaji], ["Jumla ya Wainjilisti", wainjilisti],
    ["Jumla ya Wazee", wazee], ["Jumla ya Mashemasi", mashemasi], ["Jumla ya Waongozi wa Matawi", tawiLeaders], ["Nafasi Zilizo Wazi", vacant],
    ["Pending Approvals", pending], ["Profiles Incomplete", incomplete], ["Terms Zinazoisha Hivi Karibuni", expiring], ["Viongozi Waliopo Active", active], ["Jumla ya Viongozi", total], ["Jumla ya Dayosisi Leaders", dayosisi],
  ];
  document.getElementById("kpiGrid").innerHTML = items.map(([k,v]) => `<article class="kpi"><p>${k}</p><h4>${v}</h4></article>`).join("");
}

function renderTabs() {
  document.getElementById("moduleTabs").innerHTML = leaderModuleTabs
    .map((t) => `<button class="tab ${activeTab===t?"active":""}" data-tab="${t}">${t}</button>`)
    .join("");
}

function renderFilters() {
  const options = getFilterOptions();
  document.getElementById("filtersBar").innerHTML = `
    <input id="f_name" placeholder="Search by name" />
    <select id="f_role"><option value="">Filter by role</option>${options.roles.map((v) => `<option>${v}</option>`).join("")}</select>
    <select id="f_dayosisi"><option value="">Filter by Dayosisi</option>${options.dayosisi.map((v) => `<option>${v}</option>`).join("")}</select>
    <select id="f_jimbo"><option value="">Filter by Jimbo</option>${options.jimbo.map((v) => `<option>${v}</option>`).join("")}</select>
    <select id="f_tawi"><option value="">Filter by Tawi</option>${options.tawi.map((v) => `<option>${v}</option>`).join("")}</select>
    <select id="f_status"><option value="">Filter by status</option>${options.status.map((v) => `<option>${v}</option>`).join("")}</select>
    <select id="f_level"><option value="">Filter by leadership level</option>${options.ngazi.map((v) => `<option>${v}</option>`).join("")}</select>
    <button class="btn gold" id="applyFiltersBtn">Apply</button>
  `;
}

function filteredLeaders() {
  let rows = getLeaders();
  const by = (id) => document.getElementById(id)?.value || "";
  const name = by("f_name").toLowerCase();
  const role = by("f_role");
  const day = by("f_dayosisi");
  const jimbo = by("f_jimbo");
  const tawi = by("f_tawi");
  const status = by("f_status");
  const level = by("f_level");
  if (name) rows = rows.filter((r) => String(r.full_name || "").toLowerCase().includes(name));
  if (role) rows = rows.filter((r) => r.role_name === role);
  if (day) rows = rows.filter((r) => r.dayosisi === day);
  if (jimbo) rows = rows.filter((r) => r.jimbo === jimbo);
  if (tawi) rows = rows.filter((r) => r.branch === tawi);
  if (status) rows = rows.filter((r) => r.status === status);
  if (level) rows = rows.filter((r) => normalizeLeadershipLevel(r.leadership_level) === level || r.leadership_level === level);
  const byType = {
    "Viongozi wa Ngazi Kuu": (r) => r.leader_type === "NGAZI_KUU" || normalizeLeadershipLevel(r.leadership_level) === "Ngazi Kuu",
    "Viongozi wa Dayosisi": (r) => normalizeLeadershipLevel(r.leadership_level) === "Dayosisi",
    Maaskofu: (r) => r.leader_type === "ASKOFU" || String(r.role_name || "").toUpperCase().includes("ASKOFU"),
    Wachungaji: (r) => r.leader_type === "MCHUNGAJI" || String(r.role_name || "").toUpperCase().includes("MCHUNGAJI"),
    Wainjilisti: (r) => r.leader_type === "MWINJILISTI" || String(r.role_name || "").toUpperCase().includes("WINJIL"),
    "Wazee wa Kanisa": (r) => r.leader_type === "MZEE" || String(r.role_name || "").toUpperCase().includes("MZEE"),
    Mashemasi: (r) => r.leader_type === "SHEMASI" || String(r.role_name || "").toUpperCase().includes("SHEMA"),
    "Waongozi wa Matawi / Wasimamizi": (r) => r.leader_type === "KIONGOZI_TAWI",
  };
  if (byType[activeTab]) rows = rows.filter(byType[activeTab]);
  rows = rows.filter((r) => !r.is_archived || by("f_status") === "archived");
  return rows;
}

function renderTable() {
  const head = document.getElementById("leadersHead");
  const body = document.getElementById("leadersBody");
  const cards = document.getElementById("leadersCards");
  const cols = leaderColumns.filter((c) => c !== "actions");
  const labels = {
    id:"ID", full_name:"Jina Kamili", role_name:"Cheo / Role", leader_type:"Aina", leadership_level:"Ngazi ya Uongozi", dayosisi:"Dayosisi", jimbo:"Jimbo",
    branch:"Branch", phone:"Simu", email:"Email", service_start_date:"Tarehe ya Kuanza", years_of_service: "Years", status:"Status", visibility:"Visibility",
    approval_status:"Approval",
  };
  head.innerHTML = cols.map((c) => `<th>${labels[c]}</th>`).join("") + "<th>Actions</th>";
  if (loading) {
    body.innerHTML = `<tr><td colspan="${cols.length+1}" class="empty">Loading state...</td></tr>`;
    cards.innerHTML = `<div class="leader-card">Loading state...</div>`;
    return;
  }
  if (activeTab === "Nafasi Zilizo Wazi") return renderVacanciesTable();
  if (activeTab === "Uhamisho / Assignments") return renderTransfersTable();
  if (activeTab === "Ripoti za Viongozi") return renderReportsTable();
  const rows = filteredLeaders();
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="${cols.length+1}" class="empty">Empty state: Hakuna viongozi waliopatikana.</td></tr>`;
    cards.innerHTML = `<div class="leader-card">Empty state: Hakuna viongozi waliopatikana.</div>`;
    return;
  }
  const maxPage = Math.max(1, Math.ceil(rows.length/perPage));
  if (page > maxPage) page = maxPage;
  const list = rows.slice((page-1)*perPage, (page-1)*perPage + perPage);
  document.getElementById("pageInfo").textContent = `Page ${page}/${maxPage} | Total ${rows.length}`;

  body.innerHTML = list.map((r) => `
    <tr>
      ${cols.map((c)=> c==="status" ? `<td><span class="status ${r.status}">${r.status}</span></td>` : `<td>${r[c] ?? "-"}</td>`).join("")}
      <td>
        <button class="btn" data-action="view" data-id="${r.id}">View</button>
        <button class="btn" data-action="edit" data-id="${r.id}">Edit</button>
        <button class="btn danger" data-action="delete" data-id="${r.id}">Archive</button>
        <button class="btn" data-action="restore" data-id="${r.id}">Restore</button>
        <button class="btn" data-action="submit" data-id="${r.id}">Submit</button>
        <button class="btn" data-action="approve" data-id="${r.id}">Approve</button>
        <button class="btn danger" data-action="reject" data-id="${r.id}">Reject</button>
        <button class="btn" data-action="correction" data-id="${r.id}">Correction</button>
        <button class="btn" data-action="photo" data-id="${r.id}">Upload Photo</button>
        <button class="btn" data-action="doc" data-id="${r.id}">Upload Document</button>
      </td>
    </tr>
  `).join("");

  cards.innerHTML = list.map((r)=>`
    <article class="leader-card">
      <strong>${r.full_name}</strong>
      <p>${r.role_name} • ${normalizeLeadershipLevel(r.leadership_level)}</p>
      <p>${r.dayosisi} / ${r.jimbo} / ${r.branch}</p>
      <p>${r.phone} • ${r.email}</p>
      <p><span class="status ${r.status}">${r.status}</span></p>
      <div class="actions">
        <button class="btn" data-action="view" data-id="${r.id}">View</button>
        <button class="btn" data-action="edit" data-id="${r.id}">Edit</button>
        <button class="btn danger" data-action="delete" data-id="${r.id}">Delete</button>
      </div>
    </article>
  `).join("");
  applyRoleUI();
}

function renderReportsTable() {
  const head = document.getElementById("leadersHead");
  const body = document.getElementById("leadersBody");
  const cards = document.getElementById("leadersCards");
  const reports = [
    "Orodha ya Viongozi wa Ngazi Kuu",
    "Orodha ya Viongozi wa Dayosisi",
    "Orodha ya Maaskofu",
    "Orodha ya Wachungaji",
    "Orodha ya Wainjilisti",
    "Orodha ya Wazee",
    "Orodha ya Mashemasi",
    "Orodha ya Waongozi wa Matawi",
    "Orodha ya Nafasi Zilizo Wazi",
    "Orodha ya Profiles Incomplete",
    "Orodha ya Terms Zinazoisha",
    "Orodha ya Pending Approvals",
    "Orodha ya Approved Leaders",
    "Orodha ya Rejected / Needs Correction",
    "Orodha ya Transfers",
    "Orodha ya Historical Leaders",
  ];
  head.innerHTML = "<th>Report Name</th><th>CSV</th><th>Excel</th><th>PDF</th><th>Print</th>";
  body.innerHTML = reports
    .map(
      (r, idx) =>
        `<tr><td>${r}</td><td><button class="btn" data-action="reportCsv" data-id="${idx}">Export CSV</button></td><td><button class="btn" data-action="reportExcel" data-id="${idx}">Export Excel</button></td><td><button class="btn" data-action="reportPdf" data-id="${idx}">Export PDF</button></td><td><button class="btn" data-action="print">Print</button></td></tr>`
    )
    .join("");
  cards.innerHTML = reports
    .map(
      (r, idx) =>
        `<article class="leader-card"><strong>${r}</strong><div class="actions"><button class="btn" data-action="reportCsv" data-id="${idx}">CSV</button><button class="btn" data-action="reportExcel" data-id="${idx}">Excel</button><button class="btn" data-action="reportPdf" data-id="${idx}">PDF</button></div></article>`
    )
    .join("");
}

function exportRowsAsCsv(rows, filename = "leadership-report.csv") {
  if (!rows.length) return false;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}

function exportRowsAsExcel(rows, filename = "leadership-report.xls") {
  if (!rows.length) return false;
  const keys = Object.keys(rows[0]);
  const header = `<tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr>${keys.map((k) => `<td>${String(r[k] ?? "")}</td>`).join("")}</tr>`).join("");
  const html = `<html><body><table>${header}${body}</table></body></html>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([html], { type: "application/vnd.ms-excel" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}

function exportRowsAsPdfPrint(rows, title = "Leadership Report") {
  if (!rows.length) return false;
  const keys = Object.keys(rows[0]);
  const table = `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%"><thead><tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${keys.map((k) => `<td>${String(r[k] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(`<html><head><title>${title}</title></head><body><h2>${title}</h2>${table}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
  return true;
}

function renderHistoryTable() {
  const rows = getHistory();
  document.getElementById("historyBody").innerHTML = rows.map((r)=>`
    <tr>
      <td>${r.kiongozi}</td><td>${r.cheo}</td><td>${r.eneo}</td><td>${r.kuanza}</td><td>${r.kumaliza}</td><td><span class="status ${r.status}">${r.status}</span></td><td>${r.notes}</td>
      <td><button class="btn" data-history-action="edit" data-id="${r.id}">Edit</button><button class="btn danger" data-history-action="delete" data-id="${r.id}">Delete</button></td>
    </tr>
  `).join("");
}

function renderVacanciesTable() {
  const head = document.getElementById("leadersHead");
  const body = document.getElementById("leadersBody");
  const cards = document.getElementById("leadersCards");
  const rows = getVacancies();
  head.innerHTML = "<th>Ngazi</th><th>Eneo</th><th>Nafasi</th><th>Tarehe ya Kuwa Wazi</th><th>Sababu</th><th>Priority</th><th>Assigned Recruiter</th><th>Status</th><th>Actions</th>";
  body.innerHTML = rows.map((r) => `<tr><td>${r.ngazi}</td><td>${r.eneo}</td><td>${r.nafasi}</td><td>${r.tarehe_kuwa_wazi}</td><td>${r.sababu}</td><td>${r.priority}</td><td>${r.assigned_recruiter}</td><td>${r.status}</td><td><button class="btn" data-action="viewVacancy" data-id="${r.id}">View</button><button class="btn" data-action="print">Print</button></td></tr>`).join("");
  cards.innerHTML = rows.map((r) => `<article class="leader-card"><strong>${r.nafasi}</strong><p>${r.ngazi} • ${r.eneo}</p><p>${r.status}</p></article>`).join("");
}

function renderTransfersTable() {
  const head = document.getElementById("leadersHead");
  const body = document.getElementById("leadersBody");
  const cards = document.getElementById("leadersCards");
  const rows = getTransfers();
  head.innerHTML = "<th>Kiongozi</th><th>From Dayosisi</th><th>To Dayosisi</th><th>From Jimbo</th><th>To Jimbo</th><th>From Tawi</th><th>To Tawi</th><th>Reason</th><th>Effective Date</th><th>Approval</th><th>Status</th>";
  body.innerHTML = rows.map((r) => `<tr><td>${r.leader_name}</td><td>${r.from_dayosisi}</td><td>${r.to_dayosisi}</td><td>${r.from_jimbo}</td><td>${r.to_jimbo}</td><td>${r.from_tawi}</td><td>${r.to_tawi}</td><td>${r.reason}</td><td>${r.effective_date}</td><td>${r.approval_status}</td><td>${r.status}</td></tr>`).join("");
  cards.innerHTML = rows.map((r) => `<article class="leader-card"><strong>${r.leader_name}</strong><p>${r.from_dayosisi} → ${r.to_dayosisi}</p><p>${r.effective_date}</p></article>`).join("");
}

function renderDocsTable() {
  const rows = getDocs();
  document.getElementById("docsBody").innerHTML = rows.map((r)=>`
    <tr>
      <td>${r.kiongozi}</td><td>${r.aina}</td><td>${r.file}</td><td>${r.by}</td><td>${r.date}</td><td>${r.visibility}</td>
      <td><button class="btn" data-doc-action="view" data-id="${r.id}">View</button><button class="btn" data-doc-action="download" data-id="${r.id}">Download</button><button class="btn danger" data-doc-action="delete" data-id="${r.id}">Delete</button></td>
    </tr>
  `).join("");
}

function renderLeaderForm(record = null) {
  const form = document.getElementById("leaderForm");
  form.innerHTML = leaderFieldConfig.map((f)=>{
    const value = record?.[f.key] ?? "";
    const full = f.textarea ? "full" : "";
    if (f.key === "role_name") {
      const opts = [...new Set([...nationalDefaultRoles, ...getFilterOptions().roles])];
      return `<div class="${full}"><label>${f.label}</label><select name="${f.key}"><option value="">Select role</option>${opts
        .map((o) => `<option ${value===o?"selected":""}>${o}</option>`)
        .join("")}</select></div>`;
    }
    if (f.options) return `<div class="${full}"><label>${f.label}</label><select name="${f.key}" ${f.readOnly ? "disabled" : ""}>${f.options.map((o)=>`<option ${value===o?"selected":""}>${o}</option>`).join("")}</select></div>`;
    if (f.type === "date") return `<div class="${full}"><label>${f.label}</label><input name="${f.key}" type="date" value="${value}" /></div>`;
    if (f.textarea) return `<div class="full"><label>${f.label}</label><textarea name="${f.key}" placeholder="${f.label}">${value}</textarea></div>`;
    return `<div class="${full}"><label>${f.label}</label><input name="${f.key}" placeholder="${f.label}" value="${value}" ${f.readOnly ? "readonly" : ""} /></div>`;
  }).join("");
}

function validateLeader(payload) {
  for (const f of leaderFieldConfig.filter((x)=>x.required)) {
    if (!String(payload[f.key] || "").trim()) return `${f.label} inahitajika.`;
  }
  if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) return "Email sio sahihi.";
  if (payload.phone && !/^[0-9+\-\s]{7,20}$/.test(payload.phone)) return "Phone sio sahihi.";
  return "";
}

function openDetailDrawer(id) {
  const row = getLeaders().find((r)=>r.id===id);
  if (!row) return toast("Leader not found.");
  selectedLeaderId = id;
  document.getElementById("detailContent").innerHTML = `
    <article class="card">
      <h4>${row.full_name}</h4>
      <p><strong>${row.role_name}</strong> • ${normalizeLeadershipLevel(row.leadership_level)}</p>
      <p><span class="status ${row.status}">${row.status}</span></p>
      <p><strong>Contact:</strong> ${row.phone} | ${row.email}</p>
      <p><strong>Assigned Unit:</strong> ${row.dayosisi} / ${row.jimbo} / ${row.branch}</p>
      <p><strong>Leadership History:</strong> ${row.service_start_date} - ${row.end_of_term || "Present"}</p>
      <p><strong>Visibility:</strong> ${row.visibility || "-"}</p>
      <p><strong>Confidential Notes:</strong> ${row.confidential_notes || "-"}</p>
      <p><strong>Activity timeline:</strong> Last update placeholder</p>
    </article>
  `;
  document.getElementById("detailDrawer").classList.add("open");
}

function applyRoleUI() {
  document.querySelectorAll('[data-action="add"], [data-action="add_position"], [data-action="add_category"], [data-action="add_type"], [data-action="add_custom_field"], [data-action="edit"], [data-action="delete"], [data-action="clear"], [data-action="export"], [data-action="print"], [data-action="doc"], [data-action="photo"], [data-action="submit"], [data-action="approve"], [data-action="reject"], [data-action="correction"], [data-action="restore"]').forEach((btn)=>{
    const action = btn.getAttribute("data-action");
    const map = { add:"add", edit:"edit", delete:"archive", clear:"clear", export:"export", print:"print", doc:"upload", photo:"upload", add_position: "add", add_category: "add", add_type: "add", add_custom_field: "add", submit: "submit", approve: "approve", reject: "reject", correction: "reject", restore: "restore" };
    const ok = can(map[action] || "view");
    btn.disabled = !ok;
  });
}

function applyDetailRoleUI() {
  const detailActions = [
    ["detailEditBtn", "edit"],
    ["detailDeleteBtn", "delete"],
    ["detailPrintBtn", "print"],
    ["detailExportBtn", "export"],
    ["detailUploadBtn", "upload"],
  ];
  detailActions.forEach(([id, action]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !can(action);
  });
}

function metaLabel(kind) {
  const map = { positions: "Positions", categories: "Categories", types: "Types", custom_fields: "Custom Fields" };
  return map[kind] || "Meta";
}

function renderMetaRows() {
  const rows = getMetaItems(activeMetaKind);
  const body = document.getElementById("metaBody");
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="3" class="empty">Hakuna data bado.</td></tr>`;
    return;
  }
  body.innerHTML = rows
    .map(
      (r) => `<tr>
      <td>${r.name}</td>
      <td><span class="status ${r.status}">${r.status}</span></td>
      <td><button class="btn" data-meta-action="edit" data-id="${r.id}">Edit</button><button class="btn danger" data-meta-action="delete" data-id="${r.id}">Delete</button></td>
    </tr>`
    )
    .join("");
}

function openMetaModal(kind) {
  activeMetaKind = kind;
  editingMetaId = null;
  document.getElementById("metaForm").reset();
  document.getElementById("metaFormError").textContent = "";
  document.getElementById("metaModalTitle").textContent = `Manage ${metaLabel(kind)}`;
  renderMetaRows();
  document.getElementById("metaModal").classList.add("open");
}

function requestDelete(scope, id) {
  pendingDeleteScope = scope;
  selectedLeaderId = id ?? selectedLeaderId;
  const modal = document.getElementById("confirmModal");
  modal.querySelector("h4").textContent =
    scope === "leader" ? "Delete Leader" : scope === "history" ? "Delete History" : "Delete Document";
  modal.querySelector("p").textContent = "Una uhakika unataka kufuta record hii?";
  modal.classList.add("open");
}

function bindEvents() {
  document.getElementById("moduleTabs").addEventListener("click",(e)=>{
    const t=e.target; if(!(t instanceof HTMLElement)) return;
    const tab=t.getAttribute("data-tab"); if(!tab) return;
    activeTab = tab; page = 1; renderTabs(); renderTable();
  });

  document.getElementById("filtersBar").addEventListener("click",(e)=>{
    const t=e.target; if(!(t instanceof HTMLElement)) return;
    if(t.id==="applyFiltersBtn"){ page = 1; renderTable(); }
  });
  document.getElementById("filtersBar").addEventListener("input",()=>{ page = 1; renderTable(); });
  document.getElementById("filtersBar").addEventListener("change",()=>{ page = 1; renderTable(); });

  const onLeaderAction = (target) => {
    const action = target.getAttribute("data-action");
    const id = Number(target.getAttribute("data-id"));
    if (!action) return;
    if (["add","edit","delete","clear","export","print","submit","approve","reject","archive","restore"].includes(action) && !can(action === "delete" ? "archive" : action)) return toast("Huna ruhusa ya action hii.");
    if (action === "view" && id) openDetailDrawer(id);
    if (action === "edit" && id) {
      const row = getLeaders().find((r)=>r.id===id); if(!row) return;
      editingLeaderId = id;
      document.getElementById("leaderModalTitle").textContent = "Edit Leader";
      renderLeaderForm(row);
      document.getElementById("leaderModal").classList.add("open");
    }
    if (action === "delete" && id) requestDelete("leader", id);
    if (action === "restore" && id) restoreLeader(id, currentRole).then(() => { renderKpis(); renderTable(); toast("Record restored."); });
    if (action === "submit" && id) submitLeader(id, currentRole).then(() => { renderKpis(); renderTable(); toast("Record submitted."); });
    if (action === "approve" && id) approveLeader(id, currentRole).then(() => { renderKpis(); renderTable(); toast("Record approved."); });
    if (action === "reject" && id) rejectLeader(id, currentRole).then(() => { renderKpis(); renderTable(); toast("Record rejected."); });
    if (action === "correction" && id) requestLeaderCorrection(id, currentRole).then(() => { renderKpis(); renderTable(); toast("Correction requested."); });
    if (action === "photo" && id) {
      selectedLeaderId = id;
      document.getElementById("leaderPhotoInput").click();
    }
    if (action === "doc" && id) {
      selectedLeaderId = id;
      document.getElementById("leaderDocInput").click();
    }
    if (action === "reportCsv" || action === "reportExcel" || action === "reportPdf") {
      const rows = filteredLeaders();
      if (!rows.length) return toast("Hakuna data kwa report hii.");
      if (action === "reportCsv") exportRowsAsCsv(rows, "leadership-report.csv");
      if (action === "reportExcel") exportRowsAsExcel(rows, "leadership-report.xls");
      if (action === "reportPdf") exportRowsAsPdfPrint(rows, "Ripoti ya Viongozi");
      toast(`Report export: ${action.replace("report", "")} imekamilika`);
    }
  };

  document.getElementById("leadersBody").addEventListener("click",(e)=>{ const t=e.target; if(t instanceof HTMLElement) onLeaderAction(t); });
  document.getElementById("leadersCards").addEventListener("click",(e)=>{ const t=e.target; if(t instanceof HTMLElement) onLeaderAction(t); });

  document.getElementById("topActions").addEventListener("click",(e)=>{
    const t=e.target; if(!(t instanceof HTMLElement)) return;
    const action=t.getAttribute("data-action"); if(!action) return;
    if (!can(action)) return toast("Huna ruhusa ya action hii.");
    if(action==="add"){ editingLeaderId=null; document.getElementById("leaderModalTitle").textContent="Add Leader"; renderLeaderForm(); document.getElementById("leaderModal").classList.add("open"); }
    if (action==="add_position") openMetaModal("positions");
    if (action==="add_category") openMetaModal("categories");
    if (action==="add_type") openMetaModal("types");
    if (action==="add_custom_field") openMetaModal("custom_fields");
    if(action==="clear"){
      clearLeaders()
        .then(async ()=>{ renderKpis(); renderFilters(); renderTable(); logLeadershipActivity("clear","Leaders cleared"); await logLeadershipActivityDb({ actorRole: currentRole, action: "clear", description: "Cleared leaders table" }); })
        .catch((err)=>toast(`Clear failed: ${err.message || err}`));
    }
    if(action==="export"){
      const rows = filteredLeaders();
      if (!rows.length) return toast("Hakuna data ya ku-export.");
      exportRowsAsCsv(rows, "leadership-export.csv");
      toast("Export imekamilika.");
      logLeadershipActivity("export","Export leaders");
    }
    if(action==="print"){ window.print(); logLeadershipActivity("print","Print leaders"); }
  });

  document.getElementById("saveLeaderBtn").addEventListener("click",(e)=>{
    e.preventDefault();
    const fd = new FormData(document.getElementById("leaderForm"));
    const payload = normalizePayloadByFieldMap(Object.fromEntries(fd.entries()), {
      email: { preserveCase: true },
      short_bio: { preserveCase: true },
      vision_statement: { preserveCase: true },
      confidential_notes: { preserveCase: true },
    });
    const fullName = [payload.first_name, payload.middle_name, payload.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    payload.full_name = fullName;
    payload.approval_status = payload.approval_status || "pending";
    if (payload.dob) {
      const age = new Date().getFullYear() - new Date(payload.dob).getFullYear();
      payload.age = Number.isFinite(age) && age > 0 ? age : "";
    }
    if (payload.service_start_date) {
      const years = new Date().getFullYear() - new Date(payload.service_start_date).getFullYear();
      payload.years_of_service = Number.isFinite(years) && years >= 0 ? years : 0;
    }
    const error = validateLeader(payload);
    document.getElementById("leaderFormError").textContent = error;
    if (error) return;
    saveLeader(payload, editingLeaderId)
      .then(()=>{
        logLeadershipActivity(editingLeaderId ? "edit" : "add", `${editingLeaderId ? "Edited" : "Added"} leader ${payload.full_name}`);
        logLeadershipActivityDb({ actorRole: currentRole, action: editingLeaderId ? "edit" : "add", description: payload.full_name, payload }).catch(() => {});
        document.getElementById("leaderModal").classList.remove("open");
        toast("Leader saved successfully.");
        renderKpis(); renderFilters(); renderTable();
      })
      .catch((err)=>{ document.getElementById("leaderFormError").textContent = `Save failed: ${err.message || err}`; });
  });
  document.getElementById("cancelLeaderBtn").addEventListener("click",(e)=>{ e.preventDefault(); document.getElementById("leaderModal").classList.remove("open"); });

  document.getElementById("confirmDeleteBtn").addEventListener("click",()=>{
    if (pendingDeleteScope === "leader") {
      removeLeader(selectedLeaderId)
        .then(()=>{
          document.getElementById("confirmModal").classList.remove("open");
          toast("Leader deleted.");
          logLeadershipActivity("delete", `Deleted leader ${selectedLeaderId}`);
          logLeadershipActivityDb({ actorRole: currentRole, action: "delete", description: String(selectedLeaderId) }).catch(() => {});
          renderKpis(); renderFilters(); renderTable();
        })
        .catch((err)=>toast(`Delete failed: ${err.message || err}`));
      return;
    }
    if (pendingDeleteScope === "history") {
      removeHistoryItem(selectedLeaderId).then(() => {
        document.getElementById("confirmModal").classList.remove("open");
        renderHistoryTable();
      });
      return;
    }
    if (pendingDeleteScope === "doc") {
      removeDocumentItem(selectedLeaderId).then(() => {
        document.getElementById("confirmModal").classList.remove("open");
        renderDocsTable();
      });
    }
  });
  document.getElementById("cancelDeleteBtn").addEventListener("click",()=>document.getElementById("confirmModal").classList.remove("open"));

  document.getElementById("closeDrawerBtn").addEventListener("click",()=>document.getElementById("detailDrawer").classList.remove("open"));
  document.getElementById("detailEditBtn").addEventListener("click",()=>{
    const row = getLeaders().find((r)=>r.id===selectedLeaderId); if(!row) return;
    editingLeaderId = selectedLeaderId; renderLeaderForm(row); document.getElementById("leaderModal").classList.add("open");
  });
  document.getElementById("detailDeleteBtn").addEventListener("click",()=>requestDelete("leader", selectedLeaderId));
  document.getElementById("detailPrintBtn").addEventListener("click",()=>window.print());
  document.getElementById("detailExportBtn").addEventListener("click",()=>toast("Export PDF placeholder."));
  document.getElementById("detailUploadBtn").addEventListener("click",()=>document.getElementById("leaderDocInput").click());

  document.getElementById("prevBtn").addEventListener("click",()=>{ page=Math.max(1,page-1); renderTable(); });
  document.getElementById("nextBtn").addEventListener("click",()=>{ page+=1; renderTable(); });

  document.querySelector('[data-history="add"]').addEventListener("click",()=>{
    saveHistoryItem({ kiongozi: "New Leader", cheo: "Kiongozi wa Idara", eneo: "Dar", kuanza: "2026-04-26", kumaliza: "-", status: "active", notes: "-" })
      .then(()=>{ renderHistoryTable(); toast("History row added."); })
      .catch((err)=>toast(`History add failed: ${err.message || err}`));
  });
  document.querySelector('[data-history="clear"]').addEventListener("click",()=>{ clearHistory().then(()=>renderHistoryTable()); });
  document.querySelector('[data-history="export"]').addEventListener("click",()=>{
    const rows = getHistory();
    if (!rows.length) return toast("Hakuna history ya ku-export.");
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "leadership-history.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("History export imekamilika.");
  });
  document.getElementById("historyBody").addEventListener("click",(e)=>{
    const t=e.target; if(!(t instanceof HTMLElement)) return;
    const id = Number(t.getAttribute("data-id")); const action = t.getAttribute("data-history-action");
    if(!id||!action) return;
    if(action==="delete"){ requestDelete("history", id); }
    if(action==="edit") toast(`Edit history ${id} placeholder.`);
  });

  document.querySelector('[data-doc="upload"]').addEventListener("click",()=>{
    saveDocumentItem({ kiongozi: "New Leader", aina: "Certificate", file: "new-file.pdf", by: currentRole, date: "2026-04-26", visibility: "restricted" })
      .then(()=>{ renderDocsTable(); toast("Document uploaded placeholder."); })
      .catch((err)=>toast(`Upload failed: ${err.message || err}`));
  });
  document.querySelector('[data-doc="clear"]').addEventListener("click",()=>{ clearDocuments().then(()=>renderDocsTable()); });
  document.getElementById("docsBody").addEventListener("click",(e)=>{
    const t=e.target; if(!(t instanceof HTMLElement)) return;
    const id = Number(t.getAttribute("data-id")); const action = t.getAttribute("data-doc-action");
    if(!id||!action) return;
    if(action==="delete"){ requestDelete("doc", id); }
    if(action==="view") toast("View document placeholder.");
    if(action==="download") toast("Download inafanyika kupitia file storage URL.");
  });

  document.getElementById("leaderPhotoInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!can("upload")) return toast("Huna ruhusa ya upload.");
    try {
      const { url } = await uploadLeaderAsset(file, "photos");
      if (selectedLeaderId) {
        const row = getLeaders().find((r) => r.id === selectedLeaderId);
        if (row) {
          await saveLeader({ ...row, profile_photo: "🖼️", confidential_notes: `${row.confidential_notes || ""}\nPhoto: ${url}` }, selectedLeaderId);
          renderTable();
        }
      }
      toast("Photo uploaded successfully.");
      logLeadershipActivity("upload_photo", file.name);
      await logLeadershipActivityDb({ actorRole: currentRole, action: "upload_photo", description: file.name, payload: { leaderId: selectedLeaderId, url } });
    } catch (error) {
      toast(`Photo upload failed: ${error.message || error}`);
    } finally {
      e.target.value = "";
    }
  });

  document.getElementById("leaderDocInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!can("upload")) return toast("Huna ruhusa ya upload.");
    try {
      const { url } = await uploadLeaderAsset(file, "documents");
      const leader = getLeaders().find((r) => r.id === selectedLeaderId);
      await saveDocumentItem({
        kiongozi: leader?.full_name || "Unknown",
        aina: "Leadership File",
        file: file.name,
        by: currentRole,
        date: new Date().toISOString().slice(0, 10),
        visibility: "restricted",
      });
      renderDocsTable();
      toast("Document uploaded successfully.");
      logLeadershipActivity("upload_document", file.name);
      await logLeadershipActivityDb({ actorRole: currentRole, action: "upload_document", description: file.name, payload: { leaderId: selectedLeaderId, url } });
    } catch (error) {
      toast(`Document upload failed: ${error.message || error}`);
    } finally {
      e.target.value = "";
    }
  });

  document.getElementById("saveMetaBtn").addEventListener("click", async (e) => {
    e.preventDefault();
    if (!can("add")) return toast("Huna ruhusa ya kuongeza.");
    const name = document.getElementById("metaNameInput").value.trim();
    const status = document.getElementById("metaStatusInput").value;
    if (!name) {
      document.getElementById("metaFormError").textContent = "Jina linahitajika.";
      return;
    }
    await saveMetaItem(activeMetaKind, { name, status }, editingMetaId);
    editingMetaId = null;
    document.getElementById("metaForm").reset();
    renderMetaRows();
    toast(`${metaLabel(activeMetaKind)} saved.`);
  });
  document.getElementById("cancelMetaBtn").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("metaModal").classList.remove("open");
  });
  document.getElementById("metaBody").addEventListener("click", async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const action = t.getAttribute("data-meta-action");
    const id = Number(t.getAttribute("data-id"));
    if (!action || !id) return;
    const row = getMetaItems(activeMetaKind).find((r) => r.id === id);
    if (action === "edit" && row) {
      editingMetaId = id;
      document.getElementById("metaNameInput").value = row.name || "";
      document.getElementById("metaStatusInput").value = row.status || "active";
    }
    if (action === "delete") {
      if (!can("delete")) return toast("Huna ruhusa ya delete.");
      await removeMetaItem(activeMetaKind, id);
      renderMetaRows();
      toast(`${metaLabel(activeMetaKind)} deleted.`);
    }
  });
}

async function init() {
  installGlobalCrashGuards("phase5_leadership");
  activeTab = getInitialTabFromRoute();
  try {
    const session = JSON.parse(localStorage.getItem("kmt_session") || "{}");
    currentRole = session.role || "member";
  } catch (error) {
    currentRole = "member";
  }
  try {
    await loadLeadershipData();
  } catch (error) {
    toast(`Data mode fallback: ${error.message || error}`);
  }
  renderKpis();
  renderTabs();
  renderFilters();
  renderHistoryTable();
  renderDocsTable();
  setTimeout(() => {
    loading = false;
    renderTable();
    applyRoleUI();
    applyDetailRoleUI();
    toast(`Leadership mode: ${getLeadershipMode()}`);
    document.getElementById("modeBadge").textContent = `Mode: ${getLeadershipMode()} | Role: ${currentRole}`;
  }, 500);
  bindEvents();
}

init();

import { memberColumns, memberFieldConfig, roleAccessMembers, memberModuleTabs } from "./phase6-members-hooks.js";
import {
  clearBaptisms,
  clearFamilies,
  clearMemberDocs,
  clearMembers,
  deleteBaptism,
  deleteFamily,
  deleteMember,
  deleteMemberDoc,
  getBaptisms,
  getFamilies,
  getMemberDocs,
  getMemberFilterOptions,
  getMembers,
  getMode,
  loadAllMembersData,
  logMemberActivityDb,
  saveBaptism,
  saveFamily,
  saveMember,
  saveMemberDoc,
  submitMember,
  approveMember,
  rejectMember,
  requestMemberCorrection,
  restoreMember,
  getCatechism,
  getTalents,
  getTransfers,
  uploadMemberAsset,
} from "./phase6-members-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";
import { normalizePayloadByFieldMap } from "./utils/input-normalization.js";
import { subscribeRealtimeEnterprise } from "./hooks/use-realtime-enterprise.js";

let currentRole = "member";
let page = 1;
const perPage = 6;
let selectedMemberId = null;
let editingMemberId = null;
let loading = true;
let deleteScope = "member";
let activeTab = memberModuleTabs[0];
let stopMembersRealtime = null;

const mini = ["Waumini Cards", "Advanced Table", "Family Tree", "Household", "Spiritual Milestones", "Sacrament Fields", "Restricted Visibility"];

const toast = (m) => {
  const w = document.getElementById("toastWrap");
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = m;
  w.appendChild(t);
  setTimeout(() => t.remove(), 2200);
};
const can = (a) => !!(roleAccessMembers[currentRole] || roleAccessMembers.member)[a];
const canSeeRestricted = () => ["chief_admin", "super_admin", "admin", "askofu_dayosisi"].includes(currentRole);
const canSeeSensitiveContacts = () => ["chief_admin", "super_admin", "admin", "national_admin", "dayosisi_admin"].includes(currentRole);
const age = (dob) => {
  if (!dob) return "-";
  const y = new Date().getFullYear() - new Date(dob).getFullYear();
  return y > 0 ? y : "-";
};
const statusClass = (s) => String(s || "").toLowerCase().replaceAll(" ", "_");
const fromId = (id) => document.getElementById(id);
const tabHashMap = {
  "#members": "Orodha ya Waumini",
  "#profiles": "Member Profiles",
  "#families": "Familia / Households",
  "#baptism": "Taarifa za Ubatizo",
  "#catechism": "Katekisimu / Mafunzo ya Imani",
  "#membership-status": "Membership Status",
  "#talents": "Talents & Gifts",
  "#attendance": "Mahudhurio ya Waumini",
  "#contributions": "Michango ya Waumini",
  "#documents": "Member Documents",
  "#transfers": "Member Transfers",
  "#reports": "Member Reports",
};
const reverseTabHashMap = Object.fromEntries(Object.entries(tabHashMap).map(([k, v]) => [v, k]));

function toCsv(rows, columns) {
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n");
}
function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function downloadExcel(filename, rows, columns) {
  const header = `<tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${String(r[c] ?? "")}</td>`).join("")}</tr>`).join("");
  const html = `<html><body><table>${header}${body}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function printReport(title, rows, columns) {
  const table = `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%"><thead><tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${columns.map((c) => `<td>${String(r[c] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<html><head><title>${title}</title></head><body><h2>${title}</h2>${table}</body></html>`);
  win.document.close();
  win.print();
}

function maskMemberForRole(member) {
  const masked = { ...member };
  if (!canSeeSensitiveContacts()) {
    masked.phone = "RESTRICTED";
    masked.email = "RESTRICTED";
  }
  if (!canSeeRestricted()) {
    masked.family_links = "RESTRICTED";
    masked.restricted_visibility = "RESTRICTED";
    masked.notes = "RESTRICTED";
  }
  return masked;
}

function getScopedMembers() {
  const rows = getMembers();
  const session = (() => {
    try {
      return JSON.parse(localStorage.getItem("kmt_session") || "{}");
    } catch {
      return {};
    }
  })();
  const ownDayosisi = String(session.dayosisi || "").toUpperCase();
  const ownJimbo = String(session.jimbo || "").toUpperCase();
  const ownTawi = String(session.tawi || "").toUpperCase();
  if (currentRole === "super_admin" || currentRole === "chief_admin" || currentRole === "admin" || currentRole === "national_admin") {
    return rows;
  }
  if (currentRole === "dayosisi_admin") return rows.filter((r) => String(r.dayosisi || "").toUpperCase() === ownDayosisi);
  if (currentRole === "jimbo_admin") return rows.filter((r) => String(r.jimbo || "").toUpperCase() === ownJimbo);
  if (currentRole === "tawi_admin") return rows.filter((r) => String(r.branch || "").toUpperCase() === ownTawi);
  return rows.filter((r) => String(r.restricted_visibility || "").toLowerCase() !== "restricted");
}

function syncTabWithHash() {
  const hash = window.location.hash || "#members";
  if (tabHashMap[hash]) activeTab = tabHashMap[hash];
}

function getHierarchyOptions() {
  const rows = getScopedMembers();
  const dayosisi = [...new Set(rows.map((r) => r.dayosisi).filter(Boolean))];
  return {
    dayosisi,
    jimboByDayosisi: Object.fromEntries(dayosisi.map((d) => [d, [...new Set(rows.filter((r) => r.dayosisi === d).map((r) => r.jimbo).filter(Boolean))]])),
    tawiByJimbo: Object.fromEntries([...new Set(rows.map((r) => r.jimbo).filter(Boolean))].map((j) => [j, [...new Set(rows.filter((r) => r.jimbo === j).map((r) => r.branch).filter(Boolean))]])),
  };
}

function renderKpis() {
  const r = getScopedMembers();
  const items = [
    ["Jumla ya Waumini", r.length],
    ["Active", r.filter((x) => x.status === "Active").length],
    ["Wanaume", r.filter((x) => x.gender === "Mwanaume").length],
    ["Wanawake", r.filter((x) => x.gender === "Mwanamke").length],
    ["Vijana", r.filter((x) => String(x.member_type || "").toUpperCase().includes("YOUTH")).length],
    ["Watoto", r.filter((x) => String(x.member_type || "").toUpperCase().includes("CHILD")).length],
    ["Familia Zilizosajiliwa", getFamilies().length],
    ["Baptized", r.filter((x) => x.baptism_status === "Baptized").length],
    ["Catechism Students", r.filter((x) => x.status === "Catechism Student").length],
    ["Waumini Wapya Mwezi Huu", r.filter((x) => String(x.created_at || "").slice(0, 7) === new Date().toISOString().slice(0, 7)).length],
    ["Profiles Incomplete", r.filter((x) => x.profile_status === "Incomplete").length],
    ["Pending Approvals", r.filter((x) => x.approval_status === "Submitted" || x.approval_status === "Under Review").length],
  ];
  document.getElementById("kpiGrid").innerHTML = items.map(([k, v]) => `<article class="kpi"><p>${k}</p><h4>${v}</h4></article>`).join("");
}

function renderTabs() {
  fromId("memberTabs").innerHTML = memberModuleTabs.map((tab) => `<button class="btn ${tab === activeTab ? "gold" : ""}" data-tab="${tab}">${tab}</button>`).join("");
  renderTabPanels();
}

function renderTabPanels() {
  const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
  const showForTab = {
    "Orodha ya Waumini": ["Orodha ya Waumini"],
    "Member Profiles": ["Orodha ya Waumini"],
    "Familia / Households": ["Familia / Households"],
    "Taarifa za Ubatizo": ["Familia / Households"],
    "Katekisimu / Mafunzo ya Imani": ["Katekisimu / Mafunzo ya Imani"],
    "Membership Status": ["Orodha ya Waumini"],
    "Talents & Gifts": ["Katekisimu / Mafunzo ya Imani"],
    "Mahudhurio ya Waumini": ["Orodha ya Waumini"],
    "Michango ya Waumini": ["Orodha ya Waumini"],
    "Member Documents": ["Member Documents"],
    "Member Transfers": ["Member Transfers"],
    "Member Reports": ["Member Reports"],
  };
  const visible = showForTab[activeTab] || ["Orodha ya Waumini"];
  panels.forEach((panel) => {
    const key = panel.getAttribute("data-tab-panel");
    panel.style.display = visible.includes(key) ? "" : "none";
  });
}
function renderMiniCards() {
  document.getElementById("miniCards").innerHTML = mini.map((x) => `<article class="mini-card">${x}</article>`).join("");
}

function renderFilters() {
  const o = getMemberFilterOptions();
  document.getElementById("filtersBar").innerHTML = `
    <input id="f_name" placeholder="Search by name" />
    <input id="f_phone" placeholder="Search by phone" />
    <select id="f_dayosisi"><option value="">Filter by Dayosisi</option>${o.dayosisi.map((v) => `<option>${v}</option>`).join("")}</select>
    <select id="f_jimbo"><option value="">Filter by Jimbo</option>${o.jimbo.map((v) => `<option>${v}</option>`).join("")}</select>
    <select id="f_tawi"><option value="">Filter by Branch</option>${o.tawi.map((v) => `<option>${v}</option>`).join("")}</select>
    <select id="f_gender"><option value="">Filter by gender</option>${o.jinsia.map((v) => `<option>${v}</option>`).join("")}</select>
    <select id="f_baptism"><option value="">Filter by baptism status</option>${o.ubatizo.map((v) => `<option>${v}</option>`).join("")}</select>
    <select id="f_membership"><option value="">Filter by membership category</option>${o.uanachama.map((v) => `<option>${v}</option>`).join("")}</select>
    <button class="btn gold" id="applyFiltersBtn">Apply</button>
  `;
}

function filteredMembers() {
  let r = getScopedMembers();
  const v = (id) => document.getElementById(id)?.value || "";
  const q = v("f_name").toLowerCase();
  if (q) r = r.filter((x) => String(x.full_name || "").toLowerCase().includes(q));
  const p = v("f_phone").toLowerCase();
  if (p) r = r.filter((x) => String(x.phone || "").toLowerCase().includes(p));
  [
    ["f_dayosisi", "dayosisi"],
    ["f_jimbo", "jimbo"],
    ["f_tawi", "branch"],
    ["f_gender", "gender"],
    ["f_baptism", "baptism_status"],
    ["f_membership", "membership_category"],
  ].forEach(([id, key]) => {
    const a = v(id);
    if (a) r = r.filter((x) => x[key] === a);
  });
  return r.map(maskMemberForRole);
}

function renderMembersTable() {
  const labels = {
    id: "ID", full_name: "Jina Kamili", gender: "Jinsia", age: "Umri", phone: "Simu", email: "Email",
    dayosisi: "Dayosisi", jimbo: "Jimbo", branch: "Branch", membership_category: "Category", member_type: "Type", status: "Status",
  };
  const cols = memberColumns.filter((c) => c !== "actions");
  document.getElementById("membersHead").innerHTML = cols.map((c) => `<th>${labels[c]}</th>`).join("") + "<th>Actions</th>";
  const b = document.getElementById("membersBody");
  const cards = document.getElementById("membersCards");
  if (loading) {
    b.innerHTML = `<tr><td colspan="${cols.length + 1}" class="empty">Loading state...</td></tr>`;
    cards.innerHTML = `<div class="member-card">Loading state...</div>`;
    return;
  }
  const rows = filteredMembers();
  if (!rows.length) {
    b.innerHTML = `<tr><td colspan="${cols.length + 1}" class="empty">Empty state: Hakuna waumini.</td></tr>`;
    cards.innerHTML = `<div class="member-card">Empty state: Hakuna waumini.</div>`;
    return;
  }
  const max = Math.max(1, Math.ceil(rows.length / perPage));
  if (page > max) page = max;
  const list = rows.slice((page - 1) * perPage, (page - 1) * perPage + perPage);
  document.getElementById("pageInfo").textContent = `Page ${page}/${max} | Total ${rows.length}`;
  b.innerHTML = list
    .map(
      (r) =>
        `<tr>${cols
          .map((c) => c === "status" ? `<td><span class="status ${statusClass(r.status)}">${r.status}</span></td>` : `<td>${r[c] ?? "-"}</td>`)
          .join("")}<td><button class="btn" data-action="view" data-id="${r.id}">View Profile</button><button class="btn" data-action="edit" data-id="${r.id}">Edit</button><button class="btn" data-action="submit" data-id="${r.id}">Submit</button><button class="btn" data-action="approve" data-id="${r.id}">Approve</button><button class="btn danger" data-action="reject" data-id="${r.id}">Reject</button><button class="btn" data-action="correction" data-id="${r.id}">Correction</button><button class="btn danger" data-action="delete" data-id="${r.id}">Archive</button><button class="btn" data-action="restore" data-id="${r.id}">Restore</button><button class="btn" data-action="photo" data-id="${r.id}">Photo</button></td></tr>`
    )
    .join("");
  cards.innerHTML = list
    .map(
      (r) =>
        `<article class="member-card"><strong>${r.member_photo || "👤"} ${r.full_name}</strong><p>${r.gender} • ${r.age || age(r.dob)}</p><p>${r.dayosisi}/${r.jimbo}/${r.branch}</p><p>${r.phone} • ${r.email || "-"}</p><p><span class="status ${statusClass(r.status)}">${r.status}</span></p><div class="actions"><button class="btn" data-action="view" data-id="${r.id}">View</button><button class="btn" data-action="edit" data-id="${r.id}">Edit</button><button class="btn danger" data-action="delete" data-id="${r.id}">Archive</button></div></article>`
    )
    .join("");
  applyRoleUI();
}

function renderForm(record = null) {
  const form = document.getElementById("memberForm");
  const hierarchy = getHierarchyOptions();
  form.innerHTML = memberFieldConfig
    .map((f) => {
      const val = record?.[f.key] ?? "";
      const full = f.textarea ? "full" : "";
      if (f.key === "dayosisi") return `<div><label>${f.label}</label><select name="dayosisi" id="formDayosisi"><option value="">Chagua Dayosisi</option>${hierarchy.dayosisi.map((d) => `<option ${val === d ? "selected" : ""}>${d}</option>`).join("")}</select></div>`;
      if (f.key === "jimbo") {
        const ds = record?.dayosisi || "";
        const opts = ds ? hierarchy.jimboByDayosisi[ds] || [] : [];
        return `<div><label>${f.label}</label><select name="jimbo" id="formJimbo"><option value="">Chagua Jimbo</option>${opts.map((j) => `<option ${val === j ? "selected" : ""}>${j}</option>`).join("")}</select></div>`;
      }
      if (f.key === "branch") {
        const j = record?.jimbo || "";
        const opts = j ? hierarchy.tawiByJimbo[j] || [] : [];
        return `<div><label>${f.label}</label><select name="branch" id="formTawi"><option value="">Chagua Tawi</option>${opts.map((t) => `<option ${val === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>`;
      }
      if (f.options) return `<div class="${full}"><label>${f.label}</label><select name="${f.key}">${f.options.map((o) => `<option ${val === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>`;
      if (f.type === "date") return `<div class="${full}"><label>${f.label}</label><input type="date" name="${f.key}" value="${val}" /></div>`;
      if (f.textarea) return `<div class="full"><label>${f.label}</label><textarea name="${f.key}">${val}</textarea></div>`;
      return `<div class="${full}"><label>${f.label}</label><input name="${f.key}" value="${val}" placeholder="${f.label}" /></div>`;
    })
    .join("");

  const dayosisiSelect = document.getElementById("formDayosisi");
  const jimboSelect = document.getElementById("formJimbo");
  const tawiSelect = document.getElementById("formTawi");
  dayosisiSelect?.addEventListener("change", () => {
    const opts = hierarchy.jimboByDayosisi[dayosisiSelect.value] || [];
    jimboSelect.innerHTML = `<option value="">Chagua Jimbo</option>${opts.map((j) => `<option>${j}</option>`).join("")}`;
    tawiSelect.innerHTML = `<option value="">Chagua Tawi</option>`;
  });
  jimboSelect?.addEventListener("change", () => {
    const opts = hierarchy.tawiByJimbo[jimboSelect.value] || [];
    tawiSelect.innerHTML = `<option value="">Chagua Tawi</option>${opts.map((t) => `<option>${t}</option>`).join("")}`;
  });
}
function validate(payload) {
  for (const f of memberFieldConfig.filter((x) => x.required)) {
    if (!String(payload[f.key] || "").trim()) return `${f.label} inahitajika.`;
  }
  if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) return "Email sio sahihi.";
  return "";
}

function renderProfile(id) {
  const raw = getScopedMembers().find((x) => x.id === id);
  const r = raw ? maskMemberForRole(raw) : null;
  if (!r) return toast("Member not found");
  selectedMemberId = id;
  const restricted = canSeeRestricted() ? `${r.family_links || "-"} | ${r.restricted_visibility || "-"}` : "Hidden";
  const timeline = `
    <p><strong>Approval Timeline:</strong></p>
    <ul>
      <li>Submitted By: ${r.submitted_by || "-"}</li>
      <li>Submitted At: ${r.submitted_at || "-"}</li>
      <li>Approved By: ${r.approved_by || "-"}</li>
      <li>Approved At: ${r.approved_at || "-"}</li>
      <li>Rejected By: ${r.rejected_by || "-"}</li>
      <li>Rejected At: ${r.rejected_at || "-"}</li>
      <li>Review Notes: ${r.reviewed_by || "-"}</li>
    </ul>
  `;
  document.getElementById("profileContent").innerHTML = `<article class="card"><h4>${r.member_photo || "👤"} ${r.full_name}</h4><p><strong>Basic:</strong> ${r.gender}, ${r.age || age(r.dob)} yrs</p><p><strong>Church assignment:</strong> ${r.dayosisi} / ${r.jimbo} / ${r.branch}</p><p><strong>Membership:</strong> ${r.membership_category || "-"} / ${r.member_type || "-"}</p><p><strong>Sacrament:</strong> ${r.baptism_status || "-"} | ${r.catechism_status || "-"} | ${r.communion_status || "-"}</p><p><strong>Family Group:</strong> ${r.family_group || "-"} | <strong>Head:</strong> ${r.household_head || "-"}</p><p><strong>Family Links (restricted):</strong> ${restricted}</p><p><strong>Jumuiya/Departments/Choir:</strong> ${r.jumuiya_joined || "-"} / ${r.departments_serving || "-"} / ${r.choir_membership || "-"}</p><p><strong>Talents:</strong> ${r.talents_gifts || "-"}</p><p><strong>Attendance:</strong> ${r.attendance_summary || "-"}</p><p><strong>Notes:</strong> ${r.notes || "-"}</p><p><span class="status ${statusClass(r.status)}">${r.status}</span> | <span class="status ${statusClass(r.approval_status)}">${r.approval_status || "-"}</span></p>${timeline}</article>`;
  document.getElementById("profileDrawer").classList.add("open");
}

function renderFamilies() {
  document.getElementById("familiesBody").innerHTML = getFamilies()
    .map((r) => `<tr><td>${r.id}</td><td>${r.jina}</td><td>${r.mkuu}</td><td>${r.idadi}</td><td>${r.tawi}</td><td>${r.simu}</td><td><span class="status ${r.status}">${r.status}</span></td><td><button class="btn" data-family-action="view" data-id="${r.id}">View Tree</button><button class="btn danger" data-family-action="delete" data-id="${r.id}">Delete</button></td></tr>`)
    .join("");
}
function renderCatechism() {
  const body = fromId("catechismBody");
  if (!body) return;
  body.innerHTML = getCatechism().map((r) => `<tr><td>${r.muumini}</td><td>${r.darasa}</td><td>${r.teacher}</td><td>${r.start_date}</td><td>${r.completion_date || "-"}</td><td>${r.progress}%</td><td>${r.status}</td><td>${r.certificate}</td><td><button class="btn">Mark Complete</button></td></tr>`).join("");
}
function renderTalents() {
  const body = fromId("talentsBody");
  if (!body) return;
  body.innerHTML = getTalents().map((r) => `<tr><td>${r.muumini}</td><td>${r.talent}</td><td>${r.category}</td><td>${r.ministry_linked}</td><td>${r.skill_level}</td><td>${r.availability}</td><td>${r.status}</td><td><button class="btn">Link</button></td></tr>`).join("");
}
function renderTransfers() {
  const body = fromId("transfersBody");
  if (!body) return;
  body.innerHTML = getTransfers().map((r) => `<tr><td>${r.muumini}</td><td>${r.from_dayosisi}</td><td>${r.from_jimbo}</td><td>${r.from_tawi}</td><td>${r.to_dayosisi}</td><td>${r.to_jimbo}</td><td>${r.to_tawi}</td><td>${r.reason}</td><td>${r.transfer_date}</td><td>${r.approval_status}</td><td><button class="btn">Approve</button></td></tr>`).join("");
}
function renderMemberReports() {
  const body = fromId("memberReportsBody");
  if (!body) return;
  const reports = [
    { name: "Orodha ya Waumini", rows: filteredMembers() },
    { name: "Waumini Active", rows: filteredMembers().filter((r) => r.status === "Active") },
    { name: "Waliobatizwa", rows: filteredMembers().filter((r) => r.baptism_status === "Baptized") },
    { name: "Profiles Incomplete", rows: filteredMembers().filter((r) => r.profile_status === "Incomplete") },
    { name: "Pending Approvals", rows: filteredMembers().filter((r) => r.approval_status === "Submitted" || r.approval_status === "Under Review") },
    { name: "Member Transfers", rows: getTransfers() },
  ];
  body.innerHTML = reports
    .map((r, i) => `<tr><td>${r.name}</td><td><button class="btn" data-report-action="csv" data-id="${i}">CSV</button></td><td><button class="btn" data-report-action="excel" data-id="${i}">Excel</button></td><td><button class="btn" data-report-action="pdf" data-id="${i}">PDF</button></td></tr>`)
    .join("");
  body.dataset.reportPayload = JSON.stringify(reports.map((r) => ({ name: r.name, rows: r.rows })));
}
function renderBaptisms() {
  document.getElementById("baptismBody").innerHTML = getBaptisms()
    .map((r) => `<tr><td>${r.muumini}</td><td>${r.tarehe}</td><td>${r.mahali}</td><td>${r.mchungaji}</td><td>${r.cert}</td><td><span class="status active">${r.status}</span></td><td><button class="btn" data-baptism-action="upload" data-id="${r.id}">Upload Certificate</button><button class="btn" data-baptism-action="print" data-id="${r.id}">Print</button><button class="btn danger" data-baptism-action="delete" data-id="${r.id}">Delete</button></td></tr>`)
    .join("");
}
function renderDocs() {
  document.getElementById("docsBody").innerHTML = getMemberDocs()
    .map((r) => `<tr><td>${r.muumini}</td><td>${r.aina}</td><td>${r.file}</td><td>${r.uploaded}</td><td>${r.visibility}</td><td><button class="btn" data-doc-action="view" data-id="${r.id}">View</button><button class="btn" data-doc-action="download" data-id="${r.id}">Download</button><button class="btn danger" data-doc-action="delete" data-id="${r.id}">Delete</button></td></tr>`)
    .join("");
}

function requestDelete(scope, id) {
  deleteScope = scope;
  selectedMemberId = id ?? selectedMemberId;
  document.getElementById("confirmTitle").textContent =
    scope === "member" ? "Archive Member" : scope === "family" ? "Delete Family" : scope === "baptism" ? "Delete Baptism Record" : "Delete Document";
  document.getElementById("confirmModal").classList.add("open");
}
function applyRoleUI() {
  document.querySelectorAll('[data-action="add"],[data-action="edit"],[data-action="delete"],[data-action="clear"],[data-action="export"],[data-action="print"],[data-action="photo"],[data-action="submit"],[data-action="approve"],[data-action="reject"],[data-action="correction"],[data-action="restore"]').forEach((b) => {
    const a = b.getAttribute("data-action");
    const map = { photo: "upload", delete: "archive" };
    const ok = can(map[a] || a);
    b.disabled = !ok;
  });
}

function bind() {
  document.getElementById("topActions").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const a = t.getAttribute("data-action");
    if (!a) return;
    if (!can(a)) return toast("Huna ruhusa ya action hii.");
    if (a === "add") {
      editingMemberId = null;
      document.getElementById("memberModalTitle").textContent = "Add Member";
      renderForm();
      document.getElementById("memberModal").classList.add("open");
    }
    if (a === "clear") clearMembers().then(() => refresh());
    if (a === "export") {
      const rows = filteredMembers();
      const columns = ["id", "full_name", "gender", "phone", "email", "dayosisi", "jimbo", "branch", "status", "approval_status"];
      const csv = toCsv(rows, columns);
      downloadCsv("kmkt-members.csv", csv);
      downloadExcel("kmkt-members.xls", rows, columns);
      printReport("KMK(T) Members Report", rows, columns);
      toast("Members exported (CSV/Excel/PDF).");
    }
    if (a === "print") window.print();
  });

  document.getElementById("filtersBar").addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof HTMLElement && t.id === "applyFiltersBtn") {
      page = 1;
      renderMembersTable();
    }
  });
  document.getElementById("filtersBar").addEventListener("input", () => {
    page = 1;
    renderMembersTable();
  });
  document.getElementById("filtersBar").addEventListener("change", () => {
    page = 1;
    renderMembersTable();
  });

  const memberAction = (t) => {
    const a = t.getAttribute("data-action");
    const id = Number(t.getAttribute("data-id"));
    if (!a) return;
    if (["edit", "delete", "add", "clear", "export", "print", "submit", "approve", "reject", "correction", "restore"].includes(a) && !can(a === "delete" ? "archive" : a)) return toast("Huna ruhusa ya action hii.");
    if (a === "view" && id) renderProfile(id);
    if (a === "edit" && id) {
      const r = getScopedMembers().find((x) => x.id === id);
      if (!r) return;
      editingMemberId = id;
      renderForm(r);
      document.getElementById("memberModalTitle").textContent = "Edit Member";
      document.getElementById("memberModal").classList.add("open");
    }
    if (a === "delete" && id) requestDelete("member", id);
    if (a === "restore" && id) restoreMember(id, currentRole).then(() => { refresh(); toast("Member restored."); });
    if (a === "submit" && id) submitMember(id, currentRole).then(() => { refresh(); toast("Member submitted."); });
    if (a === "approve" && id) approveMember(id, currentRole).then(() => { refresh(); toast("Member approved."); });
    if (a === "reject" && id) rejectMember(id, currentRole).then(() => { refresh(); toast("Member rejected."); });
    if (a === "correction" && id) requestMemberCorrection(id, currentRole).then(() => { refresh(); toast("Correction requested."); });
    if (a === "photo" && id) {
      selectedMemberId = id;
      document.getElementById("memberPhotoInput").click();
    }
  };
  document.getElementById("membersBody").addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof HTMLElement) memberAction(t);
  });
  document.getElementById("membersCards").addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof HTMLElement) memberAction(t);
  });

  document.getElementById("saveMemberBtn").addEventListener("click", (e) => {
    e.preventDefault();
    const fd = new FormData(document.getElementById("memberForm"));
    const p = normalizePayloadByFieldMap(Object.fromEntries(fd.entries()), {
      email: { preserveCase: true },
      notes: { preserveCase: true },
      custom_section: { preserveCase: true },
      attendance_summary: { preserveCase: true },
    });
    p.full_name = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    p.age = Number(age(p.dob));
    p.profile_status = p.profile_status || "Incomplete";
    p.approval_status = p.approval_status || "Draft";
    const err = validate(p);
    document.getElementById("memberFormError").textContent = err;
    if (err) return;
    saveMember(p, editingMemberId)
      .then(async () => {
        document.getElementById("memberModal").classList.remove("open");
        await logMemberActivityDb(currentRole, editingMemberId ? "edit" : "add", p.full_name, p);
        refresh();
        toast("Member saved.");
      })
      .catch((er) => (document.getElementById("memberFormError").textContent = `Save failed: ${er.message || er}`));
  });
  document.getElementById("cancelMemberBtn").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("memberModal").classList.remove("open");
  });

  document.getElementById("confirmDeleteBtn").addEventListener("click", () => {
    if (deleteScope === "member") return deleteMember(selectedMemberId).then(() => { document.getElementById("confirmModal").classList.remove("open"); refresh(); });
    if (deleteScope === "family") return deleteFamily(selectedMemberId).then(() => { document.getElementById("confirmModal").classList.remove("open"); renderFamilies(); });
    if (deleteScope === "baptism") return deleteBaptism(selectedMemberId).then(() => { document.getElementById("confirmModal").classList.remove("open"); renderBaptisms(); });
    if (deleteScope === "doc") return deleteMemberDoc(selectedMemberId).then(() => { document.getElementById("confirmModal").classList.remove("open"); renderDocs(); });
  });
  document.getElementById("cancelDeleteBtn").addEventListener("click", () => document.getElementById("confirmModal").classList.remove("open"));

  document.getElementById("closeDrawerBtn").addEventListener("click", () => document.getElementById("profileDrawer").classList.remove("open"));
  document.getElementById("profileEditBtn").addEventListener("click", () => {
    if (!can("edit")) return toast("Huna ruhusa ya edit.");
    const r = getScopedMembers().find((x) => x.id === selectedMemberId);
    if (!r) return;
    editingMemberId = selectedMemberId;
    renderForm(r);
    document.getElementById("memberModal").classList.add("open");
  });
  document.getElementById("profileDeleteBtn").addEventListener("click", () => {
    if (!can("delete")) return toast("Huna ruhusa ya delete.");
    requestDelete("member", selectedMemberId);
  });
  document.getElementById("profilePrintBtn").addEventListener("click", () => window.print());
  document.getElementById("profileExportBtn").addEventListener("click", () => {
    const r = getScopedMembers().find((x) => x.id === selectedMemberId);
    if (!r) return;
    downloadCsv(`member-card-${selectedMemberId}.csv`, toCsv([r], ["full_name", "gender", "phone", "dayosisi", "jimbo", "branch", "status"]));
  });
  document.getElementById("profileUploadBtn").addEventListener("click", () => {
    if (!can("upload")) return toast("Huna ruhusa ya upload.");
    document.getElementById("memberDocInput").click();
  });
  document.getElementById("prevBtn").addEventListener("click", () => {
    page = Math.max(1, page - 1);
    renderMembersTable();
  });
  document.getElementById("nextBtn").addEventListener("click", () => {
    page += 1;
    renderMembersTable();
  });

  document.querySelector('[data-family="add"]').addEventListener("click", () => saveFamily({ jina: "Familia Mpya", mkuu: "-", idadi: 1, tawi: "-", simu: "-", status: "active", members: [] }).then(() => renderFamilies()));
  document.querySelector('[data-family="clear"]').addEventListener("click", () => clearFamilies().then(() => renderFamilies()));
  document.querySelector('[data-family="export"]').addEventListener("click", () => downloadCsv("kmkt-member-families.csv", toCsv(getFamilies(), ["id", "jina", "mkuu", "idadi", "tawi", "simu", "status"])));
  document.getElementById("familiesBody").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const id = Number(t.getAttribute("data-id"));
    const a = t.getAttribute("data-family-action");
    if (!id || !a) return;
    if (a === "delete") requestDelete("family", id);
    if (a === "view") {
      const fam = getFamilies().find((f) => f.id === id);
      toast(`Household tree: ${(fam?.members || []).join(" -> ") || "No links"}`);
    }
  });

  document.querySelector('[data-baptism="add"]').addEventListener("click", () => saveBaptism({ muumini: "New Member", tarehe: new Date().toISOString().slice(0, 10), mahali: "-", mchungaji: "-", cert: `BPT-${Date.now()}`, status: "verified" }).then(() => renderBaptisms()));
  document.querySelector('[data-baptism="clear"]').addEventListener("click", () => clearBaptisms().then(() => renderBaptisms()));
  document.getElementById("baptismBody").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const id = Number(t.getAttribute("data-id"));
    const a = t.getAttribute("data-baptism-action");
    if (!id || !a) return;
    if (a === "delete") requestDelete("baptism", id);
    if (a === "upload") document.getElementById("memberDocInput").click();
    if (a === "print") window.print();
  });

  document.querySelector('[data-doc="upload"]').addEventListener("click", () => document.getElementById("memberDocInput").click());
  fromId("memberTabs").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const tab = t.getAttribute("data-tab");
    if (!tab) return;
    activeTab = tab;
    window.location.hash = reverseTabHashMap[tab] || "#members";
    renderTabs();
  });
  document.querySelector('[data-doc="clear"]').addEventListener("click", () => clearMemberDocs().then(() => renderDocs()));
  fromId("memberReportsBody").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const action = t.getAttribute("data-report-action");
    const id = Number(t.getAttribute("data-id"));
    if (!action || Number.isNaN(id)) return;
    const payload = JSON.parse(fromId("memberReportsBody").dataset.reportPayload || "[]");
    const report = payload[id];
    if (!report || !report.rows?.length) return toast("Hakuna data kwa report hii.");
    const columns = Object.keys(report.rows[0]);
    if (action === "csv") downloadCsv(`${report.name}.csv`, toCsv(report.rows, columns));
    if (action === "excel") downloadExcel(`${report.name}.xls`, report.rows, columns);
    if (action === "pdf") printReport(report.name, report.rows, columns);
    toast(`Report ${action.toUpperCase()} generated.`);
  });
  document.querySelector('[data-report="exportAll"]')?.addEventListener("click", () => {
    const rows = filteredMembers();
    if (!rows.length) return toast("Hakuna data ya report.");
    const columns = Object.keys(rows[0]);
    downloadCsv("member-reports-all.csv", toCsv(rows, columns));
    toast("All reports exported.");
  });
  document.getElementById("docsBody").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const id = Number(t.getAttribute("data-id"));
    const a = t.getAttribute("data-doc-action");
    if (!id || !a) return;
    if (a === "delete") requestDelete("doc", id);
    if (a === "view") toast("View doc placeholder.");
    if (a === "download") toast("Download doc placeholder.");
  });

  document.getElementById("memberPhotoInput").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { url } = await uploadMemberAsset(f, "photos");
      if (selectedMemberId) {
        const r = getMembers().find((x) => x.id === selectedMemberId);
        if (r) await saveMember({ ...r, member_photo: "🖼️", notes: `${r.notes || ""}\nPhoto:${url}` }, selectedMemberId);
      }
      renderMembersTable();
      toast("Photo uploaded.");
    } catch (err) {
      toast(`Upload failed: ${err.message || err}`);
    } finally {
      e.target.value = "";
    }
  });
  document.getElementById("memberDocInput").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { url } = await uploadMemberAsset(f, "documents");
      const m = getScopedMembers().find((x) => x.id === selectedMemberId);
      await saveMemberDoc({ muumini: m?.full_name || "Unknown", aina: "Member File", file: f.name, uploaded: new Date().toISOString().slice(0, 10), visibility: "restricted", file_url: url });
      renderDocs();
      toast("Document uploaded.");
    } catch (err) {
      toast(`Upload failed: ${err.message || err}`);
    } finally {
      e.target.value = "";
    }
  });
}

function appendMetaButtons() {
  const top = document.getElementById("topActions");
  [
    "Add Membership Category",
    "Add Member Type",
    "Add Spiritual Milestone",
    "Add Sacrament Field",
    "Add Custom Field",
    "Add Custom Section",
    "Add Family Group",
    "Add Household Head",
    "Link family members",
  ].forEach((label) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = label;
    btn.type = "button";
    btn.addEventListener("click", () => toast(`${label} action ready.`));
    top.appendChild(btn);
  });
}

function refresh() {
  renderKpis();
  renderTabs();
  renderMiniCards();
  renderFilters();
  renderMembersTable();
  renderFamilies();
  renderBaptisms();
  renderDocs();
  renderCatechism();
  renderTalents();
  renderTransfers();
  renderMemberReports();
}

async function init() {
  installGlobalCrashGuards("phase6_members");
  try {
    const s = JSON.parse(localStorage.getItem("kmt_session") || "{}");
    currentRole = s.role || "member";
  } catch {
    currentRole = "member";
  }
  try {
    await loadAllMembersData();
  } catch (err) {
    toast(`Data fallback: ${err.message || err}`);
  }
  syncTabWithHash();
  refresh();
  appendMetaButtons();
  setTimeout(() => {
    loading = false;
    renderMembersTable();
    document.getElementById("modeBadge").textContent = `Mode: ${getMode()} | Role: ${currentRole}`;
  }, 300);
  bind();
  if (stopMembersRealtime) stopMembersRealtime();
  stopMembersRealtime = subscribeRealtimeEnterprise((event) => {
    if (!event || event.module !== "members") return;
    refresh();
  });
  window.addEventListener("hashchange", () => {
    syncTabWithHash();
    refresh();
  });
}
init();

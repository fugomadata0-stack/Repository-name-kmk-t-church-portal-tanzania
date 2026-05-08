import { attendanceRoleAccess, serviceFields, genericAttendanceFields } from "./phase9-attendance-hooks.js";
import {
  loadAttendanceData, getMode, getServices, getMeetings, getMinistries, getEvents, getCamps, getCheckins,
  saveService, saveMeeting, saveMinistryAttendance, saveEventAttendance, saveCampAttendance, saveCheckin,
  deleteService, deleteMeeting, deleteMinistryAttendance, deleteEventAttendance, deleteCampAttendance, deleteCheckin,
  clearServices, clearMeetings, clearMinistriesAttendance, clearEventsAttendance, clearCampsAttendance, clearCheckins,
  filterMeta, logAttendanceActivity,
} from "./phase9-attendance-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";

const el = (id) => document.getElementById(id);
let currentRole = localStorage.getItem("mock_role") || "admin";
const scope = { dayosisi: localStorage.getItem("mock_dayosisi") || "", tawi: localStorage.getItem("mock_tawi") || "" };
let filters = { search: "", dayosisi: "", jimbo: "", tawi: "", type: "", from: "", to: "", status: "" };
let formMeta = { type: "", id: null };
let deleteMeta = { type: "", id: null };
const can = (a) => !!(attendanceRoleAccess[currentRole] || attendanceRoleAccess.member)[a];
const toast = (m) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; el("toastWrap").appendChild(d); setTimeout(() => d.remove(), 2500); };
const badge = (s) => `<span class="status ${String(s || "").toLowerCase()}">${s || "-"}</span>`;
const csv = (rows) => { if (!rows.length) return ""; const k = Object.keys(rows[0]); return [k.join(","), ...rows.map((r) => k.map((x) => `"${String(r[x] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n"); };
const download = (name, rows) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv" })); a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(a.href); };

function inScope(r) {
  if (currentRole === "super_admin" || currentRole === "admin") return true;
  if (currentRole === "askofu_dayosisi") return !scope.dayosisi || r.dayosisi === scope.dayosisi;
  if (currentRole === "mchungaji") return !scope.tawi || r.tawi === scope.tawi;
  if (currentRole === "member") return r.status !== "closed";
  return true;
}
function matches(r) {
  const dt = r.tarehe || "";
  return (!filters.search || `${r.tawi || ""} ${r.item || ""} ${r.aina_ibada || r.aina || ""}`.toLowerCase().includes(filters.search.toLowerCase()))
    && (!filters.dayosisi || r.dayosisi === filters.dayosisi)
    && (!filters.jimbo || r.jimbo === filters.jimbo)
    && (!filters.tawi || r.tawi === filters.tawi)
    && (!filters.type || (r.aina_ibada || r.aina) === filters.type)
    && (!filters.status || r.status === filters.status)
    && (!filters.from || dt >= filters.from)
    && (!filters.to || dt <= filters.to);
}

function sparkline(points) {
  const max = Math.max(...points, 1);
  const step = 90 / (points.length - 1 || 1);
  const d = points.map((p, i) => `${i * step},${30 - (p / max) * 24}`).join(" ");
  return `<svg class="trend" viewBox="0 0 90 30"><polyline points="${d}" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="2"/></svg>`;
}

function renderKpis() {
  const s = getServices().filter(inScope); const m = getMeetings().filter(inScope); const n = getMinistries().filter(inScope); const e = getEvents().filter(inScope); const c = getCamps().filter(inScope);
  const all = [...s, ...m, ...n, ...e, ...c];
  const today = new Date().toISOString().slice(0, 10);
  const todayTotal = all.filter((x) => x.tarehe === today).reduce((acc, x) => acc + (Number(x.present || x.waliopo) || 0), 0);
  const weekTotal = all.slice(0, 7).reduce((acc, x) => acc + (Number(x.present || x.waliopo) || 0), 0);
  const monthTotal = all.reduce((acc, x) => acc + (Number(x.present || x.waliopo) || 0), 0);
  const absent = all.reduce((acc, x) => acc + (Number(x.absent || x.waliokosekana) || 0), 0);
  const rate = Math.round(all.reduce((acc, x) => acc + parseInt(String(x.rate || "0"), 10), 0) / Math.max(all.length, 1));
  const blocks = [
    ["k1", "Mahudhurio Leo", todayTotal, "📅", [7, 11, 9, 13, 15, 14]],
    ["k2", "Mahudhurio ya Wiki", weekTotal, "🗓️", [9, 12, 15, 13, 14, 18]],
    ["k3", "Mahudhurio ya Mwezi", monthTotal, "📈", [62, 70, 68, 74, 80, 84]],
    ["k4", "Ibada Zilizorekodiwa", s.length, "⛪", [3, 4, 4, 5, 5, 6]],
    ["k5", "Jumla ya Mikutano", m.length, "👥", [2, 3, 2, 4, 5, 5]],
    ["k6", "Attendance Rate", `${rate}%`, "✅", [70, 74, 78, 80, 82, rate]],
    ["k7", "Waliokosekana", absent, "⚠️", [30, 29, 26, 24, 22, 20]],
    ["k8", "Trend ya Ukuaji", `${Math.max(rate - 72, 0)}%`, "🚀", [2, 4, 6, 8, 10, 12]],
  ];
  el("kpiGrid").innerHTML = blocks.map(([klass, label, value, icon, tr]) => `<article class="kpi ${klass}"><div class="icon">${icon}</div><p>${label}</p><h3>${value}</h3>${sparkline(tr)}</article>`).join("");
}

function renderFilters() {
  const f = filterMeta();
  const sel = (k, label, arr) => `<label>${label}<select data-filter="${k}"><option value="">All</option>${arr.map((x) => `<option ${filters[k] === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>`;
  el("filtersBar").innerHTML = `<label>Search by branch or event<input data-filter="search" value="${filters.search}" /></label>${sel("dayosisi","Dayosisi",f.dayosisi)}${sel("jimbo","Jimbo",f.jimbo)}${sel("tawi","Tawi",f.tawi)}${sel("type","Type",f.type)}<label>Date From<input type="date" data-filter="from" value="${filters.from}" /></label><label>Date To<input type="date" data-filter="to" value="${filters.to}" /></label>${sel("status","Status",f.status)}`;
}

function actionButtons(type, id) {
  const mark = type === "service" ? `<button class="btn tiny" data-row="${type}" data-a="markPresent" data-id="${id}" ${can("mark") ? "" : "disabled"}>Mark Present</button><button class="btn tiny" data-row="${type}" data-a="markAbsent" data-id="${id}" ${can("mark") ? "" : "disabled"}>Mark Absent</button>` : `<button class="btn tiny" data-row="${type}" data-a="mark" data-id="${id}" ${can("mark") ? "" : "disabled"}>Mark Attendance</button>`;
  return `<button class="btn tiny" data-row="${type}" data-a="view" data-id="${id}">View</button><button class="btn tiny" data-row="${type}" data-a="edit" data-id="${id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny danger" data-row="${type}" data-a="delete" data-id="${id}" ${can("delete") ? "" : "disabled"}>Delete</button>${mark}`;
}

function renderTables() {
  const serviceRows = getServices().filter((r) => inScope(r) && matches(r));
  el("serviceBody").innerHTML = serviceRows.map((r) => `<tr><td>${r.id}</td><td>${r.tarehe}</td><td>${r.aina_ibada}</td><td>${r.dayosisi}</td><td>${r.jimbo}</td><td>${r.tawi}</td><td>${r.msimamizi}</td><td>${r.waliopo || r.present || 0}</td><td>${r.waliokosekana || r.absent || 0}</td><td>${r.rate}</td><td>${badge(r.status)}</td><td>${actionButtons("service", r.id)}</td></tr>`).join("") || `<tr><td colspan="12">No data</td></tr>`;
  const drawGeneric = (id, rows, type) => {
    el(id).innerHTML = rows.filter((r) => inScope(r) && matches(r)).map((r) => `<tr><td>${r.id}</td><td>${r.tarehe}</td><td>${r.aina}</td><td>${r.item}</td><td>${r.eneo}</td><td>${r.participants}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.rate}</td><td>${badge(r.status)}</td><td>${actionButtons(type, r.id)}</td></tr>`).join("") || `<tr><td colspan="11">No data</td></tr>`;
  };
  drawGeneric("meetingBody", getMeetings(), "meeting");
  drawGeneric("ministryBody", getMinistries(), "ministry");
  drawGeneric("eventBody", getEvents(), "event");
  drawGeneric("campBody", getCamps(), "camp");
  el("checkinBody").innerHTML = getCheckins().map((r) => `<tr><td>${r.jina}</td><td>${r.tawi}</td><td>${r.aina_kikao}</td><td>${r.tarehe}</td><td>${r.muda}</td><td>${badge(r.status)}</td><td>${r.recorded_by}</td><td>${actionButtons("checkin", r.id)}</td></tr>`).join("") || `<tr><td colspan="8">No data</td></tr>`;
}

let chartsReady = false;
function renderCharts() {
  const baseOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#dce8ff" } } }, scales: { x: { ticks: { color: "#c9d8ff" }, grid: { color: "rgba(255,255,255,.08)" } }, y: { ticks: { color: "#c9d8ff" }, grid: { color: "rgba(255,255,255,.08)" } } } };
  const totalsByDayosisi = {};
  getServices().forEach((x) => { totalsByDayosisi[x.dayosisi] = (totalsByDayosisi[x.dayosisi] || 0) + (Number(x.waliopo) || 0); });
  if (chartsReady) return;
  chartsReady = true;
  new Chart(el("chartDayosisi"), { type: "bar", data: { labels: Object.keys(totalsByDayosisi), datasets: [{ label: "Attendance", data: Object.values(totalsByDayosisi), backgroundColor: "#2e83ff" }] }, options: baseOptions });
  new Chart(el("chartWeekly"), { type: "line", data: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], datasets: [{ label: "Weekly", data: [620, 680, 640, 710, 760, 820, 900], borderColor: "#d8b14a", backgroundColor: "#d8b14a33", fill: true }] }, options: baseOptions });
  new Chart(el("chartMonthly"), { type: "line", data: { labels: ["W1", "W2", "W3", "W4"], datasets: [{ label: "Monthly", data: [2300, 2450, 2510, 2700], borderColor: "#20a4f3", backgroundColor: "#20a4f333", fill: true }] }, options: baseOptions });
  new Chart(el("chartEventCamp"), { type: "doughnut", data: { labels: ["Events", "Camps"], datasets: [{ data: [getEvents().length, getCamps().length], backgroundColor: ["#7a5cff", "#31c48d"] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#dce8ff" } } } } });
}

function openForm(type, row = null) {
  formMeta = { type, id: row?.id || null };
  const fields = type === "service" ? serviceFields : type === "checkin" ? [
    { key: "jina", label: "Jina", required: true }, { key: "tawi", label: "Tawi", required: true }, { key: "aina_kikao", label: "Aina ya Kikao", required: true },
    { key: "tarehe", label: "Tarehe", type: "date", required: true }, { key: "muda", label: "Muda", type: "time", required: true }, { key: "status", label: "Status", options: ["present", "absent"], required: true }, { key: "recorded_by", label: "Recorded By", required: true },
  ] : genericAttendanceFields;
  el("formTitle").textContent = `${row ? "Edit" : "Add"} ${type}`;
  el("formBody").innerHTML = fields.map((f) => {
    const v = row?.[f.key] ?? "";
    if (f.options) return `<label>${f.label}<select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    if (f.textarea) return `<label class="full">${f.label}<textarea name="${f.key}">${v}</textarea></label>`;
    return `<label>${f.label}<input type="${f.type || "text"}" name="${f.key}" value="${v}" /></label>`;
  }).join("");
  el("formModal").classList.add("open");
}
function closeForm() { el("formModal").classList.remove("open"); formMeta = { type: "", id: null }; el("formError").textContent = ""; }
function askDelete(type, id) { deleteMeta = { type, id }; el("confirmTitle").textContent = `Delete ${type}`; el("confirmModal").classList.add("open"); }
function closeDelete() { deleteMeta = { type: "", id: null }; el("confirmModal").classList.remove("open"); }

async function saveForm() {
  const data = Object.fromEntries(new FormData(el("formBody")).entries());
  try {
    if (formMeta.type === "service") await saveService(data, formMeta.id);
    if (formMeta.type === "meeting") await saveMeeting(data, formMeta.id);
    if (formMeta.type === "ministry") await saveMinistryAttendance(data, formMeta.id);
    if (formMeta.type === "event") await saveEventAttendance(data, formMeta.id);
    if (formMeta.type === "camp") await saveCampAttendance(data, formMeta.id);
    if (formMeta.type === "checkin") await saveCheckin(data, formMeta.id);
    await logAttendanceActivity(currentRole, formMeta.id ? "edit" : "create", `Saved ${formMeta.type}`, data);
    closeForm(); refresh(); toast("Saved.");
  } catch (e) { toast(e.message || "Save failed."); }
}

async function doDelete() {
  try {
    const { type, id } = deleteMeta;
    if (type === "service") await deleteService(id);
    if (type === "meeting") await deleteMeeting(id);
    if (type === "ministry") await deleteMinistryAttendance(id);
    if (type === "event") await deleteEventAttendance(id);
    if (type === "camp") await deleteCampAttendance(id);
    if (type === "checkin") await deleteCheckin(id);
    await logAttendanceActivity(currentRole, "delete", `Deleted ${type}`, { id });
    closeDelete(); refresh(); toast("Deleted.");
  } catch (e) { toast(e.message || "Delete failed."); }
}

async function markAction(type, id, status) {
  const set = (rows, saver) => {
    const row = rows.find((x) => x.id === id); if (!row) return;
    const update = { ...row, status };
    if (type === "service") {
      if (status === "present") update.waliopo = Number(row.waliopo || row.present || 0) + 1;
      if (status === "absent") update.waliokosekana = Number(row.waliokosekana || row.absent || 0) + 1;
    }
    saver(update, id);
  };
  if (type === "service") set(getServices(), saveService);
  if (type === "meeting") set(getMeetings(), saveMeeting);
  if (type === "ministry") set(getMinistries(), saveMinistryAttendance);
  if (type === "event") set(getEvents(), saveEventAttendance);
  if (type === "camp") set(getCamps(), saveCampAttendance);
  await logAttendanceActivity(currentRole, "mark", `${type} marked ${status}`, { id, status });
  refresh();
}

function refresh() {
  el("modeBadge").textContent = `Data: ${getMode() === "supabase" ? "Supabase" : "Mock"} • Role: ${currentRole}`;
  renderKpis(); renderFilters(); renderTables(); renderCharts();
}

function bind() {
  el("filtersBar").addEventListener("input", (e) => { const k = e.target.dataset.filter; if (!k) return; filters[k] = e.target.value; renderTables(); });
  document.body.addEventListener("click", async (e) => {
    const a = e.target.dataset.action;
    if (!a) return;
    if (a === "addService" && can("add")) openForm("service");
    if (a === "addMeeting" && can("add")) openForm("meeting");
    if (a === "addMinistry" && can("add")) openForm("ministry");
    if (a === "addEvent" && can("add")) openForm("event");
    if (a === "addCamp" && can("add")) openForm("camp");
    if (a === "addCheckin" && can("add")) openForm("checkin");
    if (a === "clearService" && can("clear")) { await clearServices(); refresh(); }
    if (a === "clearMeeting" && can("clear")) { await clearMeetings(); refresh(); }
    if (a === "clearMinistry" && can("clear")) { await clearMinistriesAttendance(); refresh(); }
    if (a === "clearEvent" && can("clear")) { await clearEventsAttendance(); refresh(); }
    if (a === "clearCamp" && can("clear")) { await clearCampsAttendance(); refresh(); }
    if (a === "clearCheckin" && can("clear")) { await clearCheckins(); refresh(); }
    if (a === "exportService" && can("export")) download("service-attendance", getServices());
    if (a === "exportMeeting" && can("export")) download("meeting-attendance", getMeetings());
    if (a === "exportMinistry" && can("export")) download("ministry-attendance", getMinistries());
    if (a === "exportEvent" && can("export")) download("event-attendance", getEvents());
    if (a === "exportCamp" && can("export")) download("camp-attendance", getCamps());
    if (a === "exportCheckin" && can("export")) download("checkin-history", getCheckins());
    if (a === "print" && can("print")) window.print();
  });
  document.body.addEventListener("click", (e) => {
    const type = e.target.dataset.row; const a = e.target.dataset.a; const id = Number(e.target.dataset.id); if (!type || !a) return;
    const rowLookup = type === "service" ? getServices() : type === "meeting" ? getMeetings() : type === "ministry" ? getMinistries() : type === "event" ? getEvents() : type === "camp" ? getCamps() : getCheckins();
    const row = rowLookup.find((x) => x.id === id);
    if (a === "view") toast(`Viewing ${type} #${id}`);
    if (a === "edit" && can("edit") && row) openForm(type, row);
    if (a === "delete" && can("delete")) askDelete(type, id);
    if (a === "markPresent" && can("mark")) markAction(type, id, "present");
    if (a === "markAbsent" && can("mark")) markAction(type, id, "absent");
    if (a === "mark" && can("mark")) markAction(type, id, "recorded");
  });
  el("cancelFormBtn").addEventListener("click", closeForm);
  el("saveFormBtn").addEventListener("click", saveForm);
  el("cancelDeleteBtn").addEventListener("click", closeDelete);
  el("confirmDeleteBtn").addEventListener("click", doDelete);
}

async function init() {
  installGlobalCrashGuards("phase9_attendance");
  await loadAttendanceData();
  refresh();
  bind();
}
init();

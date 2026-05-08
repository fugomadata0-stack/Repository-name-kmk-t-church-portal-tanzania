import { eventCampRoleAccess, eventColumns, campColumns, eventFormFields, campFormFields } from "./phase8-events-hooks.js";
import {
  loadAllEventsData, getMode, getEvents, getCamps, getParticipants, getSpeakers, getBudgets, getAttendance, getMedia,
  getReminders,
  saveEvent, saveCamp, saveParticipant, saveSpeaker, saveBudget, saveAttendance, saveMedia,
  saveReminder,
  deleteEvent, deleteCamp, deleteParticipant, deleteSpeaker, deleteBudget, deleteAttendance, deleteMedia,
  deleteReminder,
  clearEvents, clearCamps, clearParticipants, clearSpeakers, clearBudgets, clearAttendance, clearMedia,
  clearReminders,
  getFiltersMeta, logEventsActivity,
} from "./phase8-events-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";

const el = (id) => document.getElementById(id);
let currentRole = localStorage.getItem("mock_role") || "admin";
const scope = { dayosisi: localStorage.getItem("mock_dayosisi") || "", tawi: localStorage.getItem("mock_tawi") || "" };
let filters = { search: "", dayosisi: "", jimbo: "", tawi: "", type: "", from: "", to: "", status: "", speaker: "" };
let deleteMeta = { scope: "", id: null };
let formMeta = { type: "", id: null };
let miniMeta = { type: "", id: null };
const can = (a) => !!(eventCampRoleAccess[currentRole] || eventCampRoleAccess.member)[a];
const toast = (m) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; el("toastWrap").appendChild(d); setTimeout(() => d.remove(), 2500); };
const badge = (v) => `<span class="status ${String(v || "").toLowerCase()}">${v || "-"}</span>`;
const csv = (rows) => { if (!rows.length) return ""; const k = Object.keys(rows[0]); return [k.join(","), ...rows.map((r) => k.map((x) => `"${String(r[x] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n"); };
const download = (name, rows) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv" })); a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(a.href); };
function inScope(r) {
  if (currentRole === "super_admin" || currentRole === "admin") return true;
  if (currentRole === "askofu_dayosisi") return !scope.dayosisi || r.dayosisi === scope.dayosisi;
  if (currentRole === "mchungaji") return !scope.tawi || r.tawi === scope.tawi;
  if (currentRole === "kiongozi_idara") return r.ministry_related === true || String(r.aina || "").toLowerCase().includes("idara");
  if (currentRole === "member") return ["planned", "active"].includes(r.status);
  return true;
}
function matches(item) {
  const date = item.tarehe || item.kuanza || "";
  return (!filters.search || `${item.jina || ""} ${item.theme || ""}`.toLowerCase().includes(filters.search.toLowerCase()))
    && (!filters.dayosisi || item.dayosisi === filters.dayosisi)
    && (!filters.jimbo || item.jimbo === filters.jimbo)
    && (!filters.tawi || item.tawi === filters.tawi)
    && (!filters.type || (item.aina || "Kambi") === filters.type)
    && (!filters.status || item.status === filters.status)
    && (!filters.from || date >= filters.from)
    && (!filters.to || date <= filters.to)
    && (!filters.speaker || `${item.mhubiri || ""} ${item.mfundishaji || ""} ${item.msimamizi || ""}`.includes(filters.speaker));
}

function renderKpis() {
  const ev = getEvents().filter((r) => inScope(r));
  const ca = getCamps().filter((r) => inScope(r));
  const participants = getParticipants().filter((r) => inScope(r));
  const speakers = getSpeakers().filter((r) => inScope(r));
  const budget = getBudgets().reduce((s, x) => s + (Number(x.planned) || 0), 0);
  el("kpiGrid").innerHTML = [
    ["Matukio Yajayo", ev.filter((x) => x.status === "planned").length], ["Makambi Hai", ca.filter((x) => x.status === "active").length],
    ["Washiriki Waliosajiliwa", participants.length], ["Wahubiri / Wafundishaji", speakers.length],
    ["Bajeti ya Makambi", budget.toLocaleString()], ["Reminders Pending", ev.filter((x) => x.status === "planned").length + ca.filter((x) => x.status === "planned").length],
  ].map(([k, v]) => `<article class="kpi"><p>${k}</p><h3>${v}</h3></article>`).join("");
}

function renderFilters() {
  const m = getFiltersMeta();
  const sel = (k, l, opts) => `<label>${l}<select data-filter="${k}"><option value="">All</option>${opts.map((x) => `<option ${filters[k] === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>`;
  el("filtersBar").innerHTML = `<label>Search by event/camp name<input data-filter="search" value="${filters.search}" /></label>${sel("dayosisi","Dayosisi",m.dayosisi)}${sel("jimbo","Jimbo",m.jimbo)}${sel("tawi","Tawi",m.tawi)}${sel("type","Type",m.type)}<label>Date From<input data-filter="from" type="date" value="${filters.from}" /></label><label>Date To<input data-filter="to" type="date" value="${filters.to}" /></label>${sel("status","Status",m.status)}${sel("speaker","Speaker/Teacher",m.speaker)}`;
}

function renderTables() {
  el("eventsHead").innerHTML = eventColumns.map((c) => `<th>${c === "actions" ? "Actions" : c.toUpperCase()}</th>`).join("");
  const ev = getEvents().filter((r) => inScope(r) && matches(r));
  el("eventsBody").innerHTML = ev.length ? ev.map((r) => `<tr><td>${r.id}</td><td>${r.jina}</td><td>${r.aina}</td><td>${r.dayosisi}</td><td>${r.jimbo}</td><td>${r.tawi}</td><td>${r.tarehe}</td><td>${r.muda || r.muda_kuanza || "-"}</td><td>${r.mahali}</td><td>${r.msimamizi}</td><td>${badge(r.status)}</td><td><button class="btn tiny" data-table="event" data-a="view" data-id="${r.id}">View</button><button class="btn tiny" data-table="event" data-a="edit" data-id="${r.id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny danger" data-table="event" data-a="delete" data-id="${r.id}" ${can("delete") ? "" : "disabled"}>Delete</button><button class="btn tiny" data-table="event" data-a="reminder" data-id="${r.id}" ${can("reminder") ? "" : "disabled"}>Send Reminder</button></td></tr>`).join("") : `<tr><td colspan="12" class="empty">No events.</td></tr>`;

  el("campsHead").innerHTML = campColumns.map((c) => `<th>${c === "actions" ? "Actions" : c.toUpperCase()}</th>`).join("");
  const ca = getCamps().filter((r) => inScope(r) && matches(r));
  el("campsBody").innerHTML = ca.length ? ca.map((r) => `<tr><td>${r.id}</td><td>${r.jina}</td><td>${r.theme}</td><td>${r.andiko}</td><td>${r.dayosisi}</td><td>${r.jimbo}</td><td>${r.mahali}</td><td>${r.kuanza}</td><td>${r.mwisho}</td><td>${r.mhubiri}</td><td>${r.mfundishaji}</td><td>${r.washiriki || 0}</td><td>${Number(r.budget || 0).toLocaleString()}</td><td>${badge(r.status)}</td><td><button class="btn tiny" data-table="camp" data-a="view" data-id="${r.id}">View</button><button class="btn tiny" data-table="camp" data-a="edit" data-id="${r.id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny danger" data-table="camp" data-a="delete" data-id="${r.id}" ${can("delete") ? "" : "disabled"}>Delete</button><button class="btn tiny" data-table="camp" data-a="reminder" data-id="${r.id}" ${can("reminder") ? "" : "disabled"}>Send SMS Reminder</button></td></tr>`).join("") : `<tr><td colspan="15" class="empty">No camps.</td></tr>`;
}

function renderCalendar() {
  const rows = [
    ...getEvents().filter((r) => inScope(r)).map((r) => ({ date: r.tarehe, name: r.jina, type: "event" })),
    ...getCamps().filter((r) => inScope(r)).map((r) => ({ date: r.kuanza, name: r.jina, type: "camp" })),
  ];
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  el("calendarGrid").innerHTML = days.map((d) => {
    const hit = rows.filter((r) => Number((r.date || "").slice(-2)) === d);
    return `<article class="day"><b>${d}</b>${hit.map((h) => `<span class="event-pill ${h.type}">${h.name}</span>`).join("")}</article>`;
  }).join("");
}

function renderCards() {
  const rows = [...getEvents().map((r) => ({ ...r, kind: "Event" })), ...getCamps().map((r) => ({ ...r, kind: "Camp" }))].filter((r) => inScope(r));
  el("cardsGrid").innerHTML = rows.map((r) => `<article class="mini-card"><h4>${r.jina}</h4><p>${r.kind} • ${r.dayosisi}/${r.jimbo}</p><p>${r.tarehe || r.kuanza} @ ${r.mahali}</p><div>${badge(r.status)}</div></article>`).join("");
}

function renderMini() {
  const btns = (scope, id) => `<button class="btn tiny" data-mini-row="${scope}" data-a="view" data-id="${id}">View</button><button class="btn tiny" data-mini-row="${scope}" data-a="edit" data-id="${id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny danger" data-mini-row="${scope}" data-a="delete" data-id="${id}" ${can("delete") ? "" : "disabled"}>Delete</button>`;
  el("participantsBody").innerHTML = getParticipants().filter(inScope).map((r) => `<tr><td>${r.id}</td><td>${r.jina}</td><td>${r.aina}</td><td>${r.item}</td><td>${r.simu}</td><td>${r.tawi}</td><td>${r.registration_date}</td><td>${badge(r.attendance_status)}</td><td>${r.payment_status || "-"}</td><td>${btns("participant", r.id)}</td></tr>`).join("") || `<tr><td colspan="10" class="empty">No rows.</td></tr>`;
  el("speakersBody").innerHTML = getSpeakers().filter(inScope).map((r) => `<tr><td>${r.jina}</td><td>${r.role}</td><td>${r.item}</td><td>${r.simu}</td><td>${r.email}</td><td>${r.topic}</td><td>${r.andiko}</td><td>${badge(r.status)}</td><td>${btns("speaker", r.id)}</td></tr>`).join("") || `<tr><td colspan="9" class="empty">No rows.</td></tr>`;
  el("budgetsBody").innerHTML = getBudgets().filter(inScope).map((r) => `<tr><td>${r.kambi}</td><td>${r.kipengele}</td><td>${r.planned}</td><td>${r.used}</td><td>${r.balance}</td><td>${badge(r.status)}</td><td>${btns("budget", r.id)}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">No rows.</td></tr>`;
  el("attendanceBody").innerHTML = getAttendance().filter(inScope).map((r) => `<tr><td>${r.kambi}</td><td>${r.mshiriki}</td><td>${r.tarehe}</td><td>${badge(r.status)}</td><td>${r.notes || "-"}</td><td>${btns("attendance", r.id)}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">No rows.</td></tr>`;
  el("mediaBody").innerHTML = getMedia().filter(inScope).map((r) => `<tr><td>${r.kambi}</td><td>${r.file_name}</td><td>${r.type}</td><td>${r.uploaded_by}</td><td>${r.date}</td><td>${r.visibility}</td><td>${btns("media", r.id)}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">No rows.</td></tr>`;
}

function renderReports() {
  const camps = getCamps().filter(inScope);
  const totalBudget = getBudgets().reduce((s, x) => s + (Number(x.planned) || 0), 0);
  const used = getBudgets().reduce((s, x) => s + (Number(x.used) || 0), 0);
  el("reportsGrid").innerHTML = [
    ["Camp Reports", camps.length], ["Budget Usage", `${Math.round((used / (totalBudget || 1)) * 100)}%`],
    ["Attendance Marked", getAttendance().filter((r) => r.status === "present").length], ["Media Files", getMedia().length],
  ].map(([k, v]) => `<article class="kpi"><p>${k}</p><h3>${v}</h3></article>`).join("");
}

function refresh() {
  el("modeBadge").textContent = `Data: ${getMode() === "supabase" ? "Supabase" : "Mock"} • Role: ${currentRole}`;
  renderKpis(); renderFilters(); renderTables(); renderCalendar(); renderCards(); renderMini(); renderReports();
}

function openForm(type, record = null) {
  formMeta = { type, id: record?.id || null };
  const config = type === "event" ? eventFormFields : type === "camp" ? campFormFields : [];
  if (!config.length) return;
  el("formTitle").textContent = `${record ? "Edit" : "Add"} ${type}`;
  el("formBody").innerHTML = config.map((f) => {
    const v = record?.[f.key] ?? "";
    if (f.options) return `<label>${f.label}<select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    if (f.textarea) return `<label class="full">${f.label}<textarea name="${f.key}">${v}</textarea></label>`;
    return `<label>${f.label}<input type="${f.type || "text"}" name="${f.key}" value="${v}" /></label>`;
  }).join("");
  el("formModal").classList.add("open");
}
function closeForm() { el("formModal").classList.remove("open"); formMeta = { type: "", id: null }; el("formError").textContent = ""; }
function askDelete(scope, id) { deleteMeta = { scope, id }; el("confirmTitle").textContent = `Delete ${scope}`; el("confirmModal").classList.add("open"); }
function closeDelete() { deleteMeta = { scope: "", id: null }; el("confirmModal").classList.remove("open"); }

async function saveForm() {
  const fd = new FormData(el("formBody")); const payload = Object.fromEntries(fd.entries());
  try {
    if (formMeta.type === "event") await saveEvent(payload, formMeta.id);
    if (formMeta.type === "camp") await saveCamp(payload, formMeta.id);
    await logEventsActivity(currentRole, formMeta.id ? "edit" : "create", `Saved ${formMeta.type}`, payload);
    closeForm(); refresh(); toast("Imehifadhiwa.");
  } catch (e) { toast(e.message || "Imeshindikana kuhifadhi."); }
}

async function doDelete() {
  try {
    const { scope, id } = deleteMeta;
    if (scope === "event") await deleteEvent(id);
    if (scope === "camp") await deleteCamp(id);
    if (scope === "participant") await deleteParticipant(id);
    if (scope === "speaker") await deleteSpeaker(id);
    if (scope === "budget") await deleteBudget(id);
    if (scope === "attendance") await deleteAttendance(id);
    if (scope === "media") await deleteMedia(id);
    if (scope === "reminder") await deleteReminder(id);
    await logEventsActivity(currentRole, "delete", `Deleted ${scope}`, { id });
    closeDelete(); refresh(); toast("Record deleted.");
  } catch (e) { toast(e.message || "Delete failed."); }
}

function bind() {
  el("filtersBar").addEventListener("input", (e) => { const k = e.target.dataset.filter; if (!k) return; filters[k] = e.target.value; renderTables(); renderCards(); renderCalendar(); });
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    const v = b.dataset.view;
    el("tableViewWrap").classList.toggle("hidden", v !== "table");
    el("campsViewWrap").classList.toggle("hidden", v !== "table");
    el("calendarViewWrap").classList.toggle("hidden", v !== "calendar");
    el("cardsViewWrap").classList.toggle("hidden", v !== "cards");
  }));
  document.body.addEventListener("click", async (e) => {
    const a = e.target.dataset.action;
    if (!a) return;
    if (a === "addEvent" && can("add")) openForm("event");
    if (a === "addCamp" && can("add")) openForm("camp");
    if (a === "clearEvents" && can("clear")) { await clearEvents(); refresh(); }
    if (a === "clearCamps" && can("clear")) { await clearCamps(); refresh(); }
    if (a === "exportEvents" && can("export")) download("events", getEvents());
    if (a === "exportCamps" && can("export")) download("camps", getCamps());
    if (a === "print" && can("print")) window.print();
  });
  document.body.addEventListener("click", (e) => {
    const t = e.target.dataset.table; const a = e.target.dataset.a; const id = Number(e.target.dataset.id); if (!t || !a) return;
    const rows = t === "event" ? getEvents() : getCamps(); const row = rows.find((r) => r.id === id); if (!row) return;
    if (a === "view") toast(`Viewing ${row.jina}`);
    if (a === "edit" && can("edit")) openForm(t, row);
    if (a === "delete" && can("delete")) askDelete(t, id);
    if (a === "reminder" && can("reminder")) openMiniForm("reminder", { target_type: t, target_id: String(id), channel: "sms", status: "pending" });
  });
  document.body.addEventListener("click", async (e) => {
    const s = e.target.dataset.mini; if (!s) return;
    if (s === "addParticipant" && can("add")) openMiniForm("participant");
    if (s === "addSpeaker" && can("add")) openMiniForm("speaker");
    if (s === "addBudget" && can("add")) openMiniForm("budget");
    if (s === "addAttendance" && can("add")) openMiniForm("attendance");
    if (s === "addMedia" && can("add")) openMiniForm("media");
    if (s === "clearReminders" && can("clear")) { await clearReminders(); refresh(); }
    if (s === "clearParticipants" && can("clear")) { await clearParticipants(); refresh(); }
    if (s === "clearSpeakers" && can("clear")) { await clearSpeakers(); refresh(); }
    if (s === "clearBudgets" && can("clear")) { await clearBudgets(); refresh(); }
    if (s === "clearAttendance" && can("clear")) { await clearAttendance(); refresh(); }
    if (s === "clearMedia" && can("clear")) { await clearMedia(); refresh(); }
    if (s === "exportParticipants" && can("export")) download("participants", getParticipants());
    if (s === "exportSpeakers" && can("export")) download("speakers", getSpeakers());
    if (s === "exportBudgets" && can("export")) download("budgets", getBudgets());
    if (s === "exportAttendance" && can("export")) download("attendance", getAttendance());
    if (s === "print") window.print();
  });
  document.body.addEventListener("click", (e) => {
    const s = e.target.dataset.miniRow; const a = e.target.dataset.a; const id = Number(e.target.dataset.id); if (!s || !a) return;
    if (a === "view") toast(`Viewing ${s} #${id}`);
    if (a === "edit" && can("edit")) {
      if (s === "participant") openMiniForm("participant", getParticipants().find((x) => x.id === id));
      if (s === "speaker") openMiniForm("speaker", getSpeakers().find((x) => x.id === id));
      if (s === "budget") openMiniForm("budget", getBudgets().find((x) => x.id === id));
      if (s === "attendance") openMiniForm("attendance", getAttendance().find((x) => x.id === id));
      if (s === "media") openMiniForm("media", getMedia().find((x) => x.id === id));
      if (s === "reminder") openMiniForm("reminder", getReminders().find((x) => x.id === id));
    }
    if (a === "delete" && can("delete")) askDelete(s, id);
  });
  el("cancelFormBtn").addEventListener("click", closeForm);
  el("saveFormBtn").addEventListener("click", saveForm);
  el("cancelMiniFormBtn").addEventListener("click", closeMiniForm);
  el("saveMiniFormBtn").addEventListener("click", saveMiniForm);
  el("cancelDeleteBtn").addEventListener("click", closeDelete);
  el("confirmDeleteBtn").addEventListener("click", doDelete);
}

async function init() {
  installGlobalCrashGuards("phase8_events");
  await loadAllEventsData();
  refresh();
  bind();
}
init();

function miniConfig(type) {
  if (type === "participant") return [
    { key: "jina", label: "Jina la Mshiriki", required: true }, { key: "simu", label: "Simu", required: true }, { key: "item", label: "Chagua Tukio / Kambi", required: true },
    { key: "tawi", label: "Tawi", required: true }, { key: "aina", label: "Role / Category", required: true }, { key: "payment_status", label: "Payment Status optional", required: false },
    { key: "attendance_status", label: "Attendance Status", required: true, options: ["pending", "present", "absent"] }, { key: "notes", label: "Notes", textarea: true },
  ];
  if (type === "speaker") return [
    { key: "jina", label: "Jina", required: true }, { key: "role", label: "Role", required: true, options: ["Mhubiri", "Mfundishaji", "Mgeni Rasmi"] }, { key: "item", label: "Tukio / Kambi", required: true },
    { key: "simu", label: "Simu", required: true }, { key: "email", label: "Email", required: false }, { key: "topic", label: "Mada", required: true }, { key: "andiko", label: "Andiko", required: true },
    { key: "notes", label: "Notes", textarea: true }, { key: "status", label: "Status", required: true, options: ["pending", "confirmed", "cancelled"] },
  ];
  if (type === "budget") return [
    { key: "kambi", label: "Kambi", required: true }, { key: "kipengele", label: "Kipengele", required: true }, { key: "planned", label: "Kiasi Kilichopangwa", type: "number", required: true },
    { key: "used", label: "Kiasi Kilichotumika", type: "number", required: true }, { key: "balance", label: "Balance", type: "number", required: true }, { key: "status", label: "Status", options: ["on_track", "overspent", "pending"], required: true },
  ];
  if (type === "attendance") return [
    { key: "kambi", label: "Kambi", required: true }, { key: "mshiriki", label: "Mshiriki", required: true }, { key: "tarehe", label: "Tarehe", type: "date", required: true },
    { key: "status", label: "Status", options: ["present", "absent", "late"], required: true }, { key: "notes", label: "Notes", textarea: true },
  ];
  if (type === "media") return [
    { key: "kambi", label: "Kambi", required: true }, { key: "file_name", label: "File Name", required: true }, { key: "type", label: "Type", required: true }, { key: "uploaded_by", label: "Uploaded By", required: true },
    { key: "date", label: "Date", type: "date", required: true }, { key: "visibility", label: "Visibility", required: true, options: ["private", "public"] },
  ];
  return [
    { key: "target_type", label: "Target Type", required: true, options: ["event", "camp"] }, { key: "target_id", label: "Target ID", required: true }, { key: "channel", label: "Channel", required: true, options: ["sms"] },
    { key: "message", label: "SMS Message", required: true }, { key: "scheduled_for", label: "Scheduled Time", type: "datetime-local", required: true }, { key: "status", label: "Status", required: true, options: ["pending", "sent", "failed"] },
  ];
}

function openMiniForm(type, record = null) {
  miniMeta = { type, id: record?.id || null };
  const cfg = miniConfig(type);
  el("miniFormTitle").textContent = `${record ? "Edit" : "Add"} ${type}`;
  el("miniFormBody").innerHTML = cfg.map((f) => {
    const v = record?.[f.key] ?? "";
    if (f.options) return `<label>${f.label}<select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    if (f.textarea) return `<label class="full">${f.label}<textarea name="${f.key}">${v}</textarea></label>`;
    return `<label>${f.label}<input type="${f.type || "text"}" name="${f.key}" value="${v}" /></label>`;
  }).join("");
  el("miniFormModal").classList.add("open");
}

function closeMiniForm() {
  el("miniFormModal").classList.remove("open");
  miniMeta = { type: "", id: null };
  el("miniFormError").textContent = "";
}

async function saveMiniForm() {
  const cfg = miniConfig(miniMeta.type);
  const fd = new FormData(el("miniFormBody"));
  const payload = Object.fromEntries(fd.entries());
  const req = cfg.find((f) => f.required && !String(payload[f.key] || "").trim());
  if (req) return (el("miniFormError").textContent = `${req.label} inahitajika.`);
  try {
    if (miniMeta.type === "participant") await saveParticipant(payload, miniMeta.id);
    if (miniMeta.type === "speaker") await saveSpeaker(payload, miniMeta.id);
    if (miniMeta.type === "budget") await saveBudget(payload, miniMeta.id);
    if (miniMeta.type === "attendance") await saveAttendance(payload, miniMeta.id);
    if (miniMeta.type === "media") await saveMedia(payload, miniMeta.id);
    if (miniMeta.type === "reminder") await saveReminder({ target_type: payload.target_type, target_id: payload.target_id, channel: payload.channel, payload: { message: payload.message }, scheduled_for: payload.scheduled_for, status: payload.status }, miniMeta.id);
    await logEventsActivity(currentRole, miniMeta.id ? "edit" : "create", `Saved ${miniMeta.type}`, payload);
    closeMiniForm();
    refresh();
    toast("Imehifadhiwa.");
  } catch (error) {
    toast(error.message || "Imeshindikana kuhifadhi.");
  }
}

import { commsRoleAccess, notificationFields } from "./phase13-comms-hooks.js";
import {
  loadCommsData, getMode, getNotifications, getSms, getEmail, getTemplates, getReports, getFailed, getSegments,
  saveNotification, saveSms, saveEmail, saveTemplate,
  deleteNotification, deleteSms, deleteEmail, deleteTemplate,
  clearNotifications, clearSms, clearEmail, clearTemplates, logComms,
} from "./phase13-comms-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";

const el = (id) => document.getElementById(id);
let role = localStorage.getItem("mock_role") || "admin";
let formMeta = { type: "", id: null };
let deleteMeta = { type: "", id: null };
const can = (k) => !!(commsRoleAccess[role] || commsRoleAccess.member)[k];
const toast = (m) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; el("toastWrap").appendChild(d); setTimeout(() => d.remove(), 2500); };
const badge = (s) => `<span class="status ${String(s || "").toLowerCase()}">${s || "-"}</span>`;
const csv = (rows) => { if (!rows.length) return ""; const k = Object.keys(rows[0]); return [k.join(","), ...rows.map((r) => k.map((x) => `"${String(r[x] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n"); };
const download = (n, rows) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv" })); a.download = `${n}.csv`; a.click(); URL.revokeObjectURL(a.href); };

function renderKpis() {
  const n = getNotifications(); const sms = getSms(); const em = getEmail(); const t = getTemplates(); const f = getFailed(); const s = getSegments();
  const today = new Date().toISOString().slice(0, 10);
  const notificationsToday = n.filter((x) => x.scheduled_date === today).length;
  const smsSent = sms.filter((x) => ["sent", "delivered"].includes(x.delivery_status)).reduce((a, x) => a + Number(x.count || 0), 0);
  const emailsSent = em.reduce((a, x) => a + Number(x.sent_count || 0), 0);
  const scheduled = n.filter((x) => x.status === "scheduled").length + sms.filter((x) => x.delivery_status === "scheduled").length + em.filter((x) => x.status === "scheduled").length;
  const fail = f.length;
  const templates = t.length;
  const segments = s.filter((x) => x.status === "active").length;
  const sent = getReports().reduce((a, x) => a + Number(x.sent || 0), 0); const delivered = getReports().reduce((a, x) => a + Number(x.delivered || 0), 0);
  const rate = `${Math.round((delivered / Math.max(sent, 1)) * 100)}%`;
  const data = [["k1", "Notifications Today", notificationsToday], ["k2", "SMS Sent", smsSent], ["k3", "Emails Sent", emailsSent], ["k4", "Scheduled Messages", scheduled], ["k5", "Failed Deliveries", fail], ["k6", "Templates", templates], ["k7", "Active Segments", segments], ["k8", "Delivery Rate", rate]];
  el("kpiGrid").innerHTML = data.map(([k, l, v]) => `<article class="kpi ${k}"><p>${l}</p><h3>${v}</h3></article>`).join("");
}

const rowButtons = (type, id) => `<button class="btn tiny" data-type="${type}" data-a="view" data-id="${id}">View</button><button class="btn tiny" data-type="${type}" data-a="edit" data-id="${id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny" data-type="${type}" data-a="send" data-id="${id}" ${can("send") ? "" : "disabled"}>Send Now</button><button class="btn tiny" data-type="${type}" data-a="schedule" data-id="${id}" ${can("schedule") ? "" : "disabled"}>Schedule</button><button class="btn tiny danger" data-type="${type}" data-a="delete" data-id="${id}" ${can("delete") ? "" : "disabled"}>Delete</button>`;

function renderTables() {
  el("notificationsBody").innerHTML = getNotifications().map((r) => `<tr><td>${r.id}</td><td>${r.title}</td><td>${r.type}</td><td>${r.priority}</td><td>${r.audience}</td><td>${r.scheduled_date}</td><td>${badge(r.status)}</td><td>${r.sent_by}</td><td>${rowButtons("notification", r.id)}</td></tr>`).join("") || `<tr><td colspan="9">No data</td></tr>`;
  el("smsBody").innerHTML = getSms().map((r) => `<tr><td>${r.campaign_name}</td><td>${r.audience}</td><td>${r.message_preview}</td><td>${r.count}</td><td>${r.scheduled_date}</td><td>${badge(r.delivery_status)}</td><td>${r.cost || "-"}</td><td>${rowButtons("sms", r.id)}</td></tr>`).join("") || `<tr><td colspan="8">No data</td></tr>`;
  el("emailBody").innerHTML = getEmail().map((r) => `<tr><td>${r.campaign_name}</td><td>${r.subject}</td><td>${r.audience}</td><td>${r.scheduled_date}</td><td>${r.sent_count}</td><td>${r.open_rate || "-"}</td><td>${badge(r.status)}</td><td>${rowButtons("email", r.id)}</td></tr>`).join("") || `<tr><td colspan="8">No data</td></tr>`;
  el("templateBody").innerHTML = getTemplates().map((r) => `<tr><td>${r.template_name}</td><td>${r.type}</td><td>${r.language}</td><td>${r.audience}</td><td>${r.last_updated}</td><td>${badge(r.status)}</td><td><button class="btn tiny" data-type="template" data-a="preview" data-id="${r.id}">Preview</button><button class="btn tiny" data-type="template" data-a="duplicate" data-id="${r.id}">Duplicate</button><button class="btn tiny" data-type="template" data-a="edit" data-id="${r.id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny danger" data-type="template" data-a="delete" data-id="${r.id}" ${can("delete") ? "" : "disabled"}>Delete</button></td></tr>`).join("") || `<tr><td colspan="7">No data</td></tr>`;
  el("reportBody").innerHTML = getReports().map((r) => `<tr><td>${r.channel}</td><td>${r.sent}</td><td>${r.delivered}</td><td>${r.failed}</td></tr>`).join("") || `<tr><td colspan="4">No data</td></tr>`;
  el("failedBody").innerHTML = getFailed().map((r) => `<tr><td>${r.channel}</td><td>${r.audience}</td><td>${r.reason}</td><td>${r.date}</td></tr>`).join("") || `<tr><td colspan="4">No data</td></tr>`;
  el("segmentsBox").innerHTML = `<h4>Audience Segments</h4>${getSegments().map((s) => `<p>${s.name} • ${s.size} • ${badge(s.status)}</p>`).join("") || "<p>No segments</p>"}`;
}

function openForm(type, row = null) {
  formMeta = { type, id: row?.id || null };
  let fields = [];
  if (type === "notification") fields = notificationFields;
  if (type === "sms") fields = [{ key: "campaign_name", label: "Campaign Name", required: true }, { key: "audience", label: "Audience", required: true }, { key: "message_preview", label: "Message Preview", required: true }, { key: "count", label: "Count", type: "number", required: true }, { key: "scheduled_date", label: "Scheduled Date", type: "date", required: true }, { key: "delivery_status", label: "Delivery Status", options: ["draft", "scheduled", "sent", "failed"], required: true }, { key: "cost", label: "Cost placeholder", required: false }];
  if (type === "email") fields = [{ key: "campaign_name", label: "Campaign Name", required: true }, { key: "subject", label: "Subject", required: true }, { key: "audience", label: "Audience", required: true }, { key: "scheduled_date", label: "Scheduled Date", type: "date", required: true }, { key: "sent_count", label: "Sent Count", type: "number", required: true }, { key: "open_rate", label: "Open Rate placeholder", required: false }, { key: "status", label: "Status", options: ["draft", "scheduled", "sent", "failed"], required: true }];
  if (type === "template") fields = [{ key: "template_name", label: "Template Name", required: true }, { key: "type", label: "Type", required: true }, { key: "language", label: "Language", required: true }, { key: "audience", label: "Audience", required: true }, { key: "last_updated", label: "Last Updated", type: "date", required: true }, { key: "status", label: "Status", options: ["active", "inactive"], required: true }];
  el("formTitle").textContent = `${row ? "Edit" : "Create"} ${type}`;
  el("formBody").innerHTML = fields.map((f) => {
    const v = row?.[f.key] ?? "";
    if (f.options) return `<label>${f.label}<select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    return `<label>${f.label}<input type="${f.type || "text"}" name="${f.key}" value="${v}" /></label>`;
  }).join("");
  el("formModal").classList.add("open");
}
function closeForm() { el("formModal").classList.remove("open"); formMeta = { type: "", id: null }; }
function askDelete(type, id) { deleteMeta = { type, id }; el("confirmTitle").textContent = `Delete ${type}`; el("confirmModal").classList.add("open"); }
function closeDelete() { deleteMeta = { type: "", id: null }; el("confirmModal").classList.remove("open"); }

async function saveForm() {
  const payload = Object.fromEntries(new FormData(el("formBody")).entries());
  try {
    if (formMeta.type === "notification") await saveNotification(payload, formMeta.id);
    if (formMeta.type === "sms") await saveSms(payload, formMeta.id);
    if (formMeta.type === "email") await saveEmail(payload, formMeta.id);
    if (formMeta.type === "template") await saveTemplate(payload, formMeta.id);
    await logComms(role, formMeta.id ? "edit" : "create", `Saved ${formMeta.type}`, payload);
    closeForm(); refresh(); toast("Saved.");
  } catch (e) { toast(e.message || "Save failed"); }
}

async function doDelete() {
  try {
    if (deleteMeta.type === "notification") await deleteNotification(deleteMeta.id);
    if (deleteMeta.type === "sms") await deleteSms(deleteMeta.id);
    if (deleteMeta.type === "email") await deleteEmail(deleteMeta.id);
    if (deleteMeta.type === "template") await deleteTemplate(deleteMeta.id);
    await logComms(role, "delete", `Deleted ${deleteMeta.type}`, { id: deleteMeta.id });
    closeDelete(); refresh(); toast("Deleted.");
  } catch (e) { toast(e.message || "Delete failed"); }
}

async function markSend(type, id, status) {
  const src = type === "notification" ? getNotifications() : type === "sms" ? getSms() : getEmail();
  const row = src.find((x) => x.id === id); if (!row) return;
  if (type === "notification") await saveNotification({ ...row, status }, id);
  if (type === "sms") await saveSms({ ...row, delivery_status: status === "sent" ? "sent" : "scheduled" }, id);
  if (type === "email") await saveEmail({ ...row, status }, id);
  await logComms(role, "send", `${type} -> ${status}`, { id });
  refresh();
}

function bind() {
  document.body.addEventListener("click", async (e) => {
    const a = e.target.dataset.action; if (!a) return;
    if (a === "addNotification" && can("add")) openForm("notification");
    if (a === "addSms" && can("add")) openForm("sms");
    if (a === "addEmail" && can("add")) openForm("email");
    if (a === "addTemplate" && can("add")) openForm("template");
    if (a === "clearNotification" && can("clear")) { await clearNotifications(); refresh(); }
    if (a === "clearSms" && can("clear")) { await clearSms(); refresh(); }
    if (a === "clearEmail" && can("clear")) { await clearEmail(); refresh(); }
    if (a === "clearTemplate" && can("clear")) { await clearTemplates(); refresh(); }
    if (a === "exportNotification" && can("export")) download("notifications", getNotifications());
    if (a === "exportSms" && can("export")) download("sms-campaigns", getSms());
    if (a === "exportEmail" && can("export")) download("email-campaigns", getEmail());
    if (a === "exportTemplate" && can("export")) download("message-templates", getTemplates());
  });
  document.body.addEventListener("click", async (e) => {
    const type = e.target.dataset.type; const a = e.target.dataset.a; const id = Number(e.target.dataset.id); if (!type || !a) return;
    const src = type === "notification" ? getNotifications() : type === "sms" ? getSms() : type === "email" ? getEmail() : getTemplates();
    const row = src.find((x) => x.id === id);
    if (a === "view") toast(`Viewing ${type} #${id}`);
    if (a === "edit" && can("edit") && row) openForm(type, row);
    if (a === "delete" && can("delete")) askDelete(type, id);
    if (a === "send" && can("send")) markSend(type, id, "sent");
    if (a === "schedule" && can("schedule")) markSend(type, id, "scheduled");
    if (a === "preview") toast("Template preview placeholder.");
    if (a === "duplicate" && can("add") && row) { await saveTemplate({ ...row, template_name: `${row.template_name} Copy` }); refresh(); }
  });
  el("cancelFormBtn").addEventListener("click", closeForm);
  el("saveFormBtn").addEventListener("click", saveForm);
  el("cancelDeleteBtn").addEventListener("click", closeDelete);
  el("confirmDeleteBtn").addEventListener("click", doDelete);
}

function refresh() {
  el("modeBadge").textContent = `Data: ${getMode() === "supabase" ? "Supabase" : "Mock"} • Role: ${role}`;
  renderKpis(); renderTables();
}

async function init() {
  installGlobalCrashGuards("phase13_comms");
  try {
    await loadCommsData();
  } catch (_) {
    toast("Supabase load imekwama, inaendelea na local data.");
  }
  refresh();
  bind();
}
init();

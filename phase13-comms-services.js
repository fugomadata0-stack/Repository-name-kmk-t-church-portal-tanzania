import { getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const state = {
  mode: "mock",
  notifications: [{ id: 1, title: "Mkutano wa Viongozi", type: "In-App", priority: "High", audience: "Viongozi", scheduled_date: "2026-04-27", status: "scheduled", sent_by: "Admin" }],
  sms: [{ id: 1, campaign_name: "SMS Pasaka", audience: "Waumini", message_preview: "Karibu ibada ya Pasaka", count: 4200, scheduled_date: "2026-04-28", delivery_status: "scheduled", cost: "TZS 180,000" }],
  email: [{ id: 1, campaign_name: "Wiki ya Maombi", subject: "Ratiba ya wiki ya maombi", audience: "Viongozi", scheduled_date: "2026-04-29", sent_count: 580, open_rate: "56%", status: "sent" }],
  templates: [{ id: 1, template_name: "Template ya Mkutano", type: "SMS", language: "Swahili", audience: "Viongozi", last_updated: "2026-04-26", status: "active" }],
  reports: [{ id: 1, channel: "SMS", sent: 4200, delivered: 4010, failed: 190 }],
  failed: [{ id: 1, channel: "Email", audience: "Waumini", reason: "Invalid address", date: "2026-04-26" }],
  segments: [{ id: 1, name: "Viongozi Dayosisi", size: 480, status: "active" }],
};

const useSupabase = () => !!getSafeSupabase();
export const getMode = () => state.mode;

export async function loadCommsData() {
  if (!useSupabase()) { state.mode = "mock"; return; }
  state.mode = "supabase";
  const s = getSafeSupabase();
  if (!s) { state.mode = "mock"; return; }
  const result = await safeAsync(
    "phase13_load_comms_data",
    async () =>
      Promise.all([
        s.from("notifications").select("*").order("id", { ascending: false }),
        s.from("sms_campaigns").select("*").order("id", { ascending: false }),
        s.from("email_campaigns").select("*").order("id", { ascending: false }),
        s.from("message_templates").select("*").order("id", { ascending: false }),
        s.from("delivery_reports").select("*").order("id", { ascending: false }),
        s.from("notification_logs").select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) { state.mode = "mock"; return; }
  const [n, sms, em, t, r, logs] = result;
  if (!n.error) state.notifications = n.data || [];
  if (!sms.error) state.sms = sms.data || [];
  if (!em.error) state.email = em.data || [];
  if (!t.error) state.templates = t.data || [];
  if (!r.error) state.reports = r.data || [];
  if (!logs.error) state.failed = (logs.data || []).filter((x) => x.status === "failed");
}

function list(k) { return [...state[k]]; }
async function save(k, payload, id = null) {
  if (!useSupabase()) {
    if (id) state[k] = state[k].map((x) => (x.id === id ? { ...x, ...payload } : x));
    else state[k].unshift({ id: Date.now(), ...payload });
    return;
  }
  const table = k === "notifications" ? "notifications" : k === "sms" ? "sms_campaigns" : k === "email" ? "email_campaigns" : k === "templates" ? "message_templates" : "delivery_reports";
  const s = getSafeSupabase();
  if (!s) return;
  const q = id ? s.from(table).update(payload).eq("id", id) : s.from(table).insert(payload);
  const { error } = await q; if (error) throw error; await loadCommsData();
}
async function remove(k, id) {
  if (!useSupabase()) { state[k] = state[k].filter((x) => x.id !== id); return; }
  const table = k === "notifications" ? "notifications" : k === "sms" ? "sms_campaigns" : k === "email" ? "email_campaigns" : "message_templates";
  const s = getSafeSupabase();
  if (!s) return;
  const { error } = await s.from(table).delete().eq("id", id); if (error) throw error; await loadCommsData();
}
async function clear(k) {
  if (!useSupabase()) { state[k] = []; return; }
  const table = k === "notifications" ? "notifications" : k === "sms" ? "sms_campaigns" : k === "email" ? "email_campaigns" : "message_templates";
  const s = getSafeSupabase();
  if (!s) return;
  const { error } = await s.from(table).delete().neq("id", -1); if (error) throw error; await loadCommsData();
}

export const getNotifications = () => list("notifications");
export const getSms = () => list("sms");
export const getEmail = () => list("email");
export const getTemplates = () => list("templates");
export const getReports = () => list("reports");
export const getFailed = () => list("failed");
export const getSegments = () => list("segments");
export const saveNotification = (p, id) => save("notifications", p, id);
export const saveSms = (p, id) => save("sms", p, id);
export const saveEmail = (p, id) => save("email", p, id);
export const saveTemplate = (p, id) => save("templates", p, id);
export const deleteNotification = (id) => remove("notifications", id);
export const deleteSms = (id) => remove("sms", id);
export const deleteEmail = (id) => remove("email", id);
export const deleteTemplate = (id) => remove("templates", id);
export const clearNotifications = () => clear("notifications");
export const clearSms = () => clear("sms");
export const clearEmail = () => clear("email");
export const clearTemplates = () => clear("templates");

export async function logComms(role, action, description, payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync(
    "phase13_log_comms",
    async () => s.from("notification_logs").insert({ actor_role: role, action, description, payload, status: payload.status || "ok" }),
    null
  );
}

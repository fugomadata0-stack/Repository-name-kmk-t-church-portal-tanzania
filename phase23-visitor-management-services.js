import { asArray, getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const weekAgoDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
};
const useSupabase = () => !!getSafeSupabase();

const tables = {
  visitors: "visitors",
  visitorFollowups: "visitor_followups",
  visitorNotes: "visitor_notes",
  visitorSmsLogs: "visitor_sms_logs",
  visitorConversionLogs: "visitor_conversion_logs",
  activityLogs: "activity_logs",
};

const state = {
  visitors: [
    {
      id: 1,
      visitor_name: "Grace Mollel",
      phone: "+255712000111",
      email: "grace.mollel@email.com",
      address: "Njiro, Arusha",
      dayosisi: "Dayosisi ya Arusha",
      jimbo: "Jimbo la Kaskazini",
      tawi: "Tawi la Njiro",
      invited_by: "Asha Mollel",
      source: "Friend",
      visit_date: today(),
      followup_status: "Pending",
      status: "New",
      notes: "Alihudhuria ibada ya asubuhi na ana interest ya Bible class.",
      followup_date: today(),
      visit_count: 1,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 2,
      visitor_name: "Daniel Peter",
      phone: "+255744110220",
      email: "daniel.peter@email.com",
      address: "Mbezi Beach, Dar es Salaam",
      dayosisi: "Dayosisi ya Dar es Salaam",
      jimbo: "Jimbo la Kati",
      tawi: "Tawi la Mikocheni",
      invited_by: "Online Campaign",
      source: "Online",
      visit_date: "2026-04-23",
      followup_status: "In Progress",
      status: "Welcomed",
      notes: "Ameshapokea SMS ya welcome, follow-up call iendelee.",
      followup_date: "2026-04-28",
      visit_count: 2,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 3,
      visitor_name: "Martha Sanga",
      phone: "+255765331299",
      email: "martha.sanga@email.com",
      address: "Iyunga, Mbeya",
      dayosisi: "Dayosisi ya Mbeya",
      jimbo: "Jimbo la Ruanda",
      tawi: "Tawi la Iyunga",
      invited_by: "Outreach Team",
      source: "Outreach",
      visit_date: "2026-04-20",
      followup_status: "Completed",
      status: "Converted",
      notes: "Amejiunga kama muumini mpya baada ya wiki ya follow-up.",
      followup_date: "2026-04-25",
      visit_count: 3,
      created_at: now(),
      updated_at: now(),
    },
  ],
  visitorFollowups: [],
  visitorNotes: [],
  visitorSmsLogs: [],
  visitorConversionLogs: [],
};

function baseVisitorPayload(payload = {}) {
  return {
    visitor_name: payload.visitor_name || "Mgeni mpya",
    phone: payload.phone || "",
    email: payload.email || "",
    address: payload.address || "",
    dayosisi: payload.dayosisi || "Dayosisi ya Taifa",
    jimbo: payload.jimbo || "Jimbo Kuu",
    tawi: payload.tawi || "Tawi Kuu",
    invited_by: payload.invited_by || "",
    source: payload.source || "Other",
    notes: payload.notes || "",
    followup_date: payload.followup_date || today(),
    followup_status: payload.followup_status || "Pending",
    status: payload.status || "New",
    visit_date: payload.visit_date || today(),
    visit_count: payload.visit_count || 1,
    created_at: now(),
    updated_at: now(),
  };
}

async function loadFromSupabase() {
  const s = getSafeSupabase();
  if (!s) return;
  const result = await safeAsync(
    "phase23_load_visitors",
    async () =>
      Promise.all([
        s.from(tables.visitors).select("*").order("id", { ascending: false }),
        s.from(tables.visitorFollowups).select("*").order("id", { ascending: false }),
        s.from(tables.visitorNotes).select("*").order("id", { ascending: false }),
        s.from(tables.visitorSmsLogs).select("*").order("id", { ascending: false }),
        s.from(tables.visitorConversionLogs).select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) return;
  const [visitors, followups, notes, smsLogs, conversionLogs] = result;
  if (!visitors.error) state.visitors = asArray(visitors.data);
  if (!followups.error) state.visitorFollowups = asArray(followups.data);
  if (!notes.error) state.visitorNotes = asArray(notes.data);
  if (!smsLogs.error) state.visitorSmsLogs = asArray(smsLogs.data);
  if (!conversionLogs.error) state.visitorConversionLogs = asArray(conversionLogs.data);
}

async function logActivity(action, payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync(
    "phase23_activity_log",
    async () => s.from(tables.activityLogs).insert({ module: "visitor_management", action, payload, created_at: now() }),
    null
  );
}

export async function loadVisitorManagementData() {
  if (!useSupabase()) return;
  await loadFromSupabase();
}

export const getVisitors = () => [...state.visitors];

export function getKpis() {
  const rows = state.visitors;
  const thisWeekStart = weekAgoDate();
  const todayRows = rows.filter((r) => (r.visit_date || "").slice(0, 10) === today()).length;
  const weekRows = rows.filter((r) => (r.visit_date || "").slice(0, 10) >= thisWeekStart).length;
  const firstTime = rows.filter((r) => Number(r.visit_count || 1) <= 1).length;
  const repeat = rows.filter((r) => Number(r.visit_count || 1) > 1).length;
  const followupsPending = rows.filter((r) => ["Pending", "In Progress"].includes(r.followup_status)).length;
  const converted = rows.filter((r) => String(r.status).toLowerCase().includes("converted")).length;
  const smsSent = state.visitorSmsLogs.length || rows.filter((r) => ["Welcomed", "Converted"].includes(r.status)).length;
  const visitorGrowth = `${Math.max(0, weekRows - firstTime)}+`;
  return { todayRows, weekRows, firstTime, repeat, followupsPending, converted, smsSent, visitorGrowth };
}

export async function addVisitor(payload = {}) {
  const row = { id: Date.now(), ...baseVisitorPayload(payload) };
  state.visitors.unshift(row);
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase23_add_visitor", async () => s.from(tables.visitors).insert(row), null);
    await safeAsync(
      "phase23_add_followup",
      async () =>
        s.from(tables.visitorFollowups).insert({
          visitor_id: row.id,
          visitor_name: row.visitor_name,
          followup_date: row.followup_date,
          followup_status: row.followup_status,
          assigned_to: row.invited_by || "Follow-up Team",
        }),
      null
    );
    await safeAsync(
      "phase23_add_note",
      async () =>
        s.from(tables.visitorNotes).insert({
          visitor_id: row.id,
          note: row.notes,
          created_at: now(),
        }),
      null
    );
  }
  await logActivity("add_visitor", { id: row.id, source: row.source, status: row.status });
}

export async function updateVisitor(id, payload = {}) {
  const row = state.visitors.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  Object.assign(row, payload, { updated_at: now() });
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase23_update_visitor", async () => s.from(tables.visitors).update(payload).eq("id", id), null);
  }
  await logActivity("update_visitor", { id, payload });
}

export async function deleteVisitor(id) {
  state.visitors = state.visitors.filter((x) => Number(x.id) !== Number(id));
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase23_delete_visitor", async () => s.from(tables.visitors).delete().eq("id", id), null);
  }
  await logActivity("delete_visitor", { id });
}

export async function clearVisitors() {
  state.visitors = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase23_clear_visitors", async () => s.from(tables.visitors).delete().neq("id", -1), null);
  }
  await logActivity("clear_visitors", {});
}

export async function sendWelcomeSms(id) {
  const row = state.visitors.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  row.status = row.status === "Converted" ? "Converted" : "Welcomed";
  row.followup_status = row.followup_status === "Completed" ? "Completed" : "In Progress";
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync(
      "phase23_send_sms",
      async () =>
        s.from(tables.visitorSmsLogs).insert({
          visitor_id: id,
          phone: row.phone,
          message: "Karibu sana KMT Church Tanzania. Tunakupenda na tunakukaribisha ibada ijayo.",
          sent_at: now(),
          status: "sent",
        }),
      null
    );
    await safeAsync(
      "phase23_update_status_after_sms",
      async () => s.from(tables.visitors).update({ status: row.status, followup_status: row.followup_status }).eq("id", id),
      null
    );
  } else {
    state.visitorSmsLogs.unshift({ id: Date.now(), visitor_id: id, phone: row.phone, status: "sent", sent_at: now() });
  }
  await logActivity("send_welcome_sms", { id, phone: row.phone });
}

export async function convertToMember(id) {
  const row = state.visitors.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  row.status = "Converted";
  row.followup_status = "Completed";
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync(
      "phase23_convert_member",
      async () => s.from(tables.visitors).update({ status: "Converted", followup_status: "Completed" }).eq("id", id),
      null
    );
    await safeAsync(
      "phase23_conversion_log",
      async () =>
        s.from(tables.visitorConversionLogs).insert({
          visitor_id: id,
          visitor_name: row.visitor_name,
          converted_at: now(),
          converted_by: "Portal Admin",
          notes: "Visitor converted to member after follow-up process.",
        }),
      null
    );
  } else {
    state.visitorConversionLogs.unshift({ id: Date.now(), visitor_id: id, visitor_name: row.visitor_name, converted_at: now() });
  }
  await logActivity("convert_to_member", { id, visitor_name: row.visitor_name });
}

import { getSafeSupabase } from "./phase-integration-core.js";

const state = {
  mode: "mock",
  services: [{ id: 1, tarehe: "2026-04-26", aina_ibada: "Ibada ya Jumapili", dayosisi: "Dar es Salaam", jimbo: "Kati", tawi: "Amani", msimamizi: "Mch. Daniel", waliopo: 420, waliokosekana: 38, rate: "91%", status: "recorded" }],
  meetings: [{ id: 1, tarehe: "2026-04-25", aina: "Mkutano", item: "Kamati ya Uongozi", eneo: "Ukumbi A", participants: 35, present: 31, absent: 4, rate: "89%", status: "recorded" }],
  ministries: [{ id: 1, tarehe: "2026-04-24", aina: "Idara", item: "Vijana", eneo: "Hall B", participants: 120, present: 98, absent: 22, rate: "82%", status: "recorded" }],
  events: [{ id: 1, tarehe: "2026-04-23", aina: "Tukio", item: "Semina ya Ndoa", eneo: "Ukumbi C", participants: 180, present: 160, absent: 20, rate: "89%", status: "recorded" }],
  camps: [{ id: 1, tarehe: "2026-04-22", aina: "Kambi", item: "Kambi ya Vijana", eneo: "Mugango", participants: 300, present: 284, absent: 16, rate: "95%", status: "recorded" }],
  checkins: [{ id: 1, jina: "Neema John", tawi: "Amani", aina_kikao: "Ibada", tarehe: "2026-04-26", muda: "09:10", status: "present", recorded_by: "Admin" }],
};

const useSupabase = () => !!getSafeSupabase();
export const getMode = () => state.mode;

export async function loadAttendanceData() {
  if (!useSupabase()) { state.mode = "mock"; return; }
  state.mode = "supabase";
  const s = getSafeSupabase();
  const [records, items, summaries] = await Promise.all([
    s.from("attendance_records").select("*").order("id", { ascending: false }),
    s.from("attendance_items").select("*").order("id", { ascending: false }),
    s.from("attendance_summaries").select("*").order("id", { ascending: false }),
  ]);
  if (!records.error) {
    const data = records.data || [];
    state.services = data.filter((x) => x.record_type === "service");
    state.meetings = data.filter((x) => x.record_type === "meeting");
    state.ministries = data.filter((x) => x.record_type === "ministry");
    state.events = data.filter((x) => x.record_type === "event");
    state.camps = data.filter((x) => x.record_type === "camp");
  }
  if (!items.error) state.checkins = items.data || [];
  if (!summaries.error && summaries.data?.length) {
    // keep future summaries support; currently derived in UI
  }
}

function list(key) { return [...state[key]]; }
async function saveLocalOrDb(key, payload, editId = null, recordType = null) {
  if (!useSupabase()) {
    if (editId) state[key] = state[key].map((r) => (r.id === editId ? { ...r, ...payload } : r));
    else state[key].unshift({ id: Date.now(), ...payload });
    return;
  }
  const s = getSafeSupabase();
  if (key === "checkins") {
    const q = editId ? s.from("attendance_items").update(payload).eq("id", editId) : s.from("attendance_items").insert(payload);
    const { error } = await q; if (error) throw error; await loadAttendanceData(); return;
  }
  const finalPayload = { ...payload, record_type: recordType };
  const q = editId ? s.from("attendance_records").update(finalPayload).eq("id", editId) : s.from("attendance_records").insert(finalPayload);
  const { error } = await q; if (error) throw error; await loadAttendanceData();
}
async function removeLocalOrDb(key, id) {
  if (!useSupabase()) { state[key] = state[key].filter((r) => r.id !== id); return; }
  const table = key === "checkins" ? "attendance_items" : "attendance_records";
  const { error } = await getSafeSupabase().from(table).delete().eq("id", id); if (error) throw error; await loadAttendanceData();
}
async function clearLocalOrDb(key, recordType = null) {
  if (!useSupabase()) { state[key] = []; return; }
  if (key === "checkins") {
    const { error } = await getSafeSupabase().from("attendance_items").delete().neq("id", -1); if (error) throw error; await loadAttendanceData(); return;
  }
  const { error } = await getSafeSupabase().from("attendance_records").delete().eq("record_type", recordType); if (error) throw error; await loadAttendanceData();
}

export const getServices = () => list("services");
export const getMeetings = () => list("meetings");
export const getMinistries = () => list("ministries");
export const getEvents = () => list("events");
export const getCamps = () => list("camps");
export const getCheckins = () => list("checkins");

export const saveService = (p, id) => saveLocalOrDb("services", p, id, "service");
export const saveMeeting = (p, id) => saveLocalOrDb("meetings", p, id, "meeting");
export const saveMinistryAttendance = (p, id) => saveLocalOrDb("ministries", p, id, "ministry");
export const saveEventAttendance = (p, id) => saveLocalOrDb("events", p, id, "event");
export const saveCampAttendance = (p, id) => saveLocalOrDb("camps", p, id, "camp");
export const saveCheckin = (p, id) => saveLocalOrDb("checkins", p, id);

export const deleteService = (id) => removeLocalOrDb("services", id);
export const deleteMeeting = (id) => removeLocalOrDb("meetings", id);
export const deleteMinistryAttendance = (id) => removeLocalOrDb("ministries", id);
export const deleteEventAttendance = (id) => removeLocalOrDb("events", id);
export const deleteCampAttendance = (id) => removeLocalOrDb("camps", id);
export const deleteCheckin = (id) => removeLocalOrDb("checkins", id);

export const clearServices = () => clearLocalOrDb("services", "service");
export const clearMeetings = () => clearLocalOrDb("meetings", "meeting");
export const clearMinistriesAttendance = () => clearLocalOrDb("ministries", "ministry");
export const clearEventsAttendance = () => clearLocalOrDb("events", "event");
export const clearCampsAttendance = () => clearLocalOrDb("camps", "camp");
export const clearCheckins = () => clearLocalOrDb("checkins");

export function filterMeta() {
  const rows = [...state.services, ...state.meetings, ...state.ministries, ...state.events, ...state.camps];
  return {
    dayosisi: [...new Set(rows.map((r) => r.dayosisi).filter(Boolean))],
    jimbo: [...new Set(rows.map((r) => r.jimbo).filter(Boolean))],
    tawi: [...new Set(rows.map((r) => r.tawi).filter(Boolean))],
    type: [...new Set(rows.map((r) => r.aina_ibada || r.aina).filter(Boolean))],
    status: [...new Set(rows.map((r) => r.status).filter(Boolean))],
  };
}

export async function logAttendanceActivity(role, action, description, payload = {}) {
  if (!useSupabase()) return;
  await getSafeSupabase().from("activity_logs").insert({ actor_role: role, module: "attendance", action, description, payload });
}

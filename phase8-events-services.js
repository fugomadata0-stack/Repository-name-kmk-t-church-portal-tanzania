import { getSafeSupabase } from "./phase-integration-core.js";

const state = {
  mode: "mock",
  events: [{ id: 1, jina: "Mkutano wa Vijana", aina: "Event", dayosisi: "Dar es Salaam", jimbo: "Kati", tawi: "Amani", tarehe: "2026-05-12", muda: "16:00", mahali: "Ukumbi A", msimamizi: "Pastor Peter", status: "planned" }],
  camps: [{ id: 1, jina: "Kambi ya Taifa", theme: "Imani Hai", andiko: "Yoshua 1:9", dayosisi: "Mwanza", jimbo: "Ziwa", tawi: "Neema", mahali: "Mugango", kuanza: "2026-06-10", mwisho: "2026-06-14", mhubiri: "Askofu John", mfundishaji: "Mwl. Paulo", washiriki: 420, budget: 24000000, status: "active" }],
  participants: [{ id: 1, jina: "Neema John", aina: "Kambi", item: "Kambi ya Taifa", simu: "0712333444", tawi: "Neema", registration_date: "2026-04-26", attendance_status: "pending", payment_status: "paid" }],
  speakers: [{ id: 1, jina: "Askofu John", role: "Mhubiri", item: "Kambi ya Taifa", simu: "0712000001", email: "john@kmt.or.tz", topic: "Uamsho", andiko: "Warumi 12:2", status: "confirmed" }],
  budgets: [{ id: 1, kambi: "Kambi ya Taifa", kipengele: "Chakula", planned: 6000000, used: 4200000, balance: 1800000, status: "on_track" }],
  attendance: [{ id: 1, kambi: "Kambi ya Taifa", mshiriki: "Neema John", tarehe: "2026-06-10", status: "present", notes: "-" }],
  media: [{ id: 1, kambi: "Kambi ya Taifa", file_name: "day1-sermon.mp4", type: "video", uploaded_by: "Media Admin", date: "2026-06-10", visibility: "private" }],
  reminders: [{ id: 1, target_type: "event", target_id: "1", channel: "sms", payload: { message: "Kumbusho la mkutano wa vijana" }, status: "pending", scheduled_for: "2026-05-11T08:00:00Z" }],
};

const useSupabase = () => !!getSafeSupabase();
export const getMode = () => state.mode;

export async function loadAllEventsData() {
  if (!useSupabase()) { state.mode = "mock"; return; }
  state.mode = "supabase";
  const s = getSafeSupabase();
  const [events, camps, p, sp, b, a, m, r] = await Promise.all([
    s.from("events").select("*").order("id", { ascending: false }),
    s.from("camps").select("*").order("id", { ascending: false }),
    s.from("camp_participants").select("*").order("id", { ascending: false }),
    s.from("camp_speakers").select("*").order("id", { ascending: false }),
    s.from("camp_budgets").select("*").order("id", { ascending: false }),
    s.from("camp_attendance").select("*").order("id", { ascending: false }),
    s.from("camp_media").select("*").order("id", { ascending: false }),
    s.from("scheduled_messages").select("*").order("id", { ascending: false }),
  ]);
  if (!events.error) state.events = events.data || [];
  if (!camps.error) state.camps = camps.data || [];
  if (!p.error) state.participants = p.data || [];
  if (!sp.error) state.speakers = sp.data || [];
  if (!b.error) state.budgets = b.data || [];
  if (!a.error) state.attendance = a.data || [];
  if (!m.error) state.media = m.data || [];
  if (!r.error) state.reminders = r.data || [];
}

const byKey = {
  events: "events", camps: "camps", participants: "camp_participants", speakers: "camp_speakers",
  budgets: "camp_budgets", attendance: "camp_attendance", media: "camp_media",
  reminders: "scheduled_messages",
};
function list(key) { return [...state[key]]; }
async function save(key, payload, editId = null) {
  if (!useSupabase()) {
    if (editId) state[key] = state[key].map((r) => (r.id === editId ? { ...r, ...payload } : r));
    else state[key].unshift({ id: Date.now(), ...payload });
    return;
  }
  const s = getSafeSupabase();
  const q = editId ? s.from(byKey[key]).update(payload).eq("id", editId) : s.from(byKey[key]).insert(payload);
  const { error } = await q; if (error) throw error; await loadAllEventsData();
}
async function remove(key, id) {
  if (!useSupabase()) { state[key] = state[key].filter((r) => r.id !== id); return; }
  const { error } = await getSafeSupabase().from(byKey[key]).delete().eq("id", id); if (error) throw error; await loadAllEventsData();
}
async function clear(key) {
  if (!useSupabase()) { state[key] = []; return; }
  const { error } = await getSafeSupabase().from(byKey[key]).delete().neq("id", -1); if (error) throw error; await loadAllEventsData();
}

export const getEvents = () => list("events");
export const getCamps = () => list("camps");
export const getParticipants = () => list("participants");
export const getSpeakers = () => list("speakers");
export const getBudgets = () => list("budgets");
export const getAttendance = () => list("attendance");
export const getMedia = () => list("media");
export const getReminders = () => list("reminders");
export const saveEvent = (p, id) => save("events", p, id);
export const saveCamp = (p, id) => save("camps", p, id);
export const saveParticipant = (p, id) => save("participants", p, id);
export const saveSpeaker = (p, id) => save("speakers", p, id);
export const saveBudget = (p, id) => save("budgets", p, id);
export const saveAttendance = (p, id) => save("attendance", p, id);
export const saveMedia = (p, id) => save("media", p, id);
export const saveReminder = (p, id) => save("reminders", p, id);
export const deleteEvent = (id) => remove("events", id);
export const deleteCamp = (id) => remove("camps", id);
export const deleteParticipant = (id) => remove("participants", id);
export const deleteSpeaker = (id) => remove("speakers", id);
export const deleteBudget = (id) => remove("budgets", id);
export const deleteAttendance = (id) => remove("attendance", id);
export const deleteMedia = (id) => remove("media", id);
export const deleteReminder = (id) => remove("reminders", id);
export const clearEvents = () => clear("events");
export const clearCamps = () => clear("camps");
export const clearParticipants = () => clear("participants");
export const clearSpeakers = () => clear("speakers");
export const clearBudgets = () => clear("budgets");
export const clearAttendance = () => clear("attendance");
export const clearMedia = () => clear("media");
export const clearReminders = () => clear("reminders");

export function getFiltersMeta() {
  const items = [...state.events, ...state.camps];
  return {
    dayosisi: [...new Set(items.map((r) => r.dayosisi).filter(Boolean))],
    jimbo: [...new Set(items.map((r) => r.jimbo).filter(Boolean))],
    tawi: [...new Set(items.map((r) => r.tawi).filter(Boolean))],
    type: [...new Set(items.map((r) => r.aina || "Kambi"))],
    status: [...new Set(items.map((r) => r.status).filter(Boolean))],
    speaker: [...new Set(state.speakers.map((r) => r.jina).filter(Boolean))],
  };
}

export async function logEventsActivity(role, action, description, payload = {}) {
  if (!useSupabase()) return;
  await getSafeSupabase().from("activity_logs").insert({ actor_role: role, module: "events_camps", action, description, payload });
}

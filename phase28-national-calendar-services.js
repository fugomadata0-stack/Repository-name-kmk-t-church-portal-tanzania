import { asArray, getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const thisMonth = () => new Date().toISOString().slice(0, 7);
const useSupabase = () => !!getSafeSupabase();

const tables = {
  nationalCalendar: "national_calendar",
  calendarEvents: "calendar_events",
  calendarConflicts: "calendar_conflicts",
  calendarSyncLogs: "calendar_sync_logs",
  calendarReminders: "calendar_reminders",
  activityLogs: "activity_logs",
};

const state = {
  schedules: [
    {
      id: 1,
      title: "Mkutano Mkuu wa Kitaifa",
      type: "National Event",
      scope: "National",
      dayosisi: "All Dayosisi",
      jimbo: "All",
      tawi: "All",
      date: today(),
      time: "09:00",
      status: "Scheduled",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 2,
      title: "Camp ya Vijana - Dayosisi ya Arusha",
      type: "Camp",
      scope: "Dayosisi",
      dayosisi: "Dayosisi ya Arusha",
      jimbo: "Jimbo la Kaskazini",
      tawi: "Tawi la Njiro",
      date: "2026-05-12",
      time: "08:00",
      status: "Pending",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 3,
      title: "Finance Report Deadline",
      type: "Finance Deadline",
      scope: "National",
      dayosisi: "All Dayosisi",
      jimbo: "All",
      tawi: "All",
      date: "2026-05-05",
      time: "17:00",
      status: "Scheduled",
      created_at: now(),
      updated_at: now(),
    },
  ],
  conflicts: [],
  syncLogs: [],
  reminders: [],
};

function baseSchedulePayload(payload = {}) {
  return {
    title: payload.title || "Ratiba mpya",
    type: payload.type || "National Event",
    scope: payload.scope || "National",
    dayosisi: payload.dayosisi || "All Dayosisi",
    jimbo: payload.jimbo || "All",
    tawi: payload.tawi || "All",
    date: payload.date || today(),
    time: payload.time || "09:00",
    status: payload.status || "Scheduled",
    created_at: now(),
    updated_at: now(),
  };
}

async function loadFromSupabase() {
  const s = getSafeSupabase();
  if (!s) return;
  const result = await safeAsync(
    "phase28_load_calendar",
    async () =>
      Promise.all([
        s.from(tables.nationalCalendar).select("*").order("id", { ascending: false }),
        s.from(tables.calendarEvents).select("*").order("id", { ascending: false }),
        s.from(tables.calendarConflicts).select("*").order("id", { ascending: false }),
        s.from(tables.calendarSyncLogs).select("*").order("id", { ascending: false }),
        s.from(tables.calendarReminders).select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) return;
  const [calendarRows, eventRows, conflicts, syncLogs, reminders] = result;
  const fromCalendar = calendarRows.error ? [] : asArray(calendarRows.data);
  const fromEvents = eventRows.error ? [] : asArray(eventRows.data);
  const merged = [...fromCalendar, ...fromEvents];
  if (merged.length) state.schedules = merged;
  if (!conflicts.error) state.conflicts = asArray(conflicts.data);
  if (!syncLogs.error) state.syncLogs = asArray(syncLogs.data);
  if (!reminders.error) state.reminders = asArray(reminders.data);
}

async function logActivity(action, payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync("phase28_activity_log", async () => s.from(tables.activityLogs).insert({ module: "national_calendar", action, payload, created_at: now() }), null);
}

export async function loadNationalCalendarData() {
  if (!useSupabase()) return;
  await loadFromSupabase();
}

export const getSchedules = () => [...state.schedules];

export function getKpis() {
  const rows = state.schedules;
  const monthRows = rows.filter((r) => String(r.date || "").startsWith(thisMonth())).length;
  return {
    eventsThisMonth: monthRows,
    campsUpcoming: rows.filter((r) => r.type === "Camp" && ["Scheduled", "Pending"].includes(r.status)).length,
    meetingsScheduled: rows.filter((r) => r.type === "Meeting" && ["Scheduled", "Pending"].includes(r.status)).length,
    conflictsDetected: state.conflicts.length,
    trainingsUpcoming: rows.filter((r) => r.type === "Training" && ["Scheduled", "Pending"].includes(r.status)).length,
    deadlinesPending: rows.filter((r) => r.type === "Finance Deadline" && ["Scheduled", "Pending"].includes(r.status)).length,
    syncedDayosisi: new Set(rows.map((r) => r.dayosisi).filter((d) => d && d !== "All Dayosisi")).size || 0,
    calendarHealth: state.conflicts.length > 3 ? "Needs Attention" : "Healthy",
  };
}

export async function addSchedule(payload = {}) {
  const row = { id: Date.now(), ...baseSchedulePayload(payload) };
  state.schedules.unshift(row);
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase28_add_schedule_national", async () => s.from(tables.nationalCalendar).insert(row), null);
    await safeAsync("phase28_add_schedule_event", async () => s.from(tables.calendarEvents).insert(row), null);
  }
  await logActivity("add_schedule", { id: row.id, title: row.title, scope: row.scope });
}

export async function updateSchedule(id, payload = {}) {
  const row = state.schedules.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  Object.assign(row, payload, { updated_at: now() });
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase28_update_schedule_national", async () => s.from(tables.nationalCalendar).update(payload).eq("id", id), null);
    await safeAsync("phase28_update_schedule_events", async () => s.from(tables.calendarEvents).update(payload).eq("id", id), null);
  }
  await logActivity("update_schedule", { id, payload });
}

export async function deleteSchedule(id) {
  state.schedules = state.schedules.filter((x) => Number(x.id) !== Number(id));
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase28_delete_schedule_national", async () => s.from(tables.nationalCalendar).delete().eq("id", id), null);
    await safeAsync("phase28_delete_schedule_event", async () => s.from(tables.calendarEvents).delete().eq("id", id), null);
  }
  await logActivity("delete_schedule", { id });
}

export async function clearSchedules() {
  state.schedules = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase28_clear_schedules_national", async () => s.from(tables.nationalCalendar).delete().neq("id", -1), null);
    await safeAsync("phase28_clear_schedules_event", async () => s.from(tables.calendarEvents).delete().neq("id", -1), null);
  }
  await logActivity("clear_schedules", {});
}

export async function detectConflicts() {
  const map = new Map();
  const found = [];
  for (const row of state.schedules) {
    const key = `${row.date}|${row.time}|${row.dayosisi}|${row.jimbo}|${row.tawi}`;
    if (map.has(key)) {
      found.push({
        id: Date.now() + found.length,
        conflict_key: key,
        title_a: map.get(key).title,
        title_b: row.title,
        date: row.date,
        time: row.time,
        created_at: now(),
      });
    } else {
      map.set(key, row);
    }
  }
  state.conflicts = found;
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase28_clear_conflicts", async () => s.from(tables.calendarConflicts).delete().neq("id", -1), null);
    if (found.length) {
      await safeAsync("phase28_insert_conflicts", async () => s.from(tables.calendarConflicts).insert(found), null);
    }
  }
  await logActivity("detect_conflicts", { conflicts: found.length });
  return found.length;
}

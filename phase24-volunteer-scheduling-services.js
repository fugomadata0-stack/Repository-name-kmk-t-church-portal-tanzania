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
  volunteers: "volunteers",
  serviceTeams: "service_teams",
  dutyRosters: "duty_rosters",
  serviceSchedules: "service_schedules",
  volunteerReports: "volunteer_reports",
  scheduleConflicts: "schedule_conflicts",
  activityLogs: "activity_logs",
};

const state = {
  volunteers: [
    {
      id: 1,
      name: "Asha Mollel",
      phone: "+255712100101",
      team: "Ushers",
      dayosisi: "Dayosisi ya Arusha",
      jimbo: "Jimbo la Kaskazini",
      tawi: "Tawi la Njiro",
      availability: "Weekend",
      status: "Active",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 2,
      name: "Daniel Mrema",
      phone: "+255744210221",
      team: "Media Team",
      dayosisi: "Dayosisi ya Dar es Salaam",
      jimbo: "Jimbo la Kati",
      tawi: "Tawi la Mikocheni",
      availability: "Morning",
      status: "Assigned",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 3,
      name: "Ester Sanga",
      phone: "+255765330990",
      team: "Prayer Team",
      dayosisi: "Dayosisi ya Mbeya",
      jimbo: "Jimbo la Ruanda",
      tawi: "Tawi la Iyunga",
      availability: "Evening",
      status: "Pending",
      created_at: now(),
      updated_at: now(),
    },
  ],
  serviceSchedules: [
    {
      id: 1,
      schedule_date: today(),
      huduma_type: "Sunday Service",
      team: "Ushers",
      volunteer: "Asha Mollel",
      role: "Main Entrance",
      location: "Main Sanctuary",
      time: "08:00",
      status: "Assigned",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 2,
      schedule_date: "2026-04-30",
      huduma_type: "Prayer Meeting",
      team: "Prayer Team",
      volunteer: "Ester Sanga",
      role: "Intercession Lead",
      location: "Prayer Hall",
      time: "18:00",
      status: "Planned",
      created_at: now(),
      updated_at: now(),
    },
  ],
  serviceTeams: [],
  dutyRosters: [],
  volunteerReports: [],
  scheduleConflicts: [],
};

function baseVolunteerPayload(payload = {}) {
  return {
    name: payload.name || "Volunteer mpya",
    phone: payload.phone || "",
    team: payload.team || "Ushers",
    dayosisi: payload.dayosisi || "Dayosisi ya Taifa",
    jimbo: payload.jimbo || "Jimbo Kuu",
    tawi: payload.tawi || "Tawi Kuu",
    availability: payload.availability || "Flexible",
    status: payload.status || "Pending",
    created_at: now(),
    updated_at: now(),
  };
}

function baseSchedulePayload(payload = {}) {
  return {
    schedule_date: payload.schedule_date || today(),
    huduma_type: payload.huduma_type || "Sunday Service",
    team: payload.team || "Ushers",
    volunteer: payload.volunteer || "Volunteer mpya",
    role: payload.role || "Team Member",
    location: payload.location || "Main Church",
    time: payload.time || "09:00",
    status: payload.status || "Planned",
    created_at: now(),
    updated_at: now(),
  };
}

async function loadFromSupabase() {
  const s = getSafeSupabase();
  if (!s) return;
  const result = await safeAsync(
    "phase24_load_volunteer",
    async () =>
      Promise.all([
        s.from(tables.volunteers).select("*").order("id", { ascending: false }),
        s.from(tables.serviceTeams).select("*").order("id", { ascending: false }),
        s.from(tables.dutyRosters).select("*").order("id", { ascending: false }),
        s.from(tables.serviceSchedules).select("*").order("id", { ascending: false }),
        s.from(tables.volunteerReports).select("*").order("id", { ascending: false }),
        s.from(tables.scheduleConflicts).select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) return;
  const [volunteers, teams, rosters, schedules, reports, conflicts] = result;
  if (!volunteers.error) state.volunteers = asArray(volunteers.data);
  if (!teams.error) state.serviceTeams = asArray(teams.data);
  if (!rosters.error) state.dutyRosters = asArray(rosters.data);
  if (!schedules.error) state.serviceSchedules = asArray(schedules.data);
  if (!reports.error) state.volunteerReports = asArray(reports.data);
  if (!conflicts.error) state.scheduleConflicts = asArray(conflicts.data);
}

async function logActivity(action, payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync(
    "phase24_activity_log",
    async () => s.from(tables.activityLogs).insert({ module: "volunteer_scheduling", action, payload, created_at: now() }),
    null
  );
}

export async function loadVolunteerSchedulingData() {
  if (!useSupabase()) return;
  await loadFromSupabase();
}

export const getVolunteers = () => [...state.volunteers];
export const getSchedules = () => [...state.serviceSchedules];

export function getKpis() {
  const volunteers = state.volunteers;
  const schedules = state.serviceSchedules;
  const thisWeekStart = weekAgoDate();
  return {
    activeVolunteers: volunteers.filter((v) => v.status === "Active" || v.status === "Assigned").length,
    teams: new Set(volunteers.map((v) => v.team).filter(Boolean)).size || 0,
    dutiesWeek: schedules.filter((s) => (s.schedule_date || "").slice(0, 10) >= thisWeekStart).length,
    pendingAssignments: schedules.filter((s) => ["Planned", "Assigned"].includes(s.status)).length,
    completedDuties: schedules.filter((s) => s.status === "Done").length,
    serviceTeams: Math.max(new Set(schedules.map((s) => s.team).filter(Boolean)).size, new Set(volunteers.map((v) => v.team).filter(Boolean)).size),
    conflicts: state.scheduleConflicts.length,
    reportsReady: state.volunteerReports.length || schedules.filter((s) => s.status === "Done").length,
  };
}

export async function addVolunteer(payload = {}) {
  const row = { id: Date.now(), ...baseVolunteerPayload(payload) };
  state.volunteers.unshift(row);
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase24_add_volunteer", async () => s.from(tables.volunteers).insert(row), null);
  }
  await logActivity("add_volunteer", { id: row.id, team: row.team, status: row.status });
}

export async function updateVolunteer(id, payload = {}) {
  const row = state.volunteers.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  Object.assign(row, payload, { updated_at: now() });
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase24_update_volunteer", async () => s.from(tables.volunteers).update(payload).eq("id", id), null);
  }
  await logActivity("update_volunteer", { id, payload });
}

export async function deleteVolunteer(id) {
  state.volunteers = state.volunteers.filter((x) => Number(x.id) !== Number(id));
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase24_delete_volunteer", async () => s.from(tables.volunteers).delete().eq("id", id), null);
  }
  await logActivity("delete_volunteer", { id });
}

export async function clearVolunteers() {
  state.volunteers = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase24_clear_volunteers", async () => s.from(tables.volunteers).delete().neq("id", -1), null);
  }
  await logActivity("clear_volunteers", {});
}

export async function addSchedule(payload = {}) {
  const row = { id: Date.now(), ...baseSchedulePayload(payload) };
  state.serviceSchedules.unshift(row);
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase24_add_schedule", async () => s.from(tables.serviceSchedules).insert(row), null);
    await safeAsync(
      "phase24_add_roster",
      async () =>
        s.from(tables.dutyRosters).insert({
          schedule_id: row.id,
          volunteer_name: row.volunteer,
          team: row.team,
          duty_role: row.role,
          duty_date: row.schedule_date,
          status: row.status,
        }),
      null
    );
  } else {
    state.dutyRosters.unshift({
      id: Date.now() + 1,
      schedule_id: row.id,
      volunteer_name: row.volunteer,
      team: row.team,
      duty_role: row.role,
      duty_date: row.schedule_date,
      status: row.status,
    });
  }
  await logActivity("add_schedule", { id: row.id, team: row.team, volunteer: row.volunteer });
}

export async function updateSchedule(id, payload = {}) {
  const row = state.serviceSchedules.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  Object.assign(row, payload, { updated_at: now() });
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase24_update_schedule", async () => s.from(tables.serviceSchedules).update(payload).eq("id", id), null);
  }
  await logActivity("update_schedule", { id, payload });
}

export async function deleteSchedule(id) {
  state.serviceSchedules = state.serviceSchedules.filter((x) => Number(x.id) !== Number(id));
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase24_delete_schedule", async () => s.from(tables.serviceSchedules).delete().eq("id", id), null);
  }
  await logActivity("delete_schedule", { id });
}

export async function clearSchedules() {
  state.serviceSchedules = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase24_clear_schedules", async () => s.from(tables.serviceSchedules).delete().neq("id", -1), null);
  }
  await logActivity("clear_schedules", {});
}

export async function assignDuty(id) {
  await updateSchedule(id, { status: "Assigned" });
}

export async function markScheduleDone(id) {
  const row = state.serviceSchedules.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  row.status = "Done";
  row.updated_at = now();
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase24_mark_done", async () => s.from(tables.serviceSchedules).update({ status: "Done" }).eq("id", id), null);
    await safeAsync(
      "phase24_add_report",
      async () =>
        s.from(tables.volunteerReports).insert({
          schedule_id: id,
          report_title: "Duty Completion Report",
          report_detail: `${row.volunteer} completed ${row.huduma_type} at ${row.location}.`,
          report_date: row.schedule_date || today(),
        }),
      null
    );
  } else {
    state.volunteerReports.unshift({
      id: Date.now(),
      schedule_id: id,
      report_title: "Duty Completion Report",
      report_detail: `${row.volunteer} completed ${row.huduma_type} at ${row.location}.`,
      report_date: row.schedule_date || today(),
    });
  }
  await logActivity("mark_schedule_done", { id, volunteer: row.volunteer });
}

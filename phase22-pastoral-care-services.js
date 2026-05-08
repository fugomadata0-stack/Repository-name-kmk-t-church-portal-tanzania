import { asArray, getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const useSupabase = () => !!getSafeSupabase();

const tables = {
  pastoralCases: "pastoral_cases",
  prayerRequests: "prayer_requests",
  memberFollowups: "member_followups",
  pastoralVisits: "pastoral_visits",
  confidentialNotes: "confidential_notes",
  pastoralReports: "pastoral_reports",
  activityLogs: "activity_logs",
};

const state = {
  pastoralCases: [
    {
      id: 1,
      member_name: "Neema Mwakipesile",
      huduma_type: "Prayer Requests",
      dayosisi: "Dayosisi ya Dar es Salaam",
      jimbo: "Jimbo la Kati",
      tawi: "Tawi la Mikocheni",
      leader_name: "Mch. Daniel Mrema",
      priority: "Urgent",
      status: "In Progress",
      followup_date: today(),
      confidential: false,
      notes: "Familia inapitia changamoto ya afya na maombi ya kila wiki.",
      role_scope: "jimbo",
    },
    {
      id: 2,
      member_name: "Asha Mgaya",
      huduma_type: "Welfare Cases",
      dayosisi: "Dayosisi ya Mbeya",
      jimbo: "Jimbo la Ruanda",
      tawi: "Tawi la Iyunga",
      leader_name: "Mwinj. Ester Sanga",
      priority: "High",
      status: "Pending",
      followup_date: "2026-04-30",
      confidential: true,
      notes: "Mahitaji ya dharura ya chakula kwa muda wa mwezi mmoja.",
      role_scope: "dayosisi",
    },
    {
      id: 3,
      member_name: "John Mwakalebela",
      huduma_type: "Hospital Visits",
      dayosisi: "Dayosisi ya Arusha",
      jimbo: "Jimbo la Kaskazini",
      tawi: "Tawi la Njiro",
      leader_name: "Mch. Elia Mollel",
      priority: "Normal",
      status: "Completed",
      followup_date: "2026-04-22",
      confidential: false,
      notes: "Ziara ya maombi ilifanyika na familia ilitiwa moyo.",
      role_scope: "tawi",
    },
  ],
  prayerRequests: [],
  memberFollowups: [],
  pastoralVisits: [],
  confidentialNotes: [],
  pastoralReports: [],
};

function baseCasePayload(payload = {}) {
  return {
    member_name: payload.member_name || "Muumini mpya",
    huduma_type: payload.huduma_type || "Ushauri wa Kichungaji",
    description: payload.description || "",
    dayosisi: payload.dayosisi || "Dayosisi ya Taifa",
    jimbo: payload.jimbo || "Jimbo Kuu",
    tawi: payload.tawi || "Tawi Kuu",
    leader_name: payload.leader_name || "Mchungaji wa Zamu",
    priority: payload.priority || "Normal",
    status: payload.status || "Open",
    followup_date: payload.followup_date || today(),
    notes: payload.notes || "",
    confidential: !!payload.confidential,
    role_scope: payload.role_scope || "dayosisi",
    created_at: now(),
    updated_at: now(),
  };
}

async function loadFromSupabase() {
  const s = getSafeSupabase();
  if (!s) return;
  const result = await safeAsync(
    "phase22_load_pastoral",
    async () =>
      Promise.all([
        s.from(tables.pastoralCases).select("*").order("id", { ascending: false }),
        s.from(tables.prayerRequests).select("*").order("id", { ascending: false }),
        s.from(tables.memberFollowups).select("*").order("id", { ascending: false }),
        s.from(tables.pastoralVisits).select("*").order("id", { ascending: false }),
        s.from(tables.confidentialNotes).select("*").order("id", { ascending: false }),
        s.from(tables.pastoralReports).select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) return;
  const [cases, prayers, followups, visits, confNotes, reports] = result;
  if (!cases.error) state.pastoralCases = asArray(cases.data);
  if (!prayers.error) state.prayerRequests = asArray(prayers.data);
  if (!followups.error) state.memberFollowups = asArray(followups.data);
  if (!visits.error) state.pastoralVisits = asArray(visits.data);
  if (!confNotes.error) state.confidentialNotes = asArray(confNotes.data);
  if (!reports.error) state.pastoralReports = asArray(reports.data);
}

async function logActivity(action, payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync(
    "phase22_activity_log",
    async () => s.from(tables.activityLogs).insert({ module: "pastoral_care", action, payload, created_at: now() }),
    null
  );
}

export async function loadPastoralCareData() {
  if (!useSupabase()) return;
  await loadFromSupabase();
}

export const getPastoralCases = () => [...state.pastoralCases];

export function getKpis() {
  const cases = state.pastoralCases;
  const todayCount = cases.filter((c) => c.followup_date === today()).length;
  return {
    maombiMapya: cases.filter((c) => String(c.huduma_type).toLowerCase().includes("prayer")).length,
    zinazoendelea: cases.filter((c) => ["In Progress", "Open", "Pending"].includes(c.status)).length,
    followupLeo: todayCount,
    ziaraNyumbani: cases.filter((c) => c.huduma_type === "Home Visits").length,
    ziaraHospitali: cases.filter((c) => c.huduma_type === "Hospital Visits").length,
    confidential: cases.filter((c) => c.confidential).length,
    completed: cases.filter((c) => c.status === "Completed").length,
    pendingReports: Math.max(0, cases.length - state.pastoralReports.length),
  };
}

export async function addPastoralCase(payload = {}) {
  const row = { id: Date.now(), ...baseCasePayload(payload) };
  state.pastoralCases.unshift(row);
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase22_add_case", async () => s.from(tables.pastoralCases).insert(row), null);
    if (String(row.huduma_type).toLowerCase().includes("prayer")) {
      await safeAsync(
        "phase22_add_prayer",
        async () =>
          s.from(tables.prayerRequests).insert({
            pastoral_case_id: row.id,
            member_name: row.member_name,
            request_detail: row.description || row.notes,
            priority: row.priority,
            status: row.status,
            followup_date: row.followup_date,
          }),
        null
      );
    }
    await safeAsync(
      "phase22_add_followup",
      async () =>
        s.from(tables.memberFollowups).insert({
          pastoral_case_id: row.id,
          member_name: row.member_name,
          assigned_leader: row.leader_name,
          followup_date: row.followup_date,
          status: row.status,
        }),
      null
    );
    if (["Hospital Visits", "Home Visits"].includes(row.huduma_type)) {
      await safeAsync(
        "phase22_add_visit",
        async () =>
          s.from(tables.pastoralVisits).insert({
            pastoral_case_id: row.id,
            member_name: row.member_name,
            visit_type: row.huduma_type,
            assigned_leader: row.leader_name,
            visit_date: row.followup_date,
            status: row.status,
          }),
        null
      );
    }
    if (row.confidential) {
      await safeAsync(
        "phase22_add_confidential",
        async () =>
          s.from(tables.confidentialNotes).insert({
            pastoral_case_id: row.id,
            member_name: row.member_name,
            note: row.notes || row.description,
            visibility: "restricted",
            created_at: now(),
          }),
        null
      );
    }
  }
  await logActivity("add_case", { id: row.id, huduma_type: row.huduma_type, priority: row.priority });
}

export async function updatePastoralCase(id, payload = {}) {
  const row = state.pastoralCases.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  Object.assign(row, payload, { updated_at: now() });
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase22_update_case", async () => s.from(tables.pastoralCases).update(payload).eq("id", id), null);
  }
  await logActivity("update_case", { id, payload });
}

export async function deletePastoralCase(id) {
  state.pastoralCases = state.pastoralCases.filter((x) => Number(x.id) !== Number(id));
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase22_delete_case", async () => s.from(tables.pastoralCases).delete().eq("id", id), null);
  }
  await logActivity("delete_case", { id });
}

export async function clearPastoralCases() {
  state.pastoralCases = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase22_clear_cases", async () => s.from(tables.pastoralCases).delete().neq("id", -1), null);
  }
  await logActivity("clear_cases", {});
}

export async function assignPastor(id, leaderName) {
  await updatePastoralCase(id, { leader_name: leaderName || "Mchungaji wa Zamu", status: "In Progress" });
}

export async function markComplete(id) {
  await updatePastoralCase(id, { status: "Completed" });
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync(
      "phase22_add_report",
      async () =>
        s.from(tables.pastoralReports).insert({
          pastoral_case_id: id,
          report_title: "Pastoral Case Completion",
          report_detail: "Case completed and archived for follow-up reporting.",
          report_date: today(),
        }),
      null
    );
  }
  await logActivity("mark_complete", { id });
}

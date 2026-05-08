import { asArray, getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const useSupabase = () => !!getSafeSupabase();

const tables = {
  projects: "projects",
  projectContributions: "project_contributions",
  projectExpenses: "project_expenses",
  projectUpdates: "project_updates",
  projectGallery: "project_gallery",
  projectReports: "project_reports",
  activityLogs: "activity_logs",
};

const state = {
  projects: [
    {
      id: 1,
      project_id: "PRJ-001",
      title: "Ujenzi wa Sanctuary Mpya",
      category: "Construction Projects",
      description: "Ujenzi wa jengo jipya la ibada ya Jumapili.",
      dayosisi: "Dayosisi ya Dar es Salaam",
      jimbo: "Jimbo la Kati",
      tawi: "Tawi la Mikocheni",
      start_date: "2026-01-10",
      end_date: "2026-12-20",
      target_amount: 1200000000,
      collected_amount: 560000000,
      responsible_leader: "Mch. Daniel Mrema",
      image_placeholder: "sanctuary-project.jpg",
      status: "Active",
      notes: "Awamu ya msingi imekamilika.",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 2,
      project_id: "PRJ-002",
      title: "School Renovation Program",
      category: "School Projects",
      description: "Ukarabati wa madarasa na mabweni.",
      dayosisi: "Dayosisi ya Arusha",
      jimbo: "Jimbo la Kaskazini",
      tawi: "Tawi la Njiro",
      start_date: "2026-02-01",
      end_date: "2026-09-30",
      target_amount: 420000000,
      collected_amount: 310000000,
      responsible_leader: "Ester Sanga",
      image_placeholder: "school-project.jpg",
      status: "Active",
      notes: "Windows and roofing stage in progress.",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 3,
      project_id: "PRJ-003",
      title: "Outreach Mission Bus Fund",
      category: "Outreach Projects",
      description: "Fundraising kwa basi la outreach mission.",
      dayosisi: "Dayosisi ya Mbeya",
      jimbo: "Jimbo la Ruanda",
      tawi: "Tawi la Iyunga",
      start_date: "2025-11-01",
      end_date: "2026-03-01",
      target_amount: 185000000,
      collected_amount: 185000000,
      responsible_leader: "Mwinj. Peter Mgaya",
      image_placeholder: "outreach-bus.jpg",
      status: "Completed",
      notes: "Project imekamilika na bus imenunuliwa.",
      created_at: now(),
      updated_at: now(),
    },
  ],
  projectContributions: [],
  projectExpenses: [],
  projectUpdates: [],
  projectGallery: [],
  projectReports: [],
};

function baseProjectPayload(payload = {}) {
  return {
    project_id: payload.project_id || `PRJ-${String(Date.now()).slice(-5)}`,
    title: payload.title || "Mradi mpya",
    category: payload.category || "Church Projects",
    description: payload.description || "",
    dayosisi: payload.dayosisi || "Dayosisi ya Taifa",
    jimbo: payload.jimbo || "Jimbo Kuu",
    tawi: payload.tawi || "Tawi Kuu",
    start_date: payload.start_date || today(),
    end_date: payload.end_date || today(),
    target_amount: Number(payload.target_amount || 0),
    collected_amount: Number(payload.collected_amount || 0),
    responsible_leader: payload.responsible_leader || "",
    image_placeholder: payload.image_placeholder || "project-image.jpg",
    status: payload.status || "Planning",
    notes: payload.notes || "",
    created_at: now(),
    updated_at: now(),
  };
}

async function loadFromSupabase() {
  const s = getSafeSupabase();
  if (!s) return;
  const result = await safeAsync(
    "phase26_load_projects",
    async () =>
      Promise.all([
        s.from(tables.projects).select("*").order("id", { ascending: false }),
        s.from(tables.projectContributions).select("*").order("id", { ascending: false }),
        s.from(tables.projectExpenses).select("*").order("id", { ascending: false }),
        s.from(tables.projectUpdates).select("*").order("id", { ascending: false }),
        s.from(tables.projectGallery).select("*").order("id", { ascending: false }),
        s.from(tables.projectReports).select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) return;
  const [projects, contributions, expenses, updates, gallery, reports] = result;
  if (!projects.error) state.projects = asArray(projects.data);
  if (!contributions.error) state.projectContributions = asArray(contributions.data);
  if (!expenses.error) state.projectExpenses = asArray(expenses.data);
  if (!updates.error) state.projectUpdates = asArray(updates.data);
  if (!gallery.error) state.projectGallery = asArray(gallery.data);
  if (!reports.error) state.projectReports = asArray(reports.data);
}

async function logActivity(action, payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync(
    "phase26_activity_log",
    async () => s.from(tables.activityLogs).insert({ module: "projects_development", action, payload, created_at: now() }),
    null
  );
}

export async function loadProjectsDevelopmentData() {
  if (!useSupabase()) return;
  await loadFromSupabase();
}

export const getProjects = () => [...state.projects];

export function getKpis() {
  const rows = state.projects;
  const totalTarget = rows.reduce((sum, r) => sum + Number(r.target_amount || 0), 0);
  const totalCollected = rows.reduce((sum, r) => sum + Number(r.collected_amount || 0), 0);
  const averageProgress = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + Math.min(100, Math.round((Number(r.collected_amount || 0) / Math.max(1, Number(r.target_amount || 1))) * 100)), 0) / rows.length)
    : 0;
  return {
    total: rows.length,
    active: rows.filter((r) => r.status === "Active").length,
    completed: rows.filter((r) => r.status === "Completed").length,
    targetAmount: totalTarget,
    collectedAmount: totalCollected,
    remainingBalance: Math.max(0, totalTarget - totalCollected),
    progressAverage: averageProgress,
    delayed: rows.filter((r) => r.status === "Delayed").length,
  };
}

export async function addProject(payload = {}) {
  const row = { id: Date.now(), ...baseProjectPayload(payload) };
  state.projects.unshift(row);
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase26_add_project", async () => s.from(tables.projects).insert(row), null);
  }
  await logActivity("add_project", { id: row.id, title: row.title, category: row.category });
}

export async function updateProject(id, payload = {}) {
  const row = state.projects.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  Object.assign(row, payload, { updated_at: now() });
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase26_update_project", async () => s.from(tables.projects).update(payload).eq("id", id), null);
  }
  await logActivity("update_project", { id, payload });
}

export async function deleteProject(id) {
  state.projects = state.projects.filter((x) => Number(x.id) !== Number(id));
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase26_delete_project", async () => s.from(tables.projects).delete().eq("id", id), null);
  }
  await logActivity("delete_project", { id });
}

export async function clearProjects() {
  state.projects = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase26_clear_projects", async () => s.from(tables.projects).delete().neq("id", -1), null);
  }
  await logActivity("clear_projects", {});
}

export async function addContribution(id, amount = 0) {
  const row = state.projects.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  const contribution = Number(amount || Math.max(10000, Math.round(Number(row.target_amount || 0) * 0.05)));
  row.collected_amount = Number(row.collected_amount || 0) + contribution;
  row.updated_at = now();
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase26_add_contribution", async () => s.from(tables.projectContributions).insert({ project_id: id, amount: contribution, contribution_date: today() }), null);
    await safeAsync("phase26_update_collected", async () => s.from(tables.projects).update({ collected_amount: row.collected_amount }).eq("id", id), null);
  } else {
    state.projectContributions.unshift({ id: Date.now(), project_id: id, amount: contribution, contribution_date: today() });
  }
  await logActivity("add_contribution", { id, amount: contribution });
}

export async function addUpdate(id, message = "Project progress updated.") {
  const row = state.projects.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  row.updated_at = now();
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase26_add_update", async () => s.from(tables.projectUpdates).insert({ project_id: id, update_note: message, update_date: today() }), null);
    await safeAsync("phase26_touch_project", async () => s.from(tables.projects).update({ updated_at: now() }).eq("id", id), null);
  } else {
    state.projectUpdates.unshift({ id: Date.now(), project_id: id, update_note: message, update_date: today() });
  }
  await logActivity("add_update", { id, message });
}

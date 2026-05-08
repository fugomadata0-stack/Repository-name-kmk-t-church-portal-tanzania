import { asArray, getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const useSupabase = () => !!getSafeSupabase();

const tables = {
  trainings: "trainings",
  trainingParticipants: "training_participants",
  trainers: "trainers",
  trainingMaterials: "training_materials",
  certificatesPlaceholder: "certificates_placeholder",
  trainingReports: "training_reports",
  activityLogs: "activity_logs",
};

const state = {
  trainings: [
    {
      id: 1,
      training_id: "TRN-001",
      title: "Leadership Essentials Seminar",
      category: "Leadership Training",
      description: "Mafunzo ya uongozi kwa viongozi wa Dayosisi na Jimbo.",
      trainer: "Mch. Daniel Mrema",
      dayosisi: "Dayosisi ya Dar es Salaam",
      jimbo: "Jimbo la Kati",
      tawi: "Tawi la Mikocheni",
      start_date: "2026-05-05",
      end_date: "2026-05-08",
      venue: "KMT Training Hall",
      materials_placeholder: "leadership-module.pdf",
      status: "Active",
      notes: "Sessions 4 zimeshakamilika.",
      participants_count: 42,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 2,
      training_id: "TRN-002",
      title: "Discipleship Class - Level 1",
      category: "Discipleship Courses",
      description: "Course ya msingi ya uanafunzi kwa waumini wapya.",
      trainer: "Ester Sanga",
      dayosisi: "Dayosisi ya Arusha",
      jimbo: "Jimbo la Kaskazini",
      tawi: "Tawi la Njiro",
      start_date: "2026-05-15",
      end_date: "2026-06-15",
      venue: "Classroom A",
      materials_placeholder: "discipleship-level1.zip",
      status: "Upcoming",
      notes: "Registration bado inaendelea.",
      participants_count: 28,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 3,
      training_id: "TRN-003",
      title: "Bible Study Intensive",
      category: "Bible Study Classes",
      description: "Uchambuzi wa kina wa Warumi na Waefeso.",
      trainer: "Mwinj. Peter Mgaya",
      dayosisi: "Dayosisi ya Mbeya",
      jimbo: "Jimbo la Ruanda",
      tawi: "Tawi la Iyunga",
      start_date: "2026-03-01",
      end_date: "2026-04-10",
      venue: "Bible Class Wing",
      materials_placeholder: "bible-study-notes.docx",
      status: "Completed",
      notes: "Class imekamilika na feedback ni nzuri.",
      participants_count: 35,
      created_at: now(),
      updated_at: now(),
    },
  ],
  trainingParticipants: [],
  trainers: [],
  trainingMaterials: [],
  certificatesPlaceholder: [],
  trainingReports: [],
};

function baseTrainingPayload(payload = {}) {
  return {
    training_id: payload.training_id || `TRN-${String(Date.now()).slice(-5)}`,
    title: payload.title || "Mafunzo mapya",
    category: payload.category || "Bible Study Classes",
    description: payload.description || "",
    trainer: payload.trainer || "",
    dayosisi: payload.dayosisi || "Dayosisi ya Taifa",
    jimbo: payload.jimbo || "Jimbo Kuu",
    tawi: payload.tawi || "Tawi Kuu",
    start_date: payload.start_date || today(),
    end_date: payload.end_date || today(),
    venue: payload.venue || "Main Hall",
    materials_placeholder: payload.materials_placeholder || "materials-file.pdf",
    status: payload.status || "Planning",
    notes: payload.notes || "",
    participants_count: Number(payload.participants_count || 0),
    created_at: now(),
    updated_at: now(),
  };
}

async function loadFromSupabase() {
  const s = getSafeSupabase();
  if (!s) return;
  const result = await safeAsync(
    "phase27_load_training",
    async () =>
      Promise.all([
        s.from(tables.trainings).select("*").order("id", { ascending: false }),
        s.from(tables.trainingParticipants).select("*").order("id", { ascending: false }),
        s.from(tables.trainers).select("*").order("id", { ascending: false }),
        s.from(tables.trainingMaterials).select("*").order("id", { ascending: false }),
        s.from(tables.certificatesPlaceholder).select("*").order("id", { ascending: false }),
        s.from(tables.trainingReports).select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) return;
  const [trainings, participants, trainers, materials, certificates, reports] = result;
  if (!trainings.error) state.trainings = asArray(trainings.data);
  if (!participants.error) state.trainingParticipants = asArray(participants.data);
  if (!trainers.error) state.trainers = asArray(trainers.data);
  if (!materials.error) state.trainingMaterials = asArray(materials.data);
  if (!certificates.error) state.certificatesPlaceholder = asArray(certificates.data);
  if (!reports.error) state.trainingReports = asArray(reports.data);
}

async function logActivity(action, payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync(
    "phase27_activity_log",
    async () => s.from(tables.activityLogs).insert({ module: "education_training", action, payload, created_at: now() }),
    null
  );
}

export async function loadEducationTrainingData() {
  if (!useSupabase()) return;
  await loadFromSupabase();
}

export const getTrainings = () => [...state.trainings];

export function getKpis() {
  const rows = state.trainings;
  const active = rows.filter((r) => r.status === "Active").length;
  const participants = rows.reduce((sum, r) => sum + Number(r.participants_count || 0), 0);
  const trainers = new Set(rows.map((r) => r.trainer).filter(Boolean)).size;
  const materials = state.trainingMaterials.length || rows.filter((r) => !!r.materials_placeholder).length;
  const completed = rows.filter((r) => r.status === "Completed").length;
  const certificates = state.certificatesPlaceholder.length || completed;
  const upcomingSeminars = rows.filter((r) => r.category === "Seminars" && r.status === "Upcoming").length;
  const reports = state.trainingReports.length || completed;
  return { active, participants, trainers, materials, completed, certificates, upcomingSeminars, reports };
}

export async function addTraining(payload = {}) {
  const row = { id: Date.now(), ...baseTrainingPayload(payload) };
  state.trainings.unshift(row);
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase27_add_training", async () => s.from(tables.trainings).insert(row), null);
  }
  await logActivity("add_training", { id: row.id, title: row.title, category: row.category });
}

export async function updateTraining(id, payload = {}) {
  const row = state.trainings.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  Object.assign(row, payload, { updated_at: now() });
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase27_update_training", async () => s.from(tables.trainings).update(payload).eq("id", id), null);
  }
  await logActivity("update_training", { id, payload });
}

export async function deleteTraining(id) {
  state.trainings = state.trainings.filter((x) => Number(x.id) !== Number(id));
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase27_delete_training", async () => s.from(tables.trainings).delete().eq("id", id), null);
  }
  await logActivity("delete_training", { id });
}

export async function clearTrainings() {
  state.trainings = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase27_clear_trainings", async () => s.from(tables.trainings).delete().neq("id", -1), null);
  }
  await logActivity("clear_trainings", {});
}

export async function registerParticipants(id, count = 0) {
  const row = state.trainings.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  const additional = Number(count || 5);
  row.participants_count = Number(row.participants_count || 0) + additional;
  row.updated_at = now();
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync(
      "phase27_register_participants",
      async () =>
        s.from(tables.trainingParticipants).insert({
          training_id: id,
          participant_count: additional,
          registered_at: now(),
        }),
      null
    );
    await safeAsync("phase27_update_participants_total", async () => s.from(tables.trainings).update({ participants_count: row.participants_count }).eq("id", id), null);
  } else {
    state.trainingParticipants.unshift({ id: Date.now(), training_id: id, participant_count: additional, registered_at: now() });
  }
  await logActivity("register_participants", { id, additional });
}

export async function uploadMaterials(id, fileName = "training-material.pdf") {
  const row = state.trainings.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  row.materials_placeholder = fileName;
  row.updated_at = now();
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync(
      "phase27_upload_materials",
      async () =>
        s.from(tables.trainingMaterials).insert({
          training_id: id,
          material_name: fileName,
          uploaded_at: now(),
        }),
      null
    );
    await safeAsync("phase27_update_material_placeholder", async () => s.from(tables.trainings).update({ materials_placeholder: fileName }).eq("id", id), null);
  } else {
    state.trainingMaterials.unshift({ id: Date.now(), training_id: id, material_name: fileName, uploaded_at: now() });
  }
  await logActivity("upload_materials", { id, fileName });
}

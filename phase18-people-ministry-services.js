import { asArray, getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const mockSummary = {
  modulesCount: 6,
  activeSubmissions: 18,
  needsCorrection: 4,
  approved: 29,
  resubmitted: 7,
  completionRate: "81%",
};

const useSupabase = () => !!getSafeSupabase();

function toPercent(done, total) {
  if (!total) return "0%";
  return `${Math.round((done / total) * 100)}%`;
}

export async function loadPeopleMinistrySummary() {
  if (!useSupabase()) return { ...mockSummary, mode: "mock" };
  const s = getSafeSupabase();
  if (!s) return { ...mockSummary, mode: "mock" };

  const result = await safeAsync(
    "phase18_load_summary",
    async () =>
      Promise.all([
        s.from("members").select("id", { count: "exact", head: true }),
        s.from("families").select("id", { count: "exact", head: true }),
        s.from("ministries").select("id", { count: "exact", head: true }),
        s.from("fellowships").select("id", { count: "exact", head: true }),
        s.from("departments").select("id", { count: "exact", head: true }),
        s.from("choirs").select("id", { count: "exact", head: true }),
        s.from("data_submissions").select("id,status_sw,completion_sw"),
      ]),
    null
  );
  if (!result) return { ...mockSummary, mode: "mock" };
  const [members, families, ministries, fellowships, departments, choirs, submissions] = result;

  const safe = (q) => (q.error ? 0 : q.count || 0);
  const moduleEntities = safe(members) + safe(families) + safe(ministries) + safe(fellowships) + safe(departments) + safe(choirs);

  const subRows = submissions.error ? [] : asArray(submissions.data);
  const activeSubmissions = subRows.filter((r) => ["Imewasilishwa", "Inasubiri", "Inakaguliwa", "Imeidhinishwa", "Imekataliwa", "Imewasilishwa Tena"].includes(r.status_sw)).length;
  const needsCorrection = subRows.filter((r) => r.status_sw === "Inahitaji Marekebisho").length;
  const approved = subRows.filter((r) => r.status_sw === "Imeidhinishwa").length;
  const resubmitted = subRows.filter((r) => r.status_sw === "Imewasilishwa Tena").length;
  const completed = subRows.filter((r) => r.completion_sw === "Imekamilika").length;

  return {
    modulesCount: moduleEntities || 6,
    activeSubmissions,
    needsCorrection,
    approved,
    resubmitted,
    completionRate: toPercent(completed, subRows.length),
    mode: "supabase",
  };
}

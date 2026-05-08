import { asArray, getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const now = () => new Date().toISOString();
const useSupabase = () => !!getSafeSupabase();

const tables = {
  aiInsights: "ai_insights",
  smartAlerts: "smart_alerts",
  duplicateChecks: "duplicate_checks",
  predictionSnapshots: "prediction_snapshots",
  recommendationLogs: "recommendation_logs",
  aiActivityLogs: "ai_activity_logs",
};

const state = {
  insights: [
    {
      id: 1,
      insight_id: "AI-001",
      module: "Attendance",
      type: "Warning",
      priority: "High",
      message_preview: "Low attendance detected in Dayosisi ya Arusha for two consecutive weeks.",
      suggested_action: "Plan targeted follow-up campaign and youth engagement service.",
      status: "New",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 2,
      insight_id: "AI-002",
      module: "Finance",
      type: "Warning",
      priority: "Critical",
      message_preview: "Expense growth exceeds 28% compared to previous month in one Dayosisi.",
      suggested_action: "Run budget review and approval tightening this week.",
      status: "New",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 3,
      insight_id: "AI-003",
      module: "Members",
      type: "Duplicate",
      priority: "Normal",
      message_preview: "Possible duplicate member profiles found across two Matawi.",
      suggested_action: "Open duplicate merge checklist and verify phone + DOB.",
      status: "Accepted",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 4,
      insight_id: "AI-004",
      module: "Events",
      type: "Conflict",
      priority: "High",
      message_preview: "Camp date conflicts with Dayosisi training seminar schedule.",
      suggested_action: "Reschedule one event and sync National Calendar immediately.",
      status: "New",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 5,
      insight_id: "AI-005",
      module: "Follow-up",
      type: "Risk",
      priority: "Normal",
      message_preview: "Missed follow-up reminder for 12 new visitors in one Jimbo.",
      suggested_action: "Assign outreach leaders and close reminders in 48 hours.",
      status: "Dismissed",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 6,
      insight_id: "AI-006",
      module: "Donations",
      type: "Recommendation",
      priority: "Low",
      message_preview: "Donation trend rises near project storytelling campaigns.",
      suggested_action: "Increase testimony and progress update content in Sunday services.",
      status: "Resolved",
      created_at: now(),
      updated_at: now(),
    },
  ],
  smartAlerts: [],
  duplicateChecks: [],
  predictionSnapshots: [],
  recommendationLogs: [],
};

async function loadFromSupabase() {
  const s = getSafeSupabase();
  if (!s) return;
  const result = await safeAsync(
    "phase29_load_ai_data",
    async () =>
      Promise.all([
        s.from(tables.aiInsights).select("*").order("id", { ascending: false }),
        s.from(tables.smartAlerts).select("*").order("id", { ascending: false }),
        s.from(tables.duplicateChecks).select("*").order("id", { ascending: false }),
        s.from(tables.predictionSnapshots).select("*").order("id", { ascending: false }),
        s.from(tables.recommendationLogs).select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) return;
  const [insights, alerts, duplicates, predictions, recommendations] = result;
  if (!insights.error) state.insights = asArray(insights.data);
  if (!alerts.error) state.smartAlerts = asArray(alerts.data);
  if (!duplicates.error) state.duplicateChecks = asArray(duplicates.data);
  if (!predictions.error) state.predictionSnapshots = asArray(predictions.data);
  if (!recommendations.error) state.recommendationLogs = asArray(recommendations.data);
}

async function logActivity(action, payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync("phase29_ai_activity_log", async () => s.from(tables.aiActivityLogs).insert({ action, payload, created_at: now() }), null);
}

export async function loadAiSmartData() {
  if (!useSupabase()) return;
  await loadFromSupabase();
}

export const getInsights = () => [...state.insights];

export function getKpis() {
  const rows = state.insights;
  return {
    insightsGenerated: rows.length,
    duplicateAlerts: rows.filter((r) => r.type === "Duplicate").length,
    riskAlerts: rows.filter((r) => r.type === "Risk").length,
    financeWarnings: rows.filter((r) => r.module === "Finance" && r.type === "Warning").length,
    attendancePredictions: rows.filter((r) => r.module === "Attendance" && ["Prediction", "Warning"].includes(r.type)).length,
    reportSummaries: rows.filter((r) => r.type === "Summary").length || 3,
    recommendations: rows.filter((r) => r.type === "Recommendation").length,
    aiHealth: rows.filter((r) => r.priority === "Critical").length > 2 ? "Attention" : "Healthy",
  };
}

export async function updateInsightStatus(id, status) {
  const row = state.insights.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  row.status = status || row.status;
  row.updated_at = now();
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase29_update_insight", async () => s.from(tables.aiInsights).update({ status: row.status, updated_at: row.updated_at }).eq("id", id), null);
  }
  await logActivity("update_insight_status", { id, status: row.status });
}

export async function clearInsights() {
  state.insights = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase29_clear_insights", async () => s.from(tables.aiInsights).delete().neq("id", -1), null);
  }
  await logActivity("clear_insights", {});
}

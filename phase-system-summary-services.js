import { getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const fallbackSummary = {
  totalDayosisi: 26,
  totalMajimbo: 128,
  totalMatawi: 642,
  totalMembers: 98450,
  totalLeaders: 1845,
  totalBishops: 0,
  totalPastors: 0,
  totalEvangelists: 0,
  totalElders: 0,
  totalDeacons: 0,
  totalFamilies: 0,
  totalChoirs: 0,
  totalDepartments: 0,
  totalFellowships: 0,
  totalInstitutions: 0,
  totalPublications: 0,
  totalEvents: 0,
  totalDocuments: 0,
  totalUsers: 0,
  activeUsers: 846,
  pendingSubmissions: 0,
  approvedSubmissions: 0,
  rejectedSubmissions: 0,
  completedRecords: 0,
  notCompletedRecords: 0,
  incompleteProfiles: 0,
  vacantPositions: 0,
  suspendedUsers: 0,
  totalIncome: 0,
  totalExpenses: 0,
  openingBalance: 0,
  closingBalance: 0,
  pendingAmount: 0,
  approvedAmount: 0,
  paidAmount: 0,
  unpaidAmount: 0,
  budgetAmount: 0,
  budgetUsedAmount: 0,
  budgetUsedPercent: 0,
  remainingBalance: 0,
  completionRate: 0,
  mode: "mock",
};

const tableMap = {
  totalDayosisi: "dayosisi",
  totalMajimbo: "majimbo",
  totalMatawi: "matawi",
  totalMembers: "members",
  totalLeaders: "leaders",
  totalFamilies: "families",
  totalChoirs: "choirs",
  totalDepartments: "departments",
  totalFellowships: "fellowships",
  totalInstitutions: "institutions",
  totalPublications: "publications",
  totalEvents: "events",
  totalDocuments: "documents",
  totalUsers: "auth_user_profiles",
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function loadTableRows(s, table, columns) {
  const res = await safeAsync(`summary_rows_${table}`, async () => s.from(table).select(columns), null);
  if (!res || res.error || !Array.isArray(res.data)) return null;
  return res.data;
}

async function loadLeaderRoleSummary(s) {
  const rows = await loadTableRows(s, "leaders", "role_name,leadership_level,status");
  if (!rows) return {};
  const active = rows.filter((r) => String(r.status || "").toLowerCase() !== "archived");
  const has = (r, terms) => terms.some((t) => String(r.role_name || "").toLowerCase().includes(t));
  return {
    totalBishops: active.filter((r) => has(r, ["askofu", "bishop"])).length,
    totalPastors: active.filter((r) => has(r, ["mchungaji", "pastor"])).length,
    totalEvangelists: active.filter((r) => has(r, ["wainjilisti", "evangelist"])).length,
    totalElders: active.filter((r) => has(r, ["mzee", "elder"])).length,
    totalDeacons: active.filter((r) => has(r, ["shemasi", "deacon"])).length,
    vacantPositions: active.filter((r) => String(r.status || "").toLowerCase().includes("vacant")).length,
    incompleteProfiles: active.filter((r) => !String(r.role_name || "").trim() || !String(r.leadership_level || "").trim()).length,
  };
}

async function loadFinanceSummary(s) {
  const candidates = [
    ["finance_transactions", "amount,status,type"],
    ["payments", "amount,status,type"],
    ["michango", "kiasi,status,type"],
  ];
  for (const [table, cols] of candidates) {
    const rows = await loadTableRows(s, table, cols);
    if (!rows) continue;
    const withAmount = rows.map((r) => {
      const amount = toNum(r.amount ?? r.kiasi);
      const status = String(r.status || "").toLowerCase();
      const type = String(r.type || "").toLowerCase();
      return { amount, status, type };
    });
    const totalIncome = withAmount.filter((r) => r.type.includes("income") || r.type.includes("mchango")).reduce((a, r) => a + r.amount, 0);
    const totalExpenses = withAmount.filter((r) => r.type.includes("expense") || r.type.includes("matumizi")).reduce((a, r) => a + r.amount, 0);
    const pendingAmount = withAmount.filter((r) => r.status.includes("pending") || r.status.includes("inasubiri")).reduce((a, r) => a + r.amount, 0);
    const approvedAmount = withAmount.filter((r) => r.status.includes("approved") || r.status.includes("imeidhinishwa")).reduce((a, r) => a + r.amount, 0);
    const paidAmount = withAmount.filter((r) => r.status.includes("paid")).reduce((a, r) => a + r.amount, 0);
    const unpaidAmount = withAmount.filter((r) => r.status.includes("unpaid")).reduce((a, r) => a + r.amount, 0);
    const openingBalance = 0;
    const closingBalance = openingBalance + totalIncome - totalExpenses;
    const budgetAmount = totalIncome + approvedAmount;
    const budgetUsedAmount = totalExpenses;
    const budgetUsedPercent = budgetAmount > 0 ? Math.round((budgetUsedAmount / budgetAmount) * 100) : 0;
    return {
      totalIncome,
      totalExpenses,
      openingBalance,
      closingBalance,
      pendingAmount,
      approvedAmount,
      paidAmount,
      unpaidAmount,
      budgetAmount,
      budgetUsedAmount,
      budgetUsedPercent,
      remainingBalance: closingBalance,
    };
  }
  return {};
}

export async function loadLiveSystemSummary() {
  const s = getSafeSupabase();
  if (!s) return { ...fallbackSummary };

  const counts = {};
  for (const [key, table] of Object.entries(tableMap)) {
    const res = await safeAsync(`summary_count_${table}`, async () => s.from(table).select("id", { count: "exact", head: true }), null);
    counts[key] = !res || res.error ? fallbackSummary[key] : Number(res.count || 0);
  }

  const sub = await safeAsync(
    "summary_submissions",
    async () => s.from("data_submissions").select("status_sw,completion_sw"),
    null
  );
  const users = await safeAsync(
    "summary_users",
    async () => s.from("auth_user_profiles").select("is_active"),
    null
  );

  const subRows = !sub || sub.error || !Array.isArray(sub.data) ? [] : sub.data;
  const uRows = !users || users.error || !Array.isArray(users.data) ? [] : users.data;

  const pendingSubmissions = subRows.filter((x) => ["Inasubiri", "Inakaguliwa", "Pending"].includes(String(x.status_sw || ""))).length;
  const approvedSubmissions = subRows.filter((x) => ["Imeidhinishwa", "Approved", "Imekamilika"].includes(String(x.status_sw || ""))).length;
  const rejectedSubmissions = subRows.filter((x) => ["Imekataliwa", "Rejected"].includes(String(x.status_sw || ""))).length;
  const completed = subRows.filter((x) => ["Imekamilika", "Completed", "Imeidhinishwa", "Approved"].includes(String(x.completion_sw || x.status_sw || ""))).length;
  const notCompletedRecords = Math.max(subRows.length - completed, 0);
  const completionRate = subRows.length ? Math.round((completed / subRows.length) * 100) : 0;
  const activeUsers = uRows.filter((x) => x.is_active !== false).length || fallbackSummary.activeUsers;
  const suspendedUsers = uRows.filter((x) => x.is_active === false).length;
  const roleSummary = await loadLeaderRoleSummary(s);
  const financeSummary = await loadFinanceSummary(s);

  return {
    ...fallbackSummary,
    ...counts,
    pendingSubmissions,
    approvedSubmissions,
    rejectedSubmissions,
    completedRecords: completed,
    notCompletedRecords,
    completionRate,
    activeUsers,
    suspendedUsers,
    ...roleSummary,
    ...financeSummary,
    mode: "supabase",
  };
}

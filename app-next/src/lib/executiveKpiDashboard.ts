import type { Phase1Scope } from "../services/phase1FoundationService";

export type ExecutiveKpiScope = Phase1Scope;

export type ExecutiveKpiDashboardPayload = {
  scope: ExecutiveKpiScope;
  entityId: string | null;
  periodStart: string;
  periodEnd: string;
  membership: {
    total: number;
    wanaume: number;
    wanawake: number;
    vijana: number;
  };
  finance: {
    incomeTotal: number;
    expenseTotal: number;
    balance: number;
    transfersPending: number;
    remaining: number;
  };
  projects: {
    projectCount: number;
    activeCount: number;
    incomeTotal: number;
    expenseTotal: number;
    balanceTotal: number;
  };
  attendance: {
    sessionsMonth: number;
    sessionsToday: number;
    visitorsMonth: number;
  };
  uploads: {
    total: number;
    pendingVerification: number;
  };
  approvals: {
    remittancePending: number;
    incomePending: number;
    totalPending: number;
  };
  byType: { label: string; count: number; income: number }[];
  error?: string;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseCategories(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, number>;
}

export function parseExecutiveKpiDashboardRpc(data: unknown): ExecutiveKpiDashboardPayload {
  const empty: ExecutiveKpiDashboardPayload = {
    scope: "kmkt",
    entityId: null,
    periodStart: "",
    periodEnd: "",
    membership: { total: 0, wanaume: 0, wanawake: 0, vijana: 0 },
    finance: { incomeTotal: 0, expenseTotal: 0, balance: 0, transfersPending: 0, remaining: 0 },
    projects: { projectCount: 0, activeCount: 0, incomeTotal: 0, expenseTotal: 0, balanceTotal: 0 },
    attendance: { sessionsMonth: 0, sessionsToday: 0, visitorsMonth: 0 },
    uploads: { total: 0, pendingVerification: 0 },
    approvals: { remittancePending: 0, incomePending: 0, totalPending: 0 },
    byType: [],
  };
  if (!data || typeof data !== "object") return empty;
  const o = data as Record<string, unknown>;
  if (o.error === "forbidden") return { ...empty, error: "forbidden" };

  const mem = (o.membership ?? {}) as Record<string, unknown>;
  const memCat = parseCategories(mem.categories);
  const fin = (o.finance ?? {}) as Record<string, unknown>;
  const proj = (o.projects ?? {}) as Record<string, unknown>;
  const att = (o.attendance ?? {}) as Record<string, unknown>;
  const upl = (o.uploads ?? {}) as Record<string, unknown>;
  const appr = (o.approvals ?? {}) as Record<string, unknown>;

  const byTypeRaw = Array.isArray(proj.by_type) ? proj.by_type : [];
  const byType = byTypeRaw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      label: String(r.project_type ?? "other"),
      count: num(r.count),
      income: num(r.income),
    };
  });

  return {
    scope: (String(o.scope ?? "kmkt") as ExecutiveKpiScope) || "kmkt",
    entityId: (o.entity_id as string | null) ?? null,
    periodStart: String(o.period_start ?? ""),
    periodEnd: String(o.period_end ?? ""),
    membership: {
      total: num(memCat.total),
      wanaume: num(memCat.wanaume),
      wanawake: num(memCat.wanawake),
      vijana: num(memCat.vijana),
    },
    finance: {
      incomeTotal: num(fin.income_total),
      expenseTotal: num(fin.expenses_total),
      balance: num(fin.balance),
      transfersPending: num(fin.transfers_pending),
      remaining: num(fin.remaining),
    },
    projects: {
      projectCount: num(proj.project_count),
      activeCount: num(proj.active_count),
      incomeTotal: num(proj.income_total),
      expenseTotal: num(proj.expense_total),
      balanceTotal: num(proj.balance_total),
    },
    attendance: {
      sessionsMonth: num(att.sessions_month),
      sessionsToday: num(att.sessions_today),
      visitorsMonth: num(att.visitors_month),
    },
    uploads: {
      total: num(upl.total),
      pendingVerification: num(upl.pending_verification),
    },
    approvals: {
      remittancePending: num(appr.remittance_pending),
      incomePending: num(appr.income_pending),
      totalPending: num(appr.total_pending),
    },
    byType,
  };
}

export const EXECUTIVE_SCOPE_OPTIONS: { value: ExecutiveKpiScope; label: string }[] = [
  { value: "kmkt", label: "KMK(T) — Kitaifa" },
  { value: "dayosisi", label: "Dayosisi" },
  { value: "jimbo", label: "Jimbo" },
  { value: "tawi", label: "Tawi" },
];

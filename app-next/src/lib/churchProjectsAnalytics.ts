import type { ChurchInstitutionProject, InstitutionProjectType } from "../services/phase1FoundationService";
import { PROJECT_TYPE_LABELS } from "../services/phase1FoundationService";

export type ProjectTypeAnalyticsRow = {
  project_type: string;
  count: number;
  income: number;
  balance: number;
  label: string;
};

export type ChurchProjectsAnalytics = {
  projectCount: number;
  incomeTotal: number;
  expenseTotal: number;
  balanceTotal: number;
  activeCount: number;
  byType: ProjectTypeAnalyticsRow[];
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function computeProjectsAnalyticsFromRows(projects: ChurchInstitutionProject[]): ChurchProjectsAnalytics {
  const byTypeMap = new Map<string, ProjectTypeAnalyticsRow>();

  let incomeTotal = 0;
  let expenseTotal = 0;
  let balanceTotal = 0;
  let activeCount = 0;

  for (const p of projects) {
    const income = num(p.budget_income_tz);
    const expense = num(p.budget_expense_tz);
    const balance = num(p.balance_tz) || income - expense;
    incomeTotal += income;
    expenseTotal += expense;
    balanceTotal += balance;
    if (p.approval_status === "active") activeCount++;

    const key = p.project_type;
    const cur = byTypeMap.get(key) ?? {
      project_type: key,
      count: 0,
      income: 0,
      balance: 0,
      label: PROJECT_TYPE_LABELS[key as InstitutionProjectType] ?? key,
    };
    cur.count += 1;
    cur.income += income;
    cur.balance += balance;
    byTypeMap.set(key, cur);
  }

  return {
    projectCount: projects.length,
    incomeTotal,
    expenseTotal,
    balanceTotal,
    activeCount,
    byType: Array.from(byTypeMap.values()).sort((a, b) => b.count - a.count),
  };
}

export function parseProjectsAnalyticsRpc(data: unknown): ChurchProjectsAnalytics | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.error === "forbidden") return null;
  const byTypeRaw = Array.isArray(o.by_type) ? o.by_type : [];
  const byType: ProjectTypeAnalyticsRow[] = byTypeRaw.map((row) => {
    const r = row as Record<string, unknown>;
    const pt = String(r.project_type ?? "");
    return {
      project_type: pt,
      count: num(r.count),
      income: num(r.income),
      balance: num(r.balance),
      label: PROJECT_TYPE_LABELS[pt as InstitutionProjectType] ?? pt,
    };
  });
  return {
    projectCount: num(o.project_count),
    incomeTotal: num(o.income_total),
    expenseTotal: num(o.expense_total),
    balanceTotal: num(o.balance_total),
    activeCount: num(o.active_count),
    byType,
  };
}

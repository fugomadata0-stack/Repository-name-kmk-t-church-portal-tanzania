/**
 * Chanzo kimoja cha ukweli kwa Injini ya Ngazi Kuu — routing, realtime na majina ya submodule.
 */
export const MASTER_BRANCH_ENGINE_SUBMODULE = "Injini ya Ngazi — Executive" as const;
export const MATAWI_ENGINE_SUBMODULE = "Matawi / Vituo" as const;
export const MATAWI_REGISTRY_SUBMODULE = "Orodha ya Matawi / Vituo" as const;
export const TAWI_DASHBOARD_SUBMODULE = "Dashboard ya Tawi" as const;

/** Jedwali linalosikilizwa na injini (subset ya publication — hakuna wildcard). */
export const MASTER_BRANCH_ENGINE_REALTIME_TABLES = [
  "church_tawi",
  "church_jimbo",
  "dayosisi",
  "church_members",
  "church_families",
  "church_viongozi",
  "attendance_sessions",
  "attendance_records",
  "church_finance_entries",
  "church_income_lines",
  "church_income_sources",
  "notifications",
  "system_alerts",
  "portal_branch_engine_workspace",
] as const;

export type MasterBranchKpiNavTarget = {
  moduleKey: string;
  submodule?: string;
};

/** KPI tiles zinazoweza kubofywa — deep link kwa moduli husika. */
export const MASTER_BRANCH_KPI_NAV: Record<string, MasterBranchKpiNavTarget> = {
  Dayosisi: { moduleKey: "muundo", submodule: "Dayosisi" },
  Majimbo: { moduleKey: "muundo", submodule: "Majimbo" },
  Matawi: { moduleKey: "muundo", submodule: MATAWI_ENGINE_SUBMODULE },
  "Matawi active": { moduleKey: "muundo", submodule: MATAWI_REGISTRY_SUBMODULE },
  Waumini: { moduleKey: "waumini", submodule: "Orodha ya Waumini" },
  Viongozi: { moduleKey: "viongozi", submodule: "Viongozi wa Matawi/Vituo" },
  "Vikao (mwezi)": { moduleKey: "attendance", submodule: "Sessions" },
  "Mapato (mwezi)": { moduleKey: "fedha" },
};

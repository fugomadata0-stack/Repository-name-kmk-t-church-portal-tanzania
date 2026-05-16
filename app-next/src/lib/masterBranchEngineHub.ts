/**
 * Chanzo kimoja cha ukweli kwa Injini ya Ngazi Kuu — routing, realtime na majina ya submodule.
 */
export const MASTER_BRANCH_ENGINE_SUBMODULE = "Injini ya Ngazi — Executive" as const;
export const KMK_T_ENGINE_SUBMODULE = "KMK(T)" as const;
export const DAYOSISI_ENGINE_SUBMODULE = "Dayosisi" as const;
export const JIMBO_ENGINE_SUBMODULE = "Majimbo" as const;
export const MATAWI_ENGINE_SUBMODULE = "Matawi / Vituo" as const;
export const MATAWI_REGISTRY_SUBMODULE = "Orodha ya Matawi / Vituo" as const;
export const DAYOSISI_REGISTRY_SUBMODULE = "Orodha ya Dayosisi" as const;
export const JIMBO_REGISTRY_SUBMODULE = "Orodha ya Majimbo" as const;
export const TAWI_DASHBOARD_SUBMODULE = "Dashboard ya Tawi" as const;

/** Submodule zote zinazofungua MATAWI MODULE DD.html (iframe). */
export const MUUNDO_BRANCH_ENGINE_SUBMODULES = new Set<string>([
  MASTER_BRANCH_ENGINE_SUBMODULE,
  "Ngazi Kuu",
  KMK_T_ENGINE_SUBMODULE,
  DAYOSISI_ENGINE_SUBMODULE,
  JIMBO_ENGINE_SUBMODULE,
  MATAWI_ENGINE_SUBMODULE,
  TAWI_DASHBOARD_SUBMODULE,
]);

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
  Dayosisi: { moduleKey: "muundo", submodule: DAYOSISI_ENGINE_SUBMODULE },
  Majimbo: { moduleKey: "muundo", submodule: JIMBO_ENGINE_SUBMODULE },
  Matawi: { moduleKey: "muundo", submodule: MATAWI_ENGINE_SUBMODULE },
  "Matawi active": { moduleKey: "muundo", submodule: MATAWI_REGISTRY_SUBMODULE },
  Waumini: { moduleKey: "waumini", submodule: "Orodha ya Waumini" },
  Viongozi: { moduleKey: "viongozi", submodule: "Viongozi wa Matawi/Vituo" },
  "Vikao (mwezi)": { moduleKey: "attendance", submodule: "Sessions" },
  "Mapato (mwezi)": { moduleKey: "fedha" },
};

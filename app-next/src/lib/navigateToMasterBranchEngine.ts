import {
  MASTER_BRANCH_ENGINE_SUBMODULE,
  MATAWI_ENGINE_SUBMODULE,
  MATAWI_REGISTRY_SUBMODULE,
  TAWI_DASHBOARD_SUBMODULE,
} from "./masterBranchEngineHub";

export type MasterBranchNavigateTarget =
  | "executive"
  | "matawi"
  | "registry"
  | "tawi-dashboard";

const TARGET_SUBMODULE: Record<MasterBranchNavigateTarget, string> = {
  executive: MASTER_BRANCH_ENGINE_SUBMODULE,
  matawi: MATAWI_ENGINE_SUBMODULE,
  registry: MATAWI_REGISTRY_SUBMODULE,
  "tawi-dashboard": TAWI_DASHBOARD_SUBMODULE,
};

/** Fungua Injini ya Ngazi Kuu — njia moja ya uendeshaji (sidebar, dashibodi, KPI). */
export function navigateToMasterBranchEngine(
  target: MasterBranchNavigateTarget = "executive",
  recordId?: string
): void {
  window.dispatchEvent(
    new CustomEvent("kmt-portal-navigate", {
      detail: {
        moduleKey: "muundo",
        submodule: TARGET_SUBMODULE[target],
        ...(recordId ? { recordId } : {}),
      },
    })
  );
}

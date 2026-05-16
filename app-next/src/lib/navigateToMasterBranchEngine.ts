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

const TARGET_ENGINE_MODULE: Partial<Record<MasterBranchNavigateTarget, string>> = {
  matawi: "registration",
};

export type MasterBranchNavigateOptions = {
  recordId?: string;
  /** Fungua moduli maalum ndani ya MATAWI MODULE DD.html (mf. registration, finance). */
  engineModuleId?: string;
};

/** Fungua Injini ya Matawi / Ngazi — njia moja ya uendeshaji (sidebar, dashibodi, KPI). */
export function navigateToMasterBranchEngine(
  target: MasterBranchNavigateTarget = "executive",
  options?: MasterBranchNavigateOptions,
): void {
  const recordId = options?.recordId?.trim();
  const engineModuleId = options?.engineModuleId?.trim() || TARGET_ENGINE_MODULE[target];
  window.dispatchEvent(
    new CustomEvent("kmt-portal-navigate", {
      detail: {
        moduleKey: "muundo",
        submodule: TARGET_SUBMODULE[target],
        ...(recordId ? { recordId } : {}),
        ...(engineModuleId ? { engineModuleId } : {}),
      },
    }),
  );
}

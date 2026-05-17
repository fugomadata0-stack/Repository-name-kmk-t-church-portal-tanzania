import type { PortalDirectoryProfile } from "../types";
import type { MasterBranchScope } from "../services/masterBranchEngineService";
import {
  DAYOSISI_ENGINE_SUBMODULE,
  JIMBO_ENGINE_SUBMODULE,
  KMK_T_ENGINE_SUBMODULE,
  MASTER_BRANCH_ENGINE_SUBMODULE,
  MATAWI_ENGINE_SUBMODULE,
  MUUNDO_BRANCH_ENGINE_SUBMODULES,
  TAWI_DASHBOARD_SUBMODULE,
} from "./masterBranchEngineHub";

export type BranchEngineRoute = {
  initialScope: MasterBranchScope;
  initialEntityId: string;
  initialModuleId: string;
};

export function isMuundoBranchEngineSubmodule(submodule: string): boolean {
  return MUUNDO_BRANCH_ENGINE_SUBMODULES.has(submodule.trim());
}

/** Dashibodi Kuu au Muundo — zote zinatumia injini ya Matawi (iframe). */
export function isPortalBranchEngineSurface(moduleKey: string, submodule: string): boolean {
  if (moduleKey === "dashboard") return true;
  return moduleKey === "muundo" && isMuundoBranchEngineSubmodule(submodule);
}

/** Ramani ya submodule ya muundo → iframe (scope, entity, moduli ya DD). */
export function resolveBranchEngineRoute(
  submodule: string,
  portalProfile: PortalDirectoryProfile | null | undefined,
  options?: { recordId?: string | null; engineModuleId?: string | null },
): BranchEngineRoute {
  const recordId = String(options?.recordId ?? "").trim();
  const forcedModule = String(options?.engineModuleId ?? "").trim();
  const profileDayosisi = String(portalProfile?.dayosisi_scope ?? "").trim();
  const profileJimbo = String(portalProfile?.jimbo_scope ?? "").trim();
  const profileTawi = String(portalProfile?.tawi_scope ?? "").trim();

  switch (submodule.trim()) {
    case MASTER_BRANCH_ENGINE_SUBMODULE:
      return {
        initialScope: "kitaifa",
        initialEntityId: recordId,
        initialModuleId: forcedModule || "executive",
      };
    case TAWI_DASHBOARD_SUBMODULE:
      return {
        initialScope: "tawi",
        initialEntityId: profileTawi || recordId,
        initialModuleId: forcedModule || "registration",
      };
    case DAYOSISI_ENGINE_SUBMODULE:
      return {
        initialScope: "dayosisi",
        initialEntityId: profileDayosisi || recordId,
        initialModuleId: forcedModule || "executive",
      };
    case JIMBO_ENGINE_SUBMODULE:
      return {
        initialScope: "jimbo",
        initialEntityId: profileJimbo || recordId,
        initialModuleId: forcedModule || "executive",
      };
    case KMK_T_ENGINE_SUBMODULE:
      return {
        initialScope: "kitaifa",
        initialEntityId: "",
        initialModuleId: forcedModule || "executive",
      };
    case MATAWI_ENGINE_SUBMODULE:
      return {
        initialScope: "kitaifa",
        initialEntityId: recordId,
        initialModuleId: forcedModule || "registration",
      };
    default:
      return {
        initialScope: "kitaifa",
        initialEntityId: recordId,
        initialModuleId: forcedModule,
      };
  }
}

/** Majina ya zamani ya sidebar / URL → submodule ya kisasa. */
export function coerceMuundoSubmodule(raw: string): string {
  const t = raw.trim();
  if (t === "Ngazi Kuu") return MASTER_BRANCH_ENGINE_SUBMODULE;
  return t;
}

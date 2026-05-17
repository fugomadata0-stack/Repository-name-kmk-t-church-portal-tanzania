import { isPortalBranchEngineSurface } from "./branchEngineRoute";

export type PortalLayoutMode = "fullscreen" | "wide" | "contained";

/** Moduli zote — skrini nzima (wide); injini ya matawi — fullscreen. */
export function getPortalLayoutMode(moduleKey: string, submodule: string): PortalLayoutMode {
  if (isPortalBranchEngineSurface(moduleKey, submodule)) return "fullscreen";
  return "wide";
}

export function isPortalWideSurface(moduleKey: string, submodule: string): boolean {
  return getPortalLayoutMode(moduleKey, submodule) !== "contained";
}

export function shouldHidePortalProjectRibbon(moduleKey: string, submodule: string): boolean {
  return isPortalWideSurface(moduleKey, submodule);
}

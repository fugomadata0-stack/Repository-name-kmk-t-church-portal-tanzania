import { MASTER_BRANCH_ENGINE_SUBMODULE } from "./masterBranchEngineHub";

/** URL ya kina ya portal (si iframe) — login moja, injini moja. */
export function buildBranchEnginePortalUrl(options?: {
  moduleKey?: "dashboard" | "muundo";
  submodule?: string;
  recordId?: string;
  engineModuleId?: string;
  origin?: string;
}): string {
  const base =
    options?.origin ??
    (typeof window !== "undefined" ? window.location.origin : "https://v0-church-portal-tanzania.vercel.app");
  const url = new URL("/", base);
  url.searchParams.set("module", options?.moduleKey ?? "muundo");
  url.searchParams.set("submodule", options?.submodule?.trim() || MASTER_BRANCH_ENGINE_SUBMODULE);
  const rid = options?.recordId?.trim();
  const mid = options?.engineModuleId?.trim();
  if (rid) url.searchParams.set("recordId", rid);
  if (mid) url.searchParams.set("engineModuleId", mid);
  return `${url.pathname}${url.search}`;
}

/** Njia ya kudumu ya kufungua injini ndani ya portal (baada ya login). */
export const BRANCH_ENGINE_PORTAL_ENTRY = buildBranchEnginePortalUrl();

/** Baada ya login kutoka link kuu — Dashibodi Kuu (injini mpya). */
export const PORTAL_HOME_AFTER_LOGIN = {
  moduleKey: "dashboard" as const,
  submodule: MASTER_BRANCH_ENGINE_SUBMODULE,
};

export function isBarePortalEntryPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p === "/" || p === "/index.html";
}

/** Hakuna ?module= kwenye URL — tumia injini kama ukurasa wa kwanza baada ya login. */
export function shouldOpenBranchEngineAsPortalHome(search: string): boolean {
  return !new URLSearchParams(search).get("module")?.trim();
}

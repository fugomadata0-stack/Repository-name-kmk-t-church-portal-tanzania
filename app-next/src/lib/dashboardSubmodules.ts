import { modules } from "../data/portalModules";
import { coerceMuundoSubmodule } from "./branchEngineRoute";
import { MASTER_BRANCH_ENGINE_SUBMODULE } from "./masterBranchEngineHub";

/** Submodule ya foleni ya vibali — tumia kwenye URL na arifa (thamani ya kisasa). */
export const DASHBOARD_PENDING_APPROVALS_SUBMODULE = "Vibali vinavyosubiri";

/** Majina ya zamani (Kiingereza / dashibodi ya awali) → injini mpya. */
export const DASHBOARD_SUBMODULE_LEGACY_TO_SW: Record<string, string> = {
  Overview: "Injini ya Ngazi — Executive",
  "KPI Cards": "Injini ya Ngazi — Executive",
  Alerts: "Injini ya Ngazi — Executive",
  "Recent Activity": "Injini ya Ngazi — Executive",
  "Pending Approvals": "Injini ya Ngazi — Executive",
  Muhtasari: "Injini ya Ngazi — Executive",
  "Kadi za KPI": "Injini ya Ngazi — Executive",
  Arifa: "Injini ya Ngazi — Executive",
  "Shughuli za hivi karibuni": "Injini ya Ngazi — Executive",
  "Vibali vinavyosubiri": "Injini ya Ngazi — Executive",
};

const DASHBOARD_LEGACY_LOWER = (() => {
  const out = new Map<string, string>();
  for (const [en, sw] of Object.entries(DASHBOARD_SUBMODULE_LEGACY_TO_SW)) {
    out.set(en.trim().toLowerCase(), sw);
  }
  return out;
})();

export function getDashboardSubmodules(): string[] {
  return modules.find((m) => m.key === "dashboard")?.submodules ?? ["Muhtasari"];
}

export function getDashboardDefaultSubmodule(): string {
  return getDashboardSubmodules()[0] ?? "Muhtasari";
}

function dashboardSubmoduleFromLegacy(t: string, subs: string[]): string | null {
  const exact = DASHBOARD_SUBMODULE_LEGACY_TO_SW[t];
  if (exact && subs.includes(exact)) return exact;
  const ci = DASHBOARD_LEGACY_LOWER.get(t.toLowerCase());
  if (ci && subs.includes(ci)) return ci;
  return null;
}

/**
 * Badilisha submodule ya dashibodi kuwa jina la kisasa; rudisha default ikiwa nje ya orodha.
 * Kiingereza cha zamani bado kinakubaliwa (URL / uhifadhi wa kisessheni), pia herufi kubwa/ndogo.
 */
export function normalizeDashboardSubmodule(raw: string | undefined | null): string {
  const subs = getDashboardSubmodules();
  const def = getDashboardDefaultSubmodule();
  const t = String(raw ?? "").trim();
  if (!t) return def;
  const fromLegacy = dashboardSubmoduleFromLegacy(t, subs);
  if (fromLegacy) return fromLegacy;
  if (subs.includes(t)) return t;
  const ciCanon = subs.find((s) => s.toLowerCase() === t.toLowerCase());
  if (ciCanon) return ciCanon;
  return def;
}

/**
 * Hakikisha submodule inapatana na orodha ya portalModules kwa moduli husika.
 * Dashibodi: legacy EN → SW; moduli zingine: mechi halisi au herufi kubwa/ndogo, la kwanza kama fallback.
 */
export function coerceSubmoduleForModule(moduleKey: string, raw: string | undefined | null): string {
  const m = modules.find((x) => x.key === moduleKey);
  const subs = m?.submodules ?? [];
  if (subs.length === 0) return String(raw ?? "").trim();

  if (moduleKey === "dashboard") {
    return normalizeDashboardSubmodule(raw);
  }

  const tRaw = String(raw ?? "").trim();
  const t = moduleKey === "muundo" ? coerceMuundoSubmodule(tRaw) : tRaw;
  if (!t) {
    if (moduleKey === "muundo" && subs.includes(MASTER_BRANCH_ENGINE_SUBMODULE)) {
      return MASTER_BRANCH_ENGINE_SUBMODULE;
    }
    return subs[0] ?? "";
  }
  if (subs.includes(t)) return t;
  const ci = subs.find((s) => s.toLowerCase() === t.toLowerCase());
  if (ci) return ci;
  return subs[0] ?? "";
}

/** Rudisha submodule ya kwanza ya moduli (imesawazishwa kwa dashibodi). */
export function getFirstSubmoduleForModule(moduleKey: string): string {
  return coerceSubmoduleForModule(moduleKey, null);
}

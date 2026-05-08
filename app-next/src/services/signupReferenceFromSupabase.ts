import { modules } from "../data/portalModules";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList } from "../lib/supabaseResult";
import type { Status } from "../types";
import { fetchDayosisi } from "./dayosisiService";
import { fetchChurchJimbo, fetchChurchTawi } from "./muundoHierarchyService";

export type SignupReferencePayload = {
  dioceses: string[];
  jimboByDiocese: Record<string, string[]>;
  branchByJimbo: Record<string, string[]>;
  departments: string[];
  choirs: string[];
  fellowships: string[];
  institutionTypeLabels: string[];
  institutionsByType: Record<string, string[]>;
};

function structureActive(status: Status): boolean {
  return status === "Active" || status === "Pending";
}

function uniqueSorted(list: string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "sw"));
}

function titlesForSubmodule(rows: { title?: unknown; submodule_key?: unknown }[], submoduleKey: string): string[] {
  const out: string[] = [];
  for (const r of rows) {
    if (String(r.submodule_key ?? "").trim() !== submoduleKey) continue;
    const t = String(r.title ?? "").trim();
    if (t) out.push(t);
  }
  return uniqueSorted(out);
}

/**
 * Orodha za maombi ya usajili — zote kutoka Supabase (muundo + portal_domain_entities).
 * Hitilafu inarushwa ili UI ionyeshe ujumbe, si orodha tupu ya kimakosa.
 */
export async function fetchSignupReferenceFromSupabase(): Promise<SignupReferencePayload> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");

  const [dayosisi, majimbo, matawi, jumRes, taasRes] = await Promise.all([
    fetchDayosisi(),
    fetchChurchJimbo(),
    fetchChurchTawi(),
    c.from("portal_domain_entities").select("title, submodule_key").eq("module_key", "jumuiya").order("title").limit(800),
    c.from("portal_domain_entities").select("title, submodule_key").eq("module_key", "taasisi").order("title").limit(800),
  ]);

  const jRows = unwrapList(jumRes, "portal_domain_entities.jumuiya.list") as { title?: unknown; submodule_key?: unknown }[];
  const tRows = unwrapList(taasRes, "portal_domain_entities.taasisi.list") as { title?: unknown; submodule_key?: unknown }[];

  const dioceses = uniqueSorted(
    dayosisi.filter((d) => structureActive(d.status)).map((d) => d.jina)
  );

  const jimboByDiocese: Record<string, string[]> = {};
  for (const j of majimbo.filter((x) => structureActive(x.status))) {
    const ds = (j.dayosisi || "").trim();
    if (!ds) continue;
    if (!jimboByDiocese[ds]) jimboByDiocese[ds] = [];
    const name = j.jina.trim();
    if (name) jimboByDiocese[ds].push(name);
  }
  for (const k of Object.keys(jimboByDiocese)) {
    jimboByDiocese[k] = uniqueSorted(jimboByDiocese[k]);
  }

  const branchByJimbo: Record<string, string[]> = {};
  for (const t of matawi.filter((x) => structureActive(x.status))) {
    const jb = (t.jimbo || "").trim();
    if (!jb) continue;
    if (!branchByJimbo[jb]) branchByJimbo[jb] = [];
    const name = t.jina.trim();
    if (name) branchByJimbo[jb].push(name);
  }
  for (const k of Object.keys(branchByJimbo)) {
    branchByJimbo[k] = uniqueSorted(branchByJimbo[k]);
  }

  const departments = titlesForSubmodule(jRows, "Idara");
  const choirs = titlesForSubmodule(jRows, "Kwaya");
  const fellowships = uniqueSorted([
    ...titlesForSubmodule(jRows, "JVKMKT"),
    ...titlesForSubmodule(jRows, "JWKMK"),
    ...titlesForSubmodule(jRows, "Makundi ya Huduma"),
  ]);

  const taasisiMod = modules.find((m) => m.key === "taasisi");
  const institutionTypeLabels = [...(taasisiMod?.submodules ?? [])];

  const institutionsByType: Record<string, string[]> = {};
  for (const sk of institutionTypeLabels) {
    institutionsByType[sk] = titlesForSubmodule(tRows, sk);
  }

  return {
    dioceses,
    jimboByDiocese,
    branchByJimbo,
    departments,
    choirs,
    fellowships,
    institutionTypeLabels,
    institutionsByType,
  };
}

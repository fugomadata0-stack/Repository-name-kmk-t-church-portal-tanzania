import { modules } from "../data/portalModules";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList } from "../lib/supabaseResult";

export type SignupReferencePayload = {
  dioceses: string[];
  jimboByDiocese: Record<string, string[]>;
  branchByJimbo: Record<string, string[]>;
  dioceseIdByName: Record<string, string>;
  jimboIdByDioceseAndName: Record<string, string>;
  branchIdByJimboAndName: Record<string, string>;
  departments: string[];
  choirs: string[];
  fellowships: string[];
  institutionTypeLabels: string[];
  institutionsByType: Record<string, string[]>;
};

type SignupStructureRow = { id?: unknown; jina?: unknown; code?: unknown; status?: unknown };
type SignupJimboRow = SignupStructureRow & { dayosisi_id?: unknown };
type SignupTawiRow = SignupStructureRow & { jimbo_id?: unknown };
type DomainEntityRow = { title?: unknown; submodule_key?: unknown; module_key?: unknown };

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

  const [dayRes, jimboRes, tawiRes, jumRes, taasRes, muundoRes] = await Promise.all([
    c.from("dayosisi").select("id, jina, code, status").eq("status", "active").order("jina"),
    c.from("church_jimbo").select("id, jina, dayosisi_id, status").eq("status", "active").order("jina"),
    c.from("church_tawi").select("id, jina, jimbo_id, status").eq("status", "active").order("jina"),
    c
      .from("portal_domain_entities")
      .select("title, submodule_key")
      .eq("module_key", "jumuiya")
      .eq("status", "active")
      .order("title")
      .limit(800),
    c
      .from("portal_domain_entities")
      .select("title, submodule_key")
      .eq("module_key", "taasisi")
      .eq("status", "active")
      .order("title")
      .limit(800),
    c
      .from("portal_domain_entities")
      .select("title, submodule_key, module_key")
      .eq("module_key", "muundo")
      .eq("status", "active")
      .order("title")
      .limit(800),
  ]);

  const dayosisi = unwrapList(dayRes, "signup.dayosisi.list") as SignupStructureRow[];
  const majimbo = unwrapList(jimboRes, "signup.church_jimbo.list") as SignupJimboRow[];
  const matawi = unwrapList(tawiRes, "signup.church_tawi.list") as SignupTawiRow[];
  const jRows = unwrapList(jumRes, "portal_domain_entities.jumuiya.list") as DomainEntityRow[];
  const tRows = unwrapList(taasRes, "portal_domain_entities.taasisi.list") as DomainEntityRow[];
  const mRows = unwrapList(muundoRes, "portal_domain_entities.muundo.list") as DomainEntityRow[];
  const mergedJumuiyaRows = [...jRows, ...mRows];
  const mergedTaasisiRows = [...tRows, ...mRows];

  const dioceses = uniqueSorted(dayosisi.map((d) => String(d.jina ?? "")));
  const dioceseById: Record<string, string> = {};
  const dioceseIdByName: Record<string, string> = {};
  for (const d of dayosisi) {
    const id = String(d.id ?? "").trim();
    const name = String(d.jina ?? "").trim();
    if (!id || !name) continue;
    dioceseById[id] = name;
    dioceseIdByName[name] = id;
  }

  const jimboByDiocese: Record<string, string[]> = {};
  const jimboIdByDioceseAndName: Record<string, string> = {};
  const jimboById: Record<string, string> = {};
  for (const j of majimbo) {
    const id = String(j.id ?? "").trim();
    const name = String(j.jina ?? "").trim();
    const ds = dioceseById[String(j.dayosisi_id ?? "").trim()] || "";
    if (!ds) continue;
    if (!jimboByDiocese[ds]) jimboByDiocese[ds] = [];
    if (name) jimboByDiocese[ds].push(name);
    if (id && name) {
      jimboIdByDioceseAndName[`${ds}::${name}`] = id;
      jimboById[id] = name;
    }
  }
  for (const k of Object.keys(jimboByDiocese)) {
    jimboByDiocese[k] = uniqueSorted(jimboByDiocese[k]);
  }

  const branchByJimbo: Record<string, string[]> = {};
  const branchIdByJimboAndName: Record<string, string> = {};
  for (const t of matawi) {
    const id = String(t.id ?? "").trim();
    const name = String(t.jina ?? "").trim();
    const jb = jimboById[String(t.jimbo_id ?? "").trim()] || "";
    if (!jb) continue;
    if (!branchByJimbo[jb]) branchByJimbo[jb] = [];
    if (name) branchByJimbo[jb].push(name);
    if (id && name) {
      branchIdByJimboAndName[`${jb}::${name}`] = id;
    }
  }
  for (const k of Object.keys(branchByJimbo)) {
    branchByJimbo[k] = uniqueSorted(branchByJimbo[k]);
  }

  const departments = uniqueSorted([
    ...titlesForSubmodule(mergedJumuiyaRows, "Idara"),
    ...titlesForSubmodule(mergedJumuiyaRows, "Huduma"),
  ]);
  const choirs = titlesForSubmodule(mergedJumuiyaRows, "Kwaya");
  const fellowships = uniqueSorted([
    ...titlesForSubmodule(mergedJumuiyaRows, "Jumuiya"),
    ...titlesForSubmodule(mergedJumuiyaRows, "JVKMKT"),
    ...titlesForSubmodule(mergedJumuiyaRows, "JWKMK"),
    ...titlesForSubmodule(mergedJumuiyaRows, "Makundi ya Huduma"),
    ...titlesForSubmodule(mergedJumuiyaRows, "Huduma"),
  ]);

  const taasisiMod = modules.find((m) => m.key === "taasisi");
  const institutionTypeLabels = [...(taasisiMod?.submodules ?? [])];

  const institutionsByType: Record<string, string[]> = {};
  for (const sk of institutionTypeLabels) {
    institutionsByType[sk] = uniqueSorted([
      ...titlesForSubmodule(mergedTaasisiRows, sk),
      ...(sk.toLowerCase() === "taasisi" ? titlesForSubmodule(mergedTaasisiRows, "Taasisi") : []),
    ]);
  }

  return {
    dioceses,
    jimboByDiocese,
    branchByJimbo,
    dioceseIdByName,
    jimboIdByDioceseAndName,
    branchIdByJimboAndName,
    departments,
    choirs,
    fellowships,
    institutionTypeLabels,
    institutionsByType,
  };
}

function attachMappedId(
  next: Record<string, string>,
  idField: string,
  selectedField: string,
  resolver: () => string | undefined
) {
  const existing = String(next[idField] || "").trim();
  if (existing) return;
  const mapped = resolver();
  if (mapped) next[idField] = mapped;
  else if (selectedField in next) next[idField] = String(next[selectedField] || "").trim();
}

/**
 * Jaribu kuongeza IDs za muundo kwenye payload bila kuzuia submit.
 * Iwapo lookup ya references imekosekana, thamani zilizopo kwenye form state hutumika kama fallback.
 */
export function enrichSignupPayloadWithStructureIds(
  payload: Record<string, string>,
  refs: SignupReferencePayload | null
): Record<string, string> {
  const next = { ...payload };
  if (!refs) return next;

  const mapOne = (prefix: string) => {
    const dioceseField = prefix ? `${prefix}Diocese` : "diocese";
    const jimboField = prefix ? `${prefix}Jimbo` : "jimbo";
    const branchField = prefix ? `${prefix}Branch` : "branch";
    const diocese = String(next[dioceseField] || "").trim();
    const jimbo = String(next[jimboField] || "").trim();
    const branch = String(next[branchField] || "").trim();

    attachMappedId(next, prefix ? `${prefix}DioceseId` : "diocese_id", dioceseField, () => refs.dioceseIdByName[diocese]);
    attachMappedId(next, prefix ? `${prefix}JimboId` : "jimbo_id", jimboField, () => refs.jimboIdByDioceseAndName[`${diocese}::${jimbo}`]);
    attachMappedId(next, prefix ? `${prefix}BranchId` : "branch_id", branchField, () => refs.branchIdByJimboAndName[`${jimbo}::${branch}`]);
  };

  mapOne("");
  mapOne("viewer");
  mapOne("department");
  mapOne("fellowship");
  mapOne("choir");
  mapOne("media");
  mapOne("event");

  return next;
}

import type { ChurchStructureEntity, ChurchStructureLevel, DayosisiRecord, JimboRecord, TawiRecord } from "../types";
import type { ScopeTriple } from "../utils/scopeAccess";

function norm(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function normCode(s: string | null | undefined): string {
  return norm(s).replace(/\s+/g, "");
}

/** Panga mzazi kwa parent_id hadi mizizi. */
export function buildStructureAncestorChain(
  entityId: string,
  byId: Map<string, ChurchStructureEntity>
): ChurchStructureEntity[] {
  const out: ChurchStructureEntity[] = [];
  const seen = new Set<string>();
  let cur: ChurchStructureEntity | undefined = byId.get(entityId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return out;
}

export function hierarchyPathFromChain(chain: ChurchStructureEntity[]): string {
  if (!chain.length) return "";
  return chain.map((e) => `${String(e.level).toUpperCase()}: ${e.name}`).join(" → ");
}

function pickFromChain(chain: ChurchStructureEntity[], level: ChurchStructureLevel): ChurchStructureEntity | undefined {
  return chain.filter((e) => e.level === level).pop();
}

/**
 * Tengeneza ScopeTriple ya kidiplomasia kutoka mnyororo wa church_structure_entities,
 * kwa kulinganisha jina/code na jedwali la zamani (dayosisi, majimbo, matawi).
 * Inatumika kwa mipaka ya uhariri ya dayosisi_admin / jimbo_admin / nk.
 */
export function inferLegacyScopeTripleFromStructure(
  entity: ChurchStructureEntity,
  allEntities: ChurchStructureEntity[],
  dayosisi: DayosisiRecord[],
  majimbo: JimboRecord[],
  matawi: TawiRecord[]
): ScopeTriple {
  const byId = new Map(allEntities.map((e) => [e.id, e]));
  const chain = buildStructureAncestorChain(entity.id, byId);
  const dsEntity = pickFromChain(chain, "dayosisi");

  let dayosisi_id: string | null = null;
  if (dsEntity) {
    const hit =
      dayosisi.find((d) => d.id === dsEntity.id) ||
      dayosisi.find((d) => norm(d.jina) === norm(dsEntity.name) && normCode(d.code) === normCode(dsEntity.code)) ||
      dayosisi.find((d) => norm(d.jina) === norm(dsEntity.name)) ||
      dayosisi.find((d) => normCode(d.code) === normCode(dsEntity.code));
    dayosisi_id = hit?.id ?? null;
  }

  const jbEntity = pickFromChain(chain, "jimbo");
  let jimbo_id: string | null = null;
  if (jbEntity) {
    const hit =
      majimbo.find((j) => j.id === jbEntity.id) ||
      majimbo.find((j) => (!dayosisi_id || normUuid(j.dayosisi_id) === dayosisi_id) && norm(j.jina) === norm(jbEntity.name));
    jimbo_id = hit?.id ?? null;
  }

  const twEntity = pickFromChain(chain, "tawi");
  let tawi_id: string | null = null;
  if (twEntity) {
    const hit =
      matawi.find((t) => t.id === twEntity.id) ||
      matawi.find((t) => (!jimbo_id || normUuid(t.jimbo_id) === jimbo_id) && norm(t.jina) === norm(twEntity.name));
    tawi_id = hit?.id ?? null;
  }

  return { dayosisi_id, jimbo_id, tawi_id };
}

function normUuid(s: string | null | undefined): string | null {
  const t = String(s ?? "").trim();
  return t || null;
}

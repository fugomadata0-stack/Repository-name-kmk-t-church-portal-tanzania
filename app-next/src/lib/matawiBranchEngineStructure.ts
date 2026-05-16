import type { DayosisiRecord, JimboRecord, TawiRecord } from "../types";

const OTHER = "Nyingine — Andika Mwenyewe";

export type MatawiDdStructurePayload = {
  diocese: string[];
  jimbo: string[];
  matawi: string[];
  /** Jimbo jina → dayosisi jina (kwa filters baadaye). */
  jimboDayosisi: Record<string, string>;
};

function uniqSorted(names: string[]): string[] {
  return [...new Set(names.map((n) => n.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "sw"),
  );
}

/** Orodha za chaguo kutoka Supabase (si mock za HTML). */
export function buildMatawiDdStructure(
  dayosisi: DayosisiRecord[],
  majimbo: JimboRecord[],
  matawi: TawiRecord[],
): MatawiDdStructurePayload {
  const dsById = new Map(dayosisi.map((d) => [d.id, d.jina?.trim() || ""]));

  const diocese = uniqSorted(dayosisi.map((d) => d.jina ?? ""));
  const jimbo = uniqSorted(majimbo.map((j) => j.jina ?? ""));
  const tawi = uniqSorted(matawi.map((t) => t.jina ?? ""));

  const jimboDayosisi: Record<string, string> = {};
  for (const j of majimbo) {
    const jn = j.jina?.trim();
    if (!jn) continue;
    const dn = dsById.get(String(j.dayosisi_id ?? "")) ?? "";
    if (dn) jimboDayosisi[jn] = dn;
  }

  return {
    diocese: diocese.length ? [...diocese, OTHER] : [OTHER],
    jimbo: jimbo.length ? [...jimbo, OTHER] : [OTHER],
    matawi: tawi.length ? [...tawi, OTHER] : [OTHER],
    jimboDayosisi,
  };
}

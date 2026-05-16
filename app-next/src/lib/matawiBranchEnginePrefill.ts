import type { MasterBranchScope } from "../services/masterBranchEngineService";
import {
  fetchTawiLeaderSlots,
  mergeLeaderSlotsIntoPayload,
} from "../services/matawiBranchEngineSyncService";
import type { BranchEngineWorkspacePayload } from "../services/matawiBranchEngineWorkspaceService";
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../types";

/** Viunganishi vya field id ndani ya matawi-module-dd.html (registration_*). */
export function buildBranchEnginePrefillFields(
  scope: MasterBranchScope,
  entityId: string,
  dayosisi: DayosisiRecord[],
  majimbo: JimboRecord[],
  matawi: TawiRecord[],
): Record<string, string> {
  if (!entityId) return {};

  if (scope === "tawi") {
    const t = matawi.find((x) => x.id === entityId);
    if (!t) return {};
    const out: Record<string, string> = {
      registration_jina_la_tawi: t.jina ?? "",
      registration_dayosisi: t.dayosisi ?? "",
      registration_jimbo: t.jimbo ?? "",
      registration_status: t.status ?? "Active",
    };
    if (t.branch_code) out.registration_branch_code = t.branch_code;
    if (t.mkoa) out.registration_mkoa = t.mkoa;
    if (t.wilaya) out.registration_wilaya = t.wilaya;
    if (t.kata) out.registration_kata = t.kata;
    if (t.mtaa) out.registration_kijiji_mtaa = t.mtaa;
    if (t.founded_date) out.registration_tarehe_ya_kuanzishwa = t.founded_date.slice(0, 10);
    if (t.gps_lat != null && t.gps_lng != null) {
      out.registration_gps_location = `${t.gps_lat},${t.gps_lng}`;
    }
    return out;
  }

  if (scope === "jimbo") {
    const j = majimbo.find((x) => x.id === entityId);
    if (!j) return {};
    return {
      registration_jimbo: j.jina ?? "",
      registration_dayosisi: j.dayosisi ?? "",
      registration_mkoa: j.mkoa ?? "",
    };
  }

  if (scope === "dayosisi") {
    const d = dayosisi.find((x) => x.id === entityId);
    if (!d) return {};
    return {
      registration_dayosisi: d.jina ?? "",
      registration_mkoa: d.mkoa ?? "",
    };
  }

  return {};
}

export function mergePrefillIntoPayload(
  payload: BranchEngineWorkspacePayload,
  prefill: Record<string, string>,
): BranchEngineWorkspacePayload {
  if (Object.keys(prefill).length === 0) return payload;
  const merged = { ...prefill };
  for (const [k, v] of Object.entries(payload.fields)) {
    if (v != null && String(v).trim() !== "") merged[k] = v;
  }
  return { ...payload, fields: merged };
}

/** Pakia tawi + viongozi 4 kutoka Supabase kwenye workspace tupu. */
export async function enrichWorkspaceFromSupabase(
  scope: MasterBranchScope,
  entityId: string,
  payload: BranchEngineWorkspacePayload,
  dayosisi: DayosisiRecord[],
  majimbo: JimboRecord[],
  matawi: TawiRecord[],
): Promise<BranchEngineWorkspacePayload> {
  let next = payload;
  const hasFields = Object.values(payload.fields).some((v) => String(v ?? "").trim() !== "");
  if (!hasFields && entityId) {
    const prefill = buildBranchEnginePrefillFields(scope, entityId, dayosisi, majimbo, matawi);
    next = mergePrefillIntoPayload(next, prefill);
  }
  if (scope === "tawi" && entityId && !next.leaderSlots) {
    try {
      const leaderSlots = await fetchTawiLeaderSlots(entityId);
      next = mergeLeaderSlotsIntoPayload(next, leaderSlots);
    } catch {
      /* viongozi optional */
    }
  }
  return next;
}

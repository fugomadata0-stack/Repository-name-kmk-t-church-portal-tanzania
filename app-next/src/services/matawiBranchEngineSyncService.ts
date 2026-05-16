import { getSupabase } from "../lib/supabaseClient";
import { formatPostgrestError } from "../lib/supabaseErrors";
import { unwrapList } from "../lib/supabaseResult";
import type { BranchEngineLeaderSlot } from "../lib/matawiBranchEngineTypes";
import type { BranchEngineWorkspacePayload } from "./matawiBranchEngineWorkspaceService";
import type { MasterBranchScope } from "./masterBranchEngineService";
import { upsertChurchTawi } from "./muundoHierarchyService";
import { upsertKiongozi } from "./viongoziService";
import type { DayosisiRecord, JimboRecord, KiongoziRecord, TawiRecord } from "../types";

export const BRANCH_ENGINE_TAWI_ROLES = [
  "Mwongozi wa Tawi",
  "Katibu wa Tawi",
  "Naibu Katibu wa Tawi",
  "Mhazini wa Tawi",
] as const;

export type BranchEngineSyncResult = {
  ok: boolean;
  messages: string[];
  tawiId?: string;
  leaderSlots?: Record<string, BranchEngineLeaderSlot>;
};

function f(fields: Record<string, string>, key: string): string {
  return String(fields[key] ?? "").trim();
}

function parseGps(raw: string): { lat: number | null; lng: number | null } {
  const parts = raw.split(/[,;\s]+/).map((x) => Number(x.trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return { lat: parts[0], lng: parts[1] };
  }
  return { lat: null, lng: null };
}

export function matchTawiLeaderRole(cheo: string): string | null {
  const c = cheo.toLowerCase();
  if (c.includes("naibu") && c.includes("katibu")) return "Naibu Katibu wa Tawi";
  if (c.includes("mwongozi") || c.includes("mkuu wa tawi")) return "Mwongozi wa Tawi";
  if (c.includes("katibu")) return "Katibu wa Tawi";
  if (c.includes("mhazini") || c.includes("treasurer")) return "Mhazini wa Tawi";
  return null;
}

export async function fetchTawiLeaderSlots(tawiId: string): Promise<Record<string, BranchEngineLeaderSlot>> {
  const c = getSupabase();
  if (!c || !tawiId) return {};
  const res = await c
    .from("church_viongozi")
    .select("id, jina, cheo, simu, whatsapp, email, status")
    .eq("tawi_id", tawiId)
    .not("status", "eq", "archived")
    .limit(24);
  if (res.error) throw new Error(formatPostgrestError(res.error, "church_viongozi.tawi.leaders"));
  const rows = unwrapList(res, "church_viongozi.tawi.leaders");
  const out: Record<string, BranchEngineLeaderSlot> = {};
  for (const raw of rows) {
    const r = raw as Record<string, unknown>;
    const role = matchTawiLeaderRole(String(r.cheo ?? "")) ?? String(r.cheo ?? "").trim();
    if (!role) continue;
    out[role] = {
      id: String(r.id ?? ""),
      role,
      jina: String(r.jina ?? ""),
      simu: String(r.simu ?? ""),
      whatsapp: String(r.whatsapp ?? ""),
      email: String(r.email ?? ""),
      status: String(r.status ?? "active"),
    };
  }
  return out;
}

function leaderFieldsToSlot(fields: Record<string, string>): BranchEngineLeaderSlot | null {
  const jina = f(fields, "leaders_jina_kamili");
  if (!jina) return null;
  const role = f(fields, "leaders_nafasi_ya_kiongozi") || "Mwongozi wa Tawi";
  return {
    role,
    jina,
    simu: f(fields, "leaders_simu"),
    whatsapp: f(fields, "leaders_whatsapp"),
    email: f(fields, "leaders_email"),
    status: f(fields, "leaders_status") || "Active",
  };
}

function slotToLeaderFields(slot: BranchEngineLeaderSlot): Record<string, string> {
  return {
    leaders_nafasi_ya_kiongozi: slot.role,
    leaders_jina_kamili: slot.jina,
    leaders_simu: slot.simu ?? "",
    leaders_whatsapp: slot.whatsapp ?? "",
    leaders_email: slot.email ?? "",
    leaders_status: slot.status ?? "Active",
  };
}

export function mergeLeaderSlotsIntoPayload(
  payload: BranchEngineWorkspacePayload,
  leaderSlots: Record<string, BranchEngineLeaderSlot>,
): BranchEngineWorkspacePayload {
  const next: BranchEngineWorkspacePayload = {
    ...payload,
    leaderSlots: { ...leaderSlots, ...(payload.leaderSlots ?? {}) },
  };
  const primary =
    leaderSlots["Mwongozi wa Tawi"] ??
    leaderSlots["Katibu wa Tawi"] ??
    Object.values(leaderSlots)[0];
  if (primary) {
    const hasName = Boolean(f(payload.fields, "leaders_jina_kamili"));
    if (!hasName) {
      next.fields = { ...payload.fields, ...slotToLeaderFields(primary) };
    }
  }
  return next;
}

async function syncRegistration(
  fields: Record<string, string>,
  entityId: string,
  dayosisi: DayosisiRecord[],
  majimbo: JimboRecord[],
  _matawi: TawiRecord[],
): Promise<{ tawiId: string; message: string }> {
  const jina = f(fields, "registration_jina_la_tawi");
  if (!jina) throw new Error("Jina la tawi linahitajika ili kusawazisha na orodha rasmi.");

  const gps = parseGps(f(fields, "registration_gps_location"));
  const row: Partial<TawiRecord> & { jina: string } = {
    id: entityId || undefined,
    jina,
    branch_code: f(fields, "registration_branch_code") || null,
    dayosisi: f(fields, "registration_dayosisi"),
    jimbo: f(fields, "registration_jimbo"),
    mkoa: f(fields, "registration_mkoa") || null,
    wilaya: f(fields, "registration_wilaya") || null,
    kata: f(fields, "registration_kata") || null,
    mtaa: f(fields, "registration_kijiji_mtaa") || null,
    gps_lat: gps.lat,
    gps_lng: gps.lng,
    founded_date: f(fields, "registration_tarehe_ya_kuanzishwa") || null,
    status: (f(fields, "registration_status") || "Active") as TawiRecord["status"],
    aina: "Tawi",
  };

  const saved = await upsertChurchTawi(row, dayosisi, majimbo);
  return {
    tawiId: saved.id,
    message: entityId ? "Tawi imesasishwa kwenye orodha rasmi." : "Tawi mpya imeongezwa kwenye orodha rasmi.",
  };
}

async function syncLeaderRow(
  slot: BranchEngineLeaderSlot,
  tawi: TawiRecord,
  tawiId: string,
  majimbo: JimboRecord[],
): Promise<BranchEngineLeaderSlot> {
  const jb = majimbo.find((j) => j.id === tawi.jimbo_id);
  const saved = await upsertKiongozi({
    id: slot.id,
    jina: slot.jina,
    cheo: slot.role,
    ngazi: "Tawi",
    leadership_level: "Tawi Level",
    assigned_entity: tawi.jina,
    tawi_id: tawiId,
    jimbo_id: tawi.jimbo_id ?? jb?.id ?? null,
    dayosisi_id: jb?.dayosisi_id ?? null,
    dayosisi: tawi.dayosisi,
    jimbo: tawi.jimbo,
    tawi: tawi.jina,
    simu: slot.simu ?? "",
    whatsapp: slot.whatsapp,
    email: slot.email,
    status: (slot.status ?? "Active") as KiongoziRecord["status"],
  });
  return {
    id: saved.id,
    role: slot.role,
    jina: saved.jina,
    simu: saved.simu,
    whatsapp: saved.whatsapp ?? undefined,
    email: saved.email ?? undefined,
    status: saved.status,
  };
}

/**
 * Baada ya kuhifadhi workspace, changanisha moduli muhimu na jedwali za Supabase.
 */
export async function syncBranchEngineModuleToSupabase(input: {
  moduleId: string;
  scope: MasterBranchScope;
  entityId: string;
  payload: BranchEngineWorkspacePayload;
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
}): Promise<BranchEngineSyncResult> {
  const messages: string[] = [];
  let tawiId = input.scope === "tawi" ? input.entityId : "";
  let leaderSlots = { ...(input.payload.leaderSlots ?? {}) };

  try {
    if (input.moduleId === "registration" && f(input.payload.fields, "registration_jina_la_tawi")) {
      const reg = await syncRegistration(
        input.payload.fields,
        input.scope === "tawi" ? input.entityId : tawiId,
        input.dayosisi,
        input.majimbo,
        input.matawi,
      );
      tawiId = reg.tawiId;
      messages.push(reg.message);
    }

    if (input.moduleId === "leaders" && (tawiId || input.scope === "tawi")) {
      if (!tawiId && input.scope === "tawi") tawiId = input.entityId;
      if (!tawiId) {
        messages.push("Chagua tawi kwenye baa ya ngazi ili kusawazisha viongozi.");
      } else {
        const tawi = input.matawi.find((t) => t.id === tawiId);
        if (!tawi) throw new Error("Tawi halijapatikana kwenye orodha ya portal.");
        const current = leaderFieldsToSlot(input.payload.fields);
        if (current) {
          const prior = leaderSlots[current.role];
          const saved = await syncLeaderRow(
            { ...current, id: prior?.id },
            tawi,
            tawiId,
            input.majimbo,
          );
          leaderSlots = { ...leaderSlots, [saved.role]: saved };
          messages.push(`Kiongozi (${saved.role}) amesawazishwa na church_viongozi.`);
        }
      }
    }

    return { ok: true, messages, tawiId: tawiId || undefined, leaderSlots };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Usawazishaji umeshindwa.";
    return { ok: false, messages: [msg, ...messages], tawiId: tawiId || undefined, leaderSlots };
  }
}

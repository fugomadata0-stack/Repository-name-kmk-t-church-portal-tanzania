import { mirrorDeleteDayosisiCascade, mirrorLegacyDayosisiToStructure } from "../lib/legacyStructureMirror";
import { getSupabase } from "../lib/supabaseClient";
import { safeLower } from "../lib/safe";
import { formatPostgrestError } from "../lib/supabaseErrors";
import { unwrapList, unwrapOrThrow } from "../lib/supabaseResult";
import type { DayosisiRecord, Status } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedDayosisiId(id: string): boolean {
  return UUID_RE.test(id);
}

function uiStatus(raw: string | null | undefined): Status {
  const s = safeLower(raw ?? "active").replace(/\s+/g, "_");
  if (s === "pending") return "Pending";
  if (s === "inactive") return "Inactive";
  if (s === "archived") return "Archived";
  if (s === "needs_review") return "Needs Review";
  return "Active";
}

function dbStatus(ui: Status): string {
  const x = safeLower(String(ui).trim()).replace(/\s+/g, "_");
  if (x === "active") return "active";
  if (x === "pending") return "pending";
  if (x === "inactive") return "inactive";
  if (x === "archived") return "archived";
  if (x === "needs_review") return "needs_review";
  return "active";
}

export function mapRowToDayosisi(row: Record<string, unknown>): DayosisiRecord {
  return {
    id: String(row.id),
    jina: String(row.jina ?? ""),
    code: String(row.code ?? ""),
    askofu: String(row.askofu ?? ""),
    makao: String(row.ofisi ?? row.anwani ?? ""),
    mkoa: String(row.mkoa ?? ""),
    simu: String(row.simu ?? ""),
    email: String(row.email ?? ""),
    maelezo: String(row.maelezo ?? ""),
    status: uiStatus(row.status as string),
    makamu_mwenyekiti: String(row.makamu_mwenyekiti ?? ""),
    katibu: String(row.katibu ?? ""),
    naibu_katibu: String(row.naibu_katibu ?? ""),
    mhasibu: String(row.mhasibu ?? ""),
  };
}

function toInsertPayload(r: DayosisiRecord) {
  return {
    code: r.code.trim(),
    jina: r.jina.trim(),
    askofu: r.askofu.trim(),
    mkoa: r.mkoa.trim(),
    ofisi: r.makao.trim() || null,
    simu: r.simu.trim() || null,
    email: r.email.trim() || null,
    maelezo: r.maelezo.trim() || null,
    status: dbStatus(r.status),
    makamu_mwenyekiti: (r.makamu_mwenyekiti ?? "").trim() || null,
    katibu: (r.katibu ?? "").trim() || null,
    naibu_katibu: (r.naibu_katibu ?? "").trim() || null,
    mhasibu: (r.mhasibu ?? "").trim() || null,
  };
}

export async function fetchDayosisi(): Promise<DayosisiRecord[]> {
  const client = getSupabase();
  if (!client) return [];
  const res = await client.from("dayosisi").select("*").order("created_at", { ascending: false });
  const rows = unwrapList(res, "dayosisi.list");
  return rows.map((row) => mapRowToDayosisi(row as unknown as Record<string, unknown>));
}

export async function upsertDayosisi(record: DayosisiRecord): Promise<DayosisiRecord> {
  const client = getSupabase();
  if (!client) return record;

  const payload = toInsertPayload(record);

  if (isPersistedDayosisiId(record.id)) {
    const res = await client.from("dayosisi").update(payload).eq("id", record.id).select("*").single();
    const data = unwrapOrThrow(res, "dayosisi.update");
    const mapped = mapRowToDayosisi(data as unknown as Record<string, unknown>);
    void mirrorLegacyDayosisiToStructure(mapped);
    return mapped;
  }

  const res = await client.from("dayosisi").insert(payload).select("*").single();
  const data = unwrapOrThrow(res, "dayosisi.insert");
  const mapped = mapRowToDayosisi(data as unknown as Record<string, unknown>);
  void mirrorLegacyDayosisiToStructure(mapped);
  return mapped;
}

export async function deleteDayosisi(id: string): Promise<void> {
  const client = getSupabase();
  if (!client || !isPersistedDayosisiId(id)) return;
  await mirrorDeleteDayosisiCascade(id);
  const { error } = await client.from("dayosisi").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "dayosisi.delete"));
}

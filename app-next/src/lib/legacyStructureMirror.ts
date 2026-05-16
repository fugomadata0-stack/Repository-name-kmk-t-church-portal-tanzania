/**
 * Sawiana ya muundo wa zamani (dayosisi / church_jimbo / church_tawi) na
 * church_structure_entities — baada ya migration inayolinganisha UUID,
 * mirroring hii huhifadhi Sajili Muundo na skrini za zamani zikiendelea.
 */
import { getSupabase } from "./supabaseClient";
import { isMissingTableError } from "./supabaseErrors";
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../types";

function mapStatusToStructure(s: string | undefined): "active" | "inactive" | "pending" | "archived" {
  const x = String(s ?? "active").toLowerCase().replace(/\s+/g, "_");
  if (x === "inactive") return "inactive";
  if (x === "pending") return "pending";
  if (x === "archived") return "archived";
  if (x === "needs_review") return "pending";
  return "active";
}

async function fetchKmktParent(): Promise<{ id: string; name: string } | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c
    .from("church_structure_entities")
    .select("id,name")
    .eq("level", "kmkt")
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    console.warn("[legacyStructureMirror] kmkt read", error.message);
    return null;
  }
  if (!data?.id) return null;
  return { id: String(data.id), name: String(data.name ?? "") };
}

export async function mirrorLegacyDayosisiToStructure(record: DayosisiRecord): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  try {
    const kmkt = await fetchKmktParent();
    if (!kmkt) return;
    const status = mapStatusToStructure(String(record.status));
    const { error } = await c.from("church_structure_entities").upsert(
      {
        id: record.id,
        name: record.jina.trim(),
        code: record.code.trim(),
        level: "dayosisi",
        parent_id: kmkt.id,
        parent_name: kmkt.name || null,
        region: record.mkoa?.trim() || null,
        district: record.makao?.trim() || null,
        phone: record.simu?.trim() || null,
        email: record.email?.trim() || null,
        description: record.maelezo?.trim() || null,
        leader_name: record.askofu?.trim() || null,
        assistant_leaders: record.makamu_mwenyekiti?.trim() || null,
        secretary_name: record.katibu?.trim() || null,
        notes: record.naibu_katibu?.trim() ? `Naibu katibu: ${record.naibu_katibu.trim()}` : null,
        treasurer_name: record.mhasibu?.trim() || null,
        status,
        official_name: record.jina.trim(),
        short_code: record.code.trim(),
        attachment_urls: [],
        category_tags: [],
        custom_fields: { legacy_source: "dayosisi_upsert", synced_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error && !isMissingTableError(error)) console.warn("[legacyStructureMirror] dayosisi upsert", error.message);
  } catch (e) {
    console.warn("[legacyStructureMirror] dayosisi", e);
  }
}

export async function mirrorLegacyJimboToStructure(row: JimboRecord): Promise<void> {
  const c = getSupabase();
  if (!c || !row.id || !row.dayosisi_id) return;
  try {
    const code = `JIM-${row.id.replace(/-/g, "")}`;
    const status = mapStatusToStructure(String(row.status));
    const { error } = await c.from("church_structure_entities").upsert(
      {
        id: row.id,
        name: row.jina.trim(),
        code,
        level: "jimbo",
        parent_id: row.dayosisi_id,
        parent_name: row.dayosisi?.trim() || null,
        region: row.mkoa?.trim() || null,
        phone: row.simu?.trim() || null,
        leader_name: row.mkuu?.trim() || null,
        status,
        official_name: row.jina.trim(),
        short_code: code,
        description: "Sawiana na church_jimbo.",
        attachment_urls: [],
        category_tags: [],
        custom_fields: { legacy_source: "church_jimbo_upsert", synced_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error && !isMissingTableError(error)) console.warn("[legacyStructureMirror] jimbo upsert", error.message);
  } catch (e) {
    console.warn("[legacyStructureMirror] jimbo", e);
  }
}

export async function mirrorLegacyTawiToStructure(row: TawiRecord): Promise<void> {
  const c = getSupabase();
  if (!c || !row.id || !row.jimbo_id) return;
  try {
    const code = `TW-${row.id.replace(/-/g, "")}`;
    const status = mapStatusToStructure(String(row.status));
    const { error } = await c.from("church_structure_entities").upsert(
      {
        id: row.id,
        name: row.jina.trim(),
        code,
        level: "tawi",
        parent_id: row.jimbo_id,
        parent_name: row.jimbo?.trim() || null,
        phone: row.simu?.trim() || null,
        leader_name: row.kiongozi?.trim() || null,
        entity_type: row.aina?.trim() || "Tawi",
        status,
        official_name: row.jina.trim(),
        short_code: code,
        description: "Sawiana na church_tawi.",
        attachment_urls: [],
        category_tags: [],
        custom_fields: { legacy_source: "church_tawi_upsert", synced_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error && !isMissingTableError(error)) console.warn("[legacyStructureMirror] tawi upsert", error.message);
  } catch (e) {
    console.warn("[legacyStructureMirror] tawi", e);
  }
}

/** Futa rekodi ya structure inayolingana na id (hakuna kufuta legacy hapa). */
export async function mirrorDeleteStructureById(id: string): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  try {
    const { error } = await c.from("church_structure_entities").delete().eq("id", id);
    if (error && !isMissingTableError(error)) console.warn("[legacyStructureMirror] delete", id, error.message);
  } catch (e) {
    console.warn("[legacyStructureMirror] delete", e);
  }
}

/** Kabla ya kufuta dayosisi kwenye jedwali la zamani — ondoa matawi/jimbo/dayosisi kwenye structure (UUID sawa). */
export async function mirrorDeleteDayosisiCascade(dayosisiId: string): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  try {
    const { data: jimbos, error: ej } = await c.from("church_jimbo").select("id").eq("dayosisi_id", dayosisiId);
    if (ej) {
      console.warn("[legacyStructureMirror] cascade dayosisi jimbo list", ej.message);
      await mirrorDeleteStructureById(dayosisiId);
      return;
    }
    if (!jimbos?.length) {
      await mirrorDeleteStructureById(dayosisiId);
      return;
    }
    const jbIds = jimbos.map((j: { id: string }) => j.id);
    const { data: tawi, error: et } = await c.from("church_tawi").select("id").in("jimbo_id", jbIds);
    if (!et && tawi?.length) {
      const twIds = tawi.map((t: { id: string }) => t.id);
      await c.from("church_structure_entities").delete().in("id", twIds);
    }
    await c.from("church_structure_entities").delete().in("id", jbIds);
    await mirrorDeleteStructureById(dayosisiId);
  } catch (e) {
    console.warn("[legacyStructureMirror] cascade dayosisi", e);
  }
}

/** Kabla ya kufuta jimbo kwenye jedwali la zamani. */
export async function mirrorDeleteJimboCascade(jimboId: string): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  try {
    const { data: tawi, error } = await c.from("church_tawi").select("id").eq("jimbo_id", jimboId);
    if (!error && tawi?.length) {
      const twIds = tawi.map((t: { id: string }) => t.id);
      await c.from("church_structure_entities").delete().in("id", twIds);
    }
    await mirrorDeleteStructureById(jimboId);
  } catch (e) {
    console.warn("[legacyStructureMirror] cascade jimbo", e);
  }
}

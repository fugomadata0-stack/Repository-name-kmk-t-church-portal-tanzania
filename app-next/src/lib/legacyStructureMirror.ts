/**
 * Sawiana ya muundo wa zamani (dayosisi / church_jimbo / church_tawi) na
 * church_structure_entities — baada ya migration inayolinganisha UUID,
 * mirroring hii huhifadhi Sajili Muundo na skrini za zamani zikiendelea.
 */
import { getSupabase } from "./supabaseClient";
import { isMissingTableError } from "./supabaseErrors";
import type { ChurchStructureEntity, DayosisiRecord, JimboRecord, TawiRecord } from "../types";

function mapStatusToStructure(s: string | undefined): "active" | "inactive" | "pending" | "archived" {
  const x = String(s ?? "active").toLowerCase().replace(/\s+/g, "_");
  if (x === "inactive") return "inactive";
  if (x === "pending") return "pending";
  if (x === "archived") return "archived";
  if (x === "needs_review") return "pending";
  return "active";
}

function mapStatusToLegacy(s: string | undefined): string {
  const x = String(s ?? "active").toLowerCase().replace(/\s+/g, "_");
  if (x === "inactive") return "inactive";
  if (x === "pending") return "pending";
  if (x === "archived") return "archived";
  if (x === "needs_review") return "needs_review";
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
    let parentLabel = row.dayosisi?.trim() || "";
    if (!parentLabel) {
      const { data: ds } = await c.from("dayosisi").select("jina").eq("id", row.dayosisi_id).maybeSingle();
      parentLabel = ds?.jina ? String(ds.jina) : "";
    }
    const { error } = await c.from("church_structure_entities").upsert(
      {
        id: row.id,
        name: row.jina.trim(),
        code,
        level: "jimbo",
        parent_id: row.dayosisi_id,
        parent_name: parentLabel || null,
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
    let parentLabel = row.jimbo?.trim() || "";
    if (!parentLabel) {
      const { data: jb } = await c.from("church_jimbo").select("jina").eq("id", row.jimbo_id).maybeSingle();
      parentLabel = jb?.jina ? String(jb.jina) : "";
    }
    const { error } = await c.from("church_structure_entities").upsert(
      {
        id: row.id,
        name: row.jina.trim(),
        code,
        level: "tawi",
        parent_id: row.jimbo_id,
        parent_name: parentLabel || null,
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

/** Sajili Muundo (church_structure_entities) → jedwali za zamani (UUID sawa). */
export async function syncStructureDayosisiToLegacy(entity: ChurchStructureEntity): Promise<void> {
  const c = getSupabase();
  if (!c || !entity.id) return;
  try {
    const { error } = await c.from("dayosisi").upsert(
      {
        id: entity.id,
        code: entity.code.trim(),
        jina: entity.name.trim(),
        askofu: entity.leader_name?.trim() || "",
        mkoa: entity.region?.trim() || "",
        ofisi: entity.district?.trim() || entity.address?.trim() || null,
        simu: entity.phone?.trim() || null,
        email: entity.email?.trim() || null,
        maelezo: entity.description?.trim() || null,
        status: mapStatusToLegacy(entity.status),
        makamu_mwenyekiti: entity.assistant_leaders?.trim() || null,
        katibu: entity.secretary_name?.trim() || null,
        mhasibu: entity.treasurer_name?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error && !isMissingTableError(error)) console.warn("[legacyStructureMirror] sync dayosisi", error.message);
  } catch (e) {
    console.warn("[legacyStructureMirror] sync dayosisi", e);
  }
}

export async function syncStructureJimboToLegacy(entity: ChurchStructureEntity): Promise<void> {
  const c = getSupabase();
  if (!c || !entity.id || !entity.parent_id) return;
  try {
    const { error } = await c.from("church_jimbo").upsert(
      {
        id: entity.id,
        dayosisi_id: entity.parent_id,
        jina: entity.name.trim(),
        mkuu: entity.leader_name?.trim() || null,
        mkoa: entity.region?.trim() || null,
        simu: entity.phone?.trim() || null,
        status: mapStatusToLegacy(entity.status),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error && !isMissingTableError(error)) console.warn("[legacyStructureMirror] sync jimbo", error.message);
  } catch (e) {
    console.warn("[legacyStructureMirror] sync jimbo", e);
  }
}

export async function syncStructureTawiToLegacy(entity: ChurchStructureEntity): Promise<void> {
  const c = getSupabase();
  if (!c || !entity.id || !entity.parent_id) return;
  try {
    const { error } = await c.from("church_tawi").upsert(
      {
        id: entity.id,
        jimbo_id: entity.parent_id,
        jina: entity.name.trim(),
        aina: entity.entity_type?.trim() || "Tawi",
        mkoa: entity.region?.trim() || null,
        kiongozi: entity.leader_name?.trim() || null,
        simu: entity.phone?.trim() || null,
        status: mapStatusToLegacy(entity.status),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error && !isMissingTableError(error)) console.warn("[legacyStructureMirror] sync tawi", error.message);
  } catch (e) {
    console.warn("[legacyStructureMirror] sync tawi", e);
  }
}

export async function syncStructureEntityToLegacy(entity: ChurchStructureEntity): Promise<void> {
  if (entity.level === "dayosisi") return syncStructureDayosisiToLegacy(entity);
  if (entity.level === "jimbo") return syncStructureJimboToLegacy(entity);
  if (entity.level === "tawi") return syncStructureTawiToLegacy(entity);
}

/**
 * Sawazisha muundo wa zamani ↔ church_structure_entities (UUID sawa).
 * Inaitwa baada ya kuingia / reload ya dashibodi — mara moja kwa kikao.
 */
export async function repairAllLegacyStructureLinks(): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  try {
    const { data: structureRows, error: se } = await c
      .from("church_structure_entities")
      .select("id,name,code,level,parent_id,parent_name,region,district,address,phone,email,description,leader_name,assistant_leaders,secretary_name,treasurer_name,entity_type,status")
      .in("level", ["dayosisi", "jimbo", "tawi"]);
    if (!se && structureRows?.length) {
      for (const raw of structureRows) {
        await syncStructureEntityToLegacy({
          id: String(raw.id),
          name: String(raw.name ?? ""),
          code: String(raw.code ?? ""),
          level: String(raw.level) as ChurchStructureEntity["level"],
          parent_id: raw.parent_id ? String(raw.parent_id) : null,
          parent_name: raw.parent_name ? String(raw.parent_name) : null,
          region: String(raw.region ?? ""),
          district: String(raw.district ?? ""),
          address: String(raw.address ?? ""),
          phone: String(raw.phone ?? ""),
          email: String(raw.email ?? ""),
          description: String(raw.description ?? ""),
          leader_name: raw.leader_name ? String(raw.leader_name) : null,
          assistant_leaders: raw.assistant_leaders ? String(raw.assistant_leaders) : null,
          secretary_name: raw.secretary_name ? String(raw.secretary_name) : null,
          treasurer_name: raw.treasurer_name ? String(raw.treasurer_name) : null,
          entity_type: raw.entity_type ? String(raw.entity_type) : "",
          status: (String(raw.status ?? "active") as ChurchStructureEntity["status"]) ?? "active",
        } as ChurchStructureEntity);
      }
    }

    const [dayosisiRes, jimboRes, tawiRes] = await Promise.all([
      c.from("dayosisi").select("*"),
      c.from("church_jimbo").select("*, dayosisi ( jina )"),
      c.from("church_tawi").select("*, church_jimbo ( jina, dayosisi ( jina ) )"),
    ]);

    if (!dayosisiRes.error && dayosisiRes.data?.length) {
      const { mapRowToDayosisi } = await import("../services/dayosisiService");
      for (const row of dayosisiRes.data) {
        await mirrorLegacyDayosisiToStructure(mapRowToDayosisi(row as Record<string, unknown>));
      }
    }
    if (!jimboRes.error && jimboRes.data?.length) {
      const { mapJimboRow } = await import("../services/muundoHierarchyService");
      for (const row of jimboRes.data) {
        await mirrorLegacyJimboToStructure(mapJimboRow(row as Record<string, unknown>));
      }
    }
    if (!tawiRes.error && tawiRes.data?.length) {
      const { mapTawiRow } = await import("../services/muundoHierarchyService");
      for (const row of tawiRes.data) {
        await mirrorLegacyTawiToStructure(mapTawiRow(row as Record<string, unknown>));
      }
    }
  } catch (e) {
    console.warn("[legacyStructureMirror] repairAll", e);
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

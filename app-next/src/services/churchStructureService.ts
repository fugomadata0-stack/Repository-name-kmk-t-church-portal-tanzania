import { formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import type { ChurchStructureEntity, ChurchStructureLevel } from "../types";

type StructureFilters = {
  level?: ChurchStructureLevel;
  parent_id?: string | null;
  query?: string;
  includeInactive?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
let warnedMissingStructureTable = false;
let structureTableMissing = false;

function onMissingStructureTable(context: string): void {
  if (warnedMissingStructureTable) return;
  warnedMissingStructureTable = true;
  console.warn(
    `[${context}] Jedwali public.church_structure_entities halipo kwenye schema hii. Orodha ya muundo itakuwa tupu hadi migration ikamilike.`
  );
}

function mapRow(row: Record<string, unknown>): ChurchStructureEntity {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    code: String(row.code ?? ""),
    level: String(row.level ?? "kmkt") as ChurchStructureLevel,
    parent_id: row.parent_id ? String(row.parent_id) : null,
    parent_name: row.parent_name ? String(row.parent_name) : null,
    region: String(row.region ?? ""),
    district: String(row.district ?? ""),
    ward: String(row.ward ?? ""),
    address: String(row.address ?? ""),
    contact_person: String(row.contact_person ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    status: (String(row.status ?? "active") as ChurchStructureEntity["status"]) ?? "active",
    description: String(row.description ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function validatePayload(
  payload: Partial<ChurchStructureEntity>,
  opts?: { requireParent?: boolean; skipName?: boolean }
): void {
  if (!opts?.skipName && !String(payload.name ?? "").trim()) throw new Error("Jaza taarifa muhimu.");
  if (!String(payload.code ?? "").trim()) throw new Error("Jaza taarifa muhimu.");
  if (!String(payload.level ?? "").trim()) throw new Error("Jaza taarifa muhimu.");
  if (opts?.requireParent && !String(payload.parent_id ?? "").trim()) throw new Error("Chagua ngazi ya juu kwanza.");
  if (payload.email && String(payload.email).trim() && !EMAIL_RE.test(String(payload.email).trim())) {
    throw new Error("Barua pepe si sahihi.");
  }
  if (payload.phone && String(payload.phone).trim() && !PHONE_RE.test(String(payload.phone).trim())) {
    throw new Error("Namba ya simu si sahihi.");
  }
}

export async function fetchStructureByLevel(
  level: ChurchStructureLevel,
  includeInactive = false
): Promise<ChurchStructureEntity[]> {
  if (structureTableMissing) return [];
  const c = getSupabase();
  if (!c) return [];
  let q = c.from("church_structure_entities").select("*").eq("level", level).order("name", { ascending: true });
  if (!includeInactive) q = q.eq("status", "active");
  const { data, error } = await q;
  if (error) {
    if (isMissingTableError(error)) {
      structureTableMissing = true;
      onMissingStructureTable(`church_structure_entities.level.${level}`);
      return [];
    }
    throw new Error(formatPostgrestError(error, `church_structure_entities.level.${level}`));
  }
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function fetchChildren(parentId: string, level?: ChurchStructureLevel): Promise<ChurchStructureEntity[]> {
  if (structureTableMissing) return [];
  const c = getSupabase();
  if (!c || !parentId) return [];
  let q = c.from("church_structure_entities").select("*").eq("parent_id", parentId).order("name", { ascending: true });
  if (level) q = q.eq("level", level);
  const { data, error } = await q.eq("status", "active");
  if (error) {
    if (isMissingTableError(error)) {
      structureTableMissing = true;
      onMissingStructureTable("church_structure_entities.children");
      return [];
    }
    throw new Error(formatPostgrestError(error, "church_structure_entities.children"));
  }
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

async function ensureUnique(payload: Partial<ChurchStructureEntity>, id?: string): Promise<void> {
  if (structureTableMissing) return;
  const c = getSupabase();
  if (!c) return;
  const code = String(payload.code ?? "").trim().toLowerCase();
  const name = String(payload.name ?? "").trim().toLowerCase();
  if (code) {
    let q = c.from("church_structure_entities").select("id,code").ilike("code", code);
    if (id) q = q.neq("id", id);
    const { data, error } = await q.limit(1);
    if (error) {
      if (isMissingTableError(error)) {
        structureTableMissing = true;
        onMissingStructureTable("church_structure_entities.unique_code");
        return;
      }
      throw new Error(formatPostgrestError(error, "church_structure_entities.unique_code"));
    }
    if ((data ?? []).length > 0) throw new Error("Code tayari imetumika.");
  }
  if (name) {
    let q = c
      .from("church_structure_entities")
      .select("id,name,parent_id,level")
      .ilike("name", name)
      .eq("level", String(payload.level ?? ""));
    if (payload.parent_id) q = q.eq("parent_id", payload.parent_id);
    if (id) q = q.neq("id", id);
    const { data, error } = await q.limit(1);
    if (error) {
      if (isMissingTableError(error)) {
        structureTableMissing = true;
        onMissingStructureTable("church_structure_entities.unique_name_parent");
        return;
      }
      throw new Error(formatPostgrestError(error, "church_structure_entities.unique_name_parent"));
    }
    if ((data ?? []).length > 0) throw new Error("Jina hili tayari lipo chini ya mzazi huyu.");
  }
}

export async function createStructureEntity(payload: Partial<ChurchStructureEntity>): Promise<ChurchStructureEntity> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  validatePayload(payload, { requireParent: payload.level !== "kmkt" });
  await ensureUnique(payload);
  const row = {
    name: String(payload.name ?? "").trim(),
    code: String(payload.code ?? "").trim(),
    level: String(payload.level ?? "kmkt"),
    parent_id: payload.parent_id ?? null,
    parent_name: payload.parent_name?.trim() || null,
    region: payload.region?.trim() || null,
    district: payload.district?.trim() || null,
    ward: payload.ward?.trim() || null,
    address: payload.address?.trim() || null,
    contact_person: payload.contact_person?.trim() || null,
    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,
    status: payload.status ?? "active",
    description: payload.description?.trim() || null,
  };
  const { data, error } = await c.from("church_structure_entities").insert(row).select("*").single();
  if (error && isMissingTableError(error)) {
    structureTableMissing = true;
    throw new Error("Muundo wa kanisa bado haujasanidiwa kwenye DB (church_structure_entities).");
  }
  if (error) throw new Error(formatPostgrestError(error, "church_structure_entities.create"));
  return mapRow(data as Record<string, unknown>);
}

export async function updateStructureEntity(
  id: string,
  payload: Partial<ChurchStructureEntity>
): Promise<ChurchStructureEntity> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  validatePayload(payload, { skipName: !payload.name, requireParent: false });
  await ensureUnique(payload, id);
  const patch = {
    ...(payload.name != null ? { name: String(payload.name).trim() } : {}),
    ...(payload.code != null ? { code: String(payload.code).trim() } : {}),
    ...(payload.level != null ? { level: payload.level } : {}),
    ...(payload.parent_id !== undefined ? { parent_id: payload.parent_id } : {}),
    ...(payload.parent_name !== undefined ? { parent_name: payload.parent_name?.trim() || null } : {}),
    ...(payload.region !== undefined ? { region: payload.region?.trim() || null } : {}),
    ...(payload.district !== undefined ? { district: payload.district?.trim() || null } : {}),
    ...(payload.ward !== undefined ? { ward: payload.ward?.trim() || null } : {}),
    ...(payload.address !== undefined ? { address: payload.address?.trim() || null } : {}),
    ...(payload.contact_person !== undefined ? { contact_person: payload.contact_person?.trim() || null } : {}),
    ...(payload.phone !== undefined ? { phone: payload.phone?.trim() || null } : {}),
    ...(payload.email !== undefined ? { email: payload.email?.trim() || null } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await c.from("church_structure_entities").update(patch).eq("id", id).select("*").single();
  if (error && isMissingTableError(error)) {
    structureTableMissing = true;
    throw new Error("Muundo wa kanisa bado haujasanidiwa kwenye DB (church_structure_entities).");
  }
  if (error) throw new Error(formatPostgrestError(error, "church_structure_entities.update"));
  return mapRow(data as Record<string, unknown>);
}

export async function archiveStructureEntity(id: string): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const { error } = await c
    .from("church_structure_entities")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error && isMissingTableError(error)) {
    structureTableMissing = true;
    throw new Error("Muundo wa kanisa bado haujasanidiwa kwenye DB (church_structure_entities).");
  }
  if (error) throw new Error(formatPostgrestError(error, "church_structure_entities.archive"));
}

export async function searchStructureEntities(filters: StructureFilters): Promise<ChurchStructureEntity[]> {
  if (structureTableMissing) return [];
  const c = getSupabase();
  if (!c) return [];
  let q = c.from("church_structure_entities").select("*").order("name", { ascending: true });
  if (filters.level) q = q.eq("level", filters.level);
  if (filters.parent_id != null) q = q.eq("parent_id", filters.parent_id);
  if (!filters.includeInactive) q = q.eq("status", "active");
  if (filters.query?.trim()) q = q.or(`name.ilike.%${filters.query.trim()}%,code.ilike.%${filters.query.trim()}%`);
  const { data, error } = await q.limit(1000);
  if (error) {
    if (isMissingTableError(error)) {
      structureTableMissing = true;
      onMissingStructureTable("church_structure_entities.search");
      return [];
    }
    throw new Error(formatPostgrestError(error, "church_structure_entities.search"));
  }
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function fetchCascadeOptions(): Promise<{
  kmkt: ChurchStructureEntity[];
  dayosisi: ChurchStructureEntity[];
  majimbo: ChurchStructureEntity[];
  matawi: ChurchStructureEntity[];
  idara: ChurchStructureEntity[];
  huduma: ChurchStructureEntity[];
  taasisi: ChurchStructureEntity[];
  jumuiya: ChurchStructureEntity[];
}> {
  const levels: ChurchStructureLevel[] = ["kmkt", "dayosisi", "jimbo", "tawi", "idara", "huduma", "taasisi", "jumuiya"];
  const [kmkt, dayosisi, majimbo, matawi, idara, huduma, taasisi, jumuiya] = await Promise.all(
    levels.map((lvl) => fetchStructureByLevel(lvl))
  );
  return { kmkt, dayosisi, majimbo, matawi, idara, huduma, taasisi, jumuiya };
}

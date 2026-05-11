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

async function authUserId(): Promise<string | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data.user?.id ?? null;
}

/** Thibitisha URL; rudisha undefined ikiwa tupu; ongeza https:// ikiwa inakosa. */
function normalizeOptionalHttpUrl(raw: string | undefined, label: string): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  const isValid = (s: string): boolean => {
    try {
      new URL(s);
      return true;
    } catch {
      return false;
    }
  };
  if (isValid(t)) return t;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  if (isValid(withProto)) return withProto;
  throw new Error(`${label} si kiungo halali.`);
}
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
    official_name: row.official_name ? String(row.official_name) : "",
    short_code: row.short_code ? String(row.short_code) : "",
    logo_url: row.logo_url ? String(row.logo_url) : "",
    photo_url: row.photo_url ? String(row.photo_url) : "",
    signature_url: row.signature_url ? String(row.signature_url) : "",
    entity_type: row.entity_type ? String(row.entity_type) : "",
    level: String(row.level ?? "kmkt") as ChurchStructureLevel,
    parent_id: row.parent_id ? String(row.parent_id) : null,
    parent_name: row.parent_name ? String(row.parent_name) : null,
    region: String(row.region ?? ""),
    district: String(row.district ?? ""),
    ward: String(row.ward ?? ""),
    village_street: String(row.village_street ?? ""),
    address: String(row.address ?? ""),
    website: String(row.website ?? ""),
    google_maps_url: row.google_maps_url ? String(row.google_maps_url) : "",
    gps_coordinates: String(row.gps_coordinates ?? ""),
    contact_person: String(row.contact_person ?? ""),
    phone: String(row.phone ?? ""),
    whatsapp: row.whatsapp ? String(row.whatsapp) : "",
    email: String(row.email ?? ""),
    established_date: row.established_date ? String(row.established_date).slice(0, 10) : null,
    leader_name: row.leader_name ? String(row.leader_name) : null,
    assistant_leaders: row.assistant_leaders ? String(row.assistant_leaders) : null,
    secretary_name: row.secretary_name ? String(row.secretary_name) : null,
    treasurer_name: row.treasurer_name ? String(row.treasurer_name) : null,
    notes: row.notes ? String(row.notes) : null,
    attachment_urls: Array.isArray(row.attachment_urls) ? (row.attachment_urls as unknown[]).map((x) => String(x)) : [],
    custom_fields:
      row.custom_fields && typeof row.custom_fields === "object" && !Array.isArray(row.custom_fields)
        ? (row.custom_fields as Record<string, unknown>)
        : {},
    category_tags: Array.isArray(row.category_tags) ? (row.category_tags as unknown[]).map((x) => String(x)) : [],
    hierarchy_summary: row.hierarchy_summary ? String(row.hierarchy_summary) : null,
    profile_completeness: Number(row.profile_completeness ?? 0),
    children_count: Number(row.children_count ?? 0),
    members_count: Number(row.members_count ?? 0),
    families_count: Number(row.families_count ?? 0),
    status: (String(row.status ?? "active") as ChurchStructureEntity["status"]) ?? "active",
    description: String(row.description ?? ""),
    created_by: row.created_by ? String(row.created_by) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null,
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
  if (payload.whatsapp && String(payload.whatsapp).trim() && !PHONE_RE.test(String(payload.whatsapp).trim())) {
    throw new Error("Namba ya WhatsApp si sahihi.");
  }
  if (payload.website != null && String(payload.website).trim()) {
    normalizeOptionalHttpUrl(String(payload.website), "Tovuti");
  }
  if (payload.google_maps_url != null && String(payload.google_maps_url).trim()) {
    normalizeOptionalHttpUrl(String(payload.google_maps_url), "Kiungo cha Google Maps");
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
  const uid = await authUserId();
  const websiteNorm = payload.website != null ? normalizeOptionalHttpUrl(payload.website, "Tovuti") : undefined;
  const mapsNorm =
    payload.google_maps_url != null ? normalizeOptionalHttpUrl(payload.google_maps_url, "Kiungo cha Google Maps") : undefined;
  const row = {
    name: String(payload.name ?? "").trim(),
    code: String(payload.code ?? "").trim(),
    official_name: payload.official_name?.trim() || null,
    short_code: payload.short_code?.trim() || null,
    logo_url: payload.logo_url?.trim() || null,
    photo_url: payload.photo_url?.trim() || null,
    signature_url: payload.signature_url?.trim() || null,
    entity_type: payload.entity_type?.trim() || null,
    level: String(payload.level ?? "kmkt"),
    parent_id: payload.parent_id ?? null,
    parent_name: payload.parent_name?.trim() || null,
    region: payload.region?.trim() || null,
    district: payload.district?.trim() || null,
    ward: payload.ward?.trim() || null,
    village_street: payload.village_street?.trim() || null,
    address: payload.address?.trim() || null,
    website: websiteNorm ?? (payload.website?.trim() || null),
    google_maps_url: mapsNorm ?? (payload.google_maps_url?.trim() || null),
    gps_coordinates: payload.gps_coordinates?.trim() || null,
    contact_person: payload.contact_person?.trim() || null,
    phone: payload.phone?.trim() || null,
    whatsapp: payload.whatsapp?.trim() || null,
    email: payload.email?.trim() || null,
    established_date: payload.established_date || null,
    leader_name: payload.leader_name?.trim() || null,
    assistant_leaders: payload.assistant_leaders?.trim() || null,
    secretary_name: payload.secretary_name?.trim() || null,
    treasurer_name: payload.treasurer_name?.trim() || null,
    notes: payload.notes?.trim() || null,
    attachment_urls: payload.attachment_urls ?? [],
    custom_fields: payload.custom_fields ?? {},
    category_tags: payload.category_tags ?? [],
    hierarchy_summary: payload.hierarchy_summary?.trim() || null,
    profile_completeness: payload.profile_completeness ?? 0,
    children_count: payload.children_count ?? 0,
    members_count: payload.members_count ?? 0,
    families_count: payload.families_count ?? 0,
    status: payload.status ?? "active",
    description: payload.description?.trim() || null,
    created_by: uid,
    updated_by: uid,
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
  const uid = await authUserId();
  const patch = {
    ...(payload.name != null ? { name: String(payload.name).trim() } : {}),
    ...(payload.code != null ? { code: String(payload.code).trim() } : {}),
    ...(payload.official_name !== undefined ? { official_name: payload.official_name?.trim() || null } : {}),
    ...(payload.short_code !== undefined ? { short_code: payload.short_code?.trim() || null } : {}),
    ...(payload.logo_url !== undefined ? { logo_url: payload.logo_url?.trim() || null } : {}),
    ...(payload.photo_url !== undefined ? { photo_url: payload.photo_url?.trim() || null } : {}),
    ...(payload.signature_url !== undefined ? { signature_url: payload.signature_url?.trim() || null } : {}),
    ...(payload.entity_type !== undefined ? { entity_type: payload.entity_type?.trim() || null } : {}),
    ...(payload.level != null ? { level: payload.level } : {}),
    ...(payload.parent_id !== undefined ? { parent_id: payload.parent_id } : {}),
    ...(payload.parent_name !== undefined ? { parent_name: payload.parent_name?.trim() || null } : {}),
    ...(payload.region !== undefined ? { region: payload.region?.trim() || null } : {}),
    ...(payload.district !== undefined ? { district: payload.district?.trim() || null } : {}),
    ...(payload.ward !== undefined ? { ward: payload.ward?.trim() || null } : {}),
    ...(payload.village_street !== undefined ? { village_street: payload.village_street?.trim() || null } : {}),
    ...(payload.address !== undefined ? { address: payload.address?.trim() || null } : {}),
    ...(payload.website !== undefined
      ? { website: payload.website?.trim() ? normalizeOptionalHttpUrl(payload.website, "Tovuti") ?? null : null }
      : {}),
    ...(payload.google_maps_url !== undefined
      ? {
          google_maps_url: payload.google_maps_url?.trim()
            ? normalizeOptionalHttpUrl(payload.google_maps_url, "Kiungo cha Google Maps") ?? null
            : null,
        }
      : {}),
    ...(payload.gps_coordinates !== undefined ? { gps_coordinates: payload.gps_coordinates?.trim() || null } : {}),
    ...(payload.contact_person !== undefined ? { contact_person: payload.contact_person?.trim() || null } : {}),
    ...(payload.phone !== undefined ? { phone: payload.phone?.trim() || null } : {}),
    ...(payload.whatsapp !== undefined ? { whatsapp: payload.whatsapp?.trim() || null } : {}),
    ...(payload.email !== undefined ? { email: payload.email?.trim() || null } : {}),
    ...(payload.established_date !== undefined ? { established_date: payload.established_date || null } : {}),
    ...(payload.leader_name !== undefined ? { leader_name: payload.leader_name?.trim() || null } : {}),
    ...(payload.assistant_leaders !== undefined ? { assistant_leaders: payload.assistant_leaders?.trim() || null } : {}),
    ...(payload.secretary_name !== undefined ? { secretary_name: payload.secretary_name?.trim() || null } : {}),
    ...(payload.treasurer_name !== undefined ? { treasurer_name: payload.treasurer_name?.trim() || null } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes?.trim() || null } : {}),
    ...(payload.attachment_urls !== undefined ? { attachment_urls: payload.attachment_urls ?? [] } : {}),
    ...(payload.custom_fields !== undefined ? { custom_fields: payload.custom_fields ?? {} } : {}),
    ...(payload.category_tags !== undefined ? { category_tags: payload.category_tags ?? [] } : {}),
    ...(payload.hierarchy_summary !== undefined ? { hierarchy_summary: payload.hierarchy_summary?.trim() || null } : {}),
    ...(payload.profile_completeness !== undefined ? { profile_completeness: payload.profile_completeness ?? 0 } : {}),
    ...(payload.children_count !== undefined ? { children_count: payload.children_count ?? 0 } : {}),
    ...(payload.members_count !== undefined ? { members_count: payload.members_count ?? 0 } : {}),
    ...(payload.families_count !== undefined ? { families_count: payload.families_count ?? 0 } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
    updated_at: new Date().toISOString(),
    updated_by: uid,
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
  const uid = await authUserId();
  const { error } = await c
    .from("church_structure_entities")
    .update({ status: "archived", updated_at: new Date().toISOString(), updated_by: uid })
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

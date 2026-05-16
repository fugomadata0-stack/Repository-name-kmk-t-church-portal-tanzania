import { mbToBytes, validateSelectedFile } from "../lib/fileUploadGuard";
import {
  assertTermOrder,
  assertValidEmailOptional,
  assertValidLeaderAppointmentStoragePath,
  isValidInternationalPhone,
  normalizeAppointmentDocumentStored,
  normalizeOptionalHttpsUrl,
  normalizeOptionalImageOrDocUrl,
  normalizePhoneStored,
} from "../lib/structureFieldValidation";
import { formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { STORAGE_BUCKETS } from "../lib/storageBuckets";
import { getSupabase } from "../lib/supabase";
import { enterpriseStorageUpload, PORTAL_DOCUMENT_FILE_GUARD } from "../lib/enterpriseStorageUpload";
import { buildSafeStoragePath } from "../lib/storageUpload";
import type { ChurchStructureLeader } from "../types";

let leadersTableMissing = false;

/** Bucket ya faragha — inalingana na migration `storage_structure_leaders_bucket`. */
export const STRUCTURE_LEADERS_STORAGE_BUCKET = STORAGE_BUCKETS.structureLeaders;

function mapLeader(row: Record<string, unknown>): ChurchStructureLeader {
  return {
    id: String(row.id ?? ""),
    entity_id: String(row.entity_id ?? ""),
    position_title: String(row.position_title ?? ""),
    leadership_category: row.leadership_category ? String(row.leadership_category) : "",
    full_name: String(row.full_name ?? ""),
    phone: row.phone ? String(row.phone) : "",
    email: row.email ? String(row.email) : "",
    photo_url: row.photo_url ? String(row.photo_url) : "",
    signature_url: row.signature_url ? String(row.signature_url) : "",
    appointment_document_url: row.appointment_document_url ? String(row.appointment_document_url) : "",
    term_start: row.term_start ? String(row.term_start).slice(0, 10) : null,
    term_end: row.term_end ? String(row.term_end).slice(0, 10) : null,
    status: (String(row.status ?? "active") as ChurchStructureLeader["status"]) ?? "active",
    notes: row.notes ? String(row.notes) : "",
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    created_by: row.created_by ? String(row.created_by) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null,
  };
}

function validateLeaderPayload(
  p: Partial<ChurchStructureLeader>,
  mode: "create" | "update",
  structureEntityId?: string
): void {
  const needTitle = mode === "create" || p.position_title !== undefined;
  const needName = mode === "create" || p.full_name !== undefined;
  if (needTitle && !String(p.position_title ?? "").trim()) throw new Error("Cheo cha kiongozi linahitajika.");
  if (needName && !String(p.full_name ?? "").trim()) throw new Error("Jina kamili la kiongozi linahitajika.");
  assertValidEmailOptional(p.email, "Barua pepe ya kiongozi");
  if (p.phone?.trim() && !isValidInternationalPhone(p.phone)) {
    throw new Error("Simu ya kiongozi si sahihi (tumia tarakimu 9–15).");
  }
  assertTermOrder(p.term_start, p.term_end);
  const doc = p.appointment_document_url?.trim();
  if (doc) {
    if (/^https?:\/\//i.test(doc)) {
      normalizeOptionalHttpsUrl(doc, "Hati ya uteuzi");
    } else {
      const seg = doc.split("/")[0] ?? "";
      assertValidLeaderAppointmentStoragePath(doc, structureEntityId ?? seg);
    }
  }
  if (p.photo_url?.trim()) normalizeOptionalImageOrDocUrl(p.photo_url, "Picha ya kiongozi");
  if (p.signature_url?.trim()) normalizeOptionalImageOrDocUrl(p.signature_url, "Saini ya kiongozi");
}

/** Pakia hati ya uteuzi (PDF/picha) — rudisha njia ndani ya bucket (si URL ya umma). */
export async function uploadStructureLeaderAppointmentDoc(entityId: string, file: File): Promise<string> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const guard = validateSelectedFile(file, {
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp"],
    maxBytes: mbToBytes(48),
    allowedMimePrefixes: ["image/", "application/pdf"],
    labelSw: "Hati ya uteuzi",
  });
  if (guard) throw new Error(guard);
  const path = buildSafeStoragePath(`${entityId}/uteuzi`, file.name);
  await enterpriseStorageUpload({
    bucket: STRUCTURE_LEADERS_STORAGE_BUCKET,
    file,
    path,
    guard: {
      ...PORTAL_DOCUMENT_FILE_GUARD,
      allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp"],
      allowedMimePrefixes: ["image/", "application/pdf"],
      maxBytes: 48 * 1024 * 1024,
      labelSw: "Hati ya uteuzi",
    },
    upsert: true,
    optimizeImage: true,
  });
  return path;
}

/** URL ya muda mfupi kwa faili ya ndani ya bucket (faragha). */
export async function signStructureLeaderAppointmentPath(
  objectPath: string,
  expiresSec = 3600
): Promise<string | null> {
  const t = objectPath?.trim();
  if (!t || /^https?:\/\//i.test(t)) return null;
  const seg = t.split("/")[0] ?? "";
  try {
    assertValidLeaderAppointmentStoragePath(t, seg);
  } catch {
    return null;
  }
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c.storage.from(STRUCTURE_LEADERS_STORAGE_BUCKET).createSignedUrl(t, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function fetchLeadersForEntity(entityId: string): Promise<ChurchStructureLeader[]> {
  if (leadersTableMissing || !entityId) return [];
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c
    .from("church_structure_leaders")
    .select("*")
    .eq("entity_id", entityId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingTableError(error)) {
      leadersTableMissing = true;
      return [];
    }
    throw new Error(formatPostgrestError(error, "church_structure_leaders.list"));
  }
  return (data ?? []).map((r) => mapLeader(r as Record<string, unknown>));
}

export async function createStructureLeader(
  entityId: string,
  payload: Partial<ChurchStructureLeader>
): Promise<ChurchStructureLeader> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  validateLeaderPayload(payload, "create", entityId);
  const { data: userData } = await c.auth.getUser();
  const uid = userData?.user?.id ?? null;
  const row = {
    entity_id: entityId,
    position_title: String(payload.position_title ?? "").trim(),
    leadership_category: payload.leadership_category?.trim() || null,
    full_name: String(payload.full_name ?? "").trim(),
    phone: normalizePhoneStored(payload.phone),
    email: payload.email?.trim() || null,
    photo_url: payload.photo_url?.trim() ? normalizeOptionalImageOrDocUrl(payload.photo_url, "Picha ya kiongozi") ?? null : null,
    signature_url: payload.signature_url?.trim()
      ? normalizeOptionalImageOrDocUrl(payload.signature_url, "Saini ya kiongozi") ?? null
      : null,
    appointment_document_url: normalizeAppointmentDocumentStored(payload.appointment_document_url),
    term_start: payload.term_start || null,
    term_end: payload.term_end || null,
    status: payload.status ?? "active",
    notes: payload.notes?.trim() || null,
    sort_order: payload.sort_order ?? 0,
    created_by: uid,
    updated_by: uid,
  };
  const { data, error } = await c.from("church_structure_leaders").insert(row).select("*").single();
  if (error) {
    if (isMissingTableError(error)) {
      leadersTableMissing = true;
      throw new Error("Jedwali la viongozi wa muundo halipo bado (migration).");
    }
    throw new Error(formatPostgrestError(error, "church_structure_leaders.create"));
  }
  return mapLeader(data as Record<string, unknown>);
}

export async function updateStructureLeader(
  id: string,
  payload: Partial<ChurchStructureLeader>
): Promise<ChurchStructureLeader> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const { data: existingRow } = await c.from("church_structure_leaders").select("entity_id").eq("id", id).maybeSingle();
  const ent = existingRow && typeof existingRow === "object" && "entity_id" in existingRow
    ? String((existingRow as { entity_id?: unknown }).entity_id ?? "")
    : "";
  validateLeaderPayload(payload, "update", ent || undefined);
  const { data: userData } = await c.auth.getUser();
  const uid = userData?.user?.id ?? null;
  const patch: Record<string, unknown> = {
    updated_by: uid,
  };
  if (payload.position_title !== undefined) patch.position_title = String(payload.position_title).trim();
  if (payload.leadership_category !== undefined) patch.leadership_category = payload.leadership_category?.trim() || null;
  if (payload.full_name !== undefined) patch.full_name = String(payload.full_name).trim();
  if (payload.phone !== undefined) patch.phone = normalizePhoneStored(payload.phone);
  if (payload.email !== undefined) patch.email = payload.email?.trim() || null;
  if (payload.photo_url !== undefined) {
    patch.photo_url = payload.photo_url?.trim()
      ? normalizeOptionalImageOrDocUrl(payload.photo_url, "Picha ya kiongozi") ?? null
      : null;
  }
  if (payload.signature_url !== undefined) {
    patch.signature_url = payload.signature_url?.trim()
      ? normalizeOptionalImageOrDocUrl(payload.signature_url, "Saini ya kiongozi") ?? null
      : null;
  }
  if (payload.appointment_document_url !== undefined) {
    patch.appointment_document_url = normalizeAppointmentDocumentStored(payload.appointment_document_url);
  }
  if (payload.term_start !== undefined) patch.term_start = payload.term_start || null;
  if (payload.term_end !== undefined) patch.term_end = payload.term_end || null;
  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.notes !== undefined) patch.notes = payload.notes?.trim() || null;
  if (payload.sort_order !== undefined) patch.sort_order = payload.sort_order;
  const { data, error } = await c.from("church_structure_leaders").update(patch).eq("id", id).select("*").single();
  if (error) {
    if (isMissingTableError(error)) {
      leadersTableMissing = true;
      throw new Error("Jedwali la viongozi wa muundo halipo bado (migration).");
    }
    throw new Error(formatPostgrestError(error, "church_structure_leaders.update"));
  }
  return mapLeader(data as Record<string, unknown>);
}

export async function archiveStructureLeader(id: string): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const { data: userData } = await c.auth.getUser();
  const uid = userData?.user?.id ?? null;
  const { error } = await c
    .from("church_structure_leaders")
    .update({ status: "archived", updated_by: uid })
    .eq("id", id);
  if (error) {
    if (isMissingTableError(error)) {
      leadersTableMissing = true;
      throw new Error("Jedwali la viongozi wa muundo halipo bado (migration).");
    }
    throw new Error(formatPostgrestError(error, "church_structure_leaders.archive"));
  }
}

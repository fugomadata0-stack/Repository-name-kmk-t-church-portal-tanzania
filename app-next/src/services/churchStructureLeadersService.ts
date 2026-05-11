import { formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import type { ChurchStructureLeader } from "../types";

let leadersTableMissing = false;

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

function validateLeaderPayload(p: Partial<ChurchStructureLeader>, mode: "create" | "update"): void {
  const needTitle = mode === "create" || p.position_title !== undefined;
  const needName = mode === "create" || p.full_name !== undefined;
  if (needTitle && !String(p.position_title ?? "").trim()) throw new Error("Cheo cha kiongozi linahitajika.");
  if (needName && !String(p.full_name ?? "").trim()) throw new Error("Jina kamili la kiongozi linahitajika.");
  if (p.email?.trim() && !EMAIL_RE.test(p.email.trim())) throw new Error("Barua pepe ya kiongozi si sahihi.");
  if (p.phone?.trim() && !PHONE_RE.test(p.phone.trim())) throw new Error("Simu ya kiongozi si sahihi.");
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
  validateLeaderPayload(payload, "create");
  const { data: userData } = await c.auth.getUser();
  const uid = userData?.user?.id ?? null;
  const row = {
    entity_id: entityId,
    position_title: String(payload.position_title ?? "").trim(),
    leadership_category: payload.leadership_category?.trim() || null,
    full_name: String(payload.full_name ?? "").trim(),
    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,
    photo_url: payload.photo_url?.trim() || null,
    signature_url: payload.signature_url?.trim() || null,
    appointment_document_url: payload.appointment_document_url?.trim() || null,
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
  validateLeaderPayload(payload, "update");
  const { data: userData } = await c.auth.getUser();
  const uid = userData?.user?.id ?? null;
  const patch: Record<string, unknown> = {
    updated_by: uid,
  };
  if (payload.position_title !== undefined) patch.position_title = String(payload.position_title).trim();
  if (payload.leadership_category !== undefined) patch.leadership_category = payload.leadership_category?.trim() || null;
  if (payload.full_name !== undefined) patch.full_name = String(payload.full_name).trim();
  if (payload.phone !== undefined) patch.phone = payload.phone?.trim() || null;
  if (payload.email !== undefined) patch.email = payload.email?.trim() || null;
  if (payload.photo_url !== undefined) patch.photo_url = payload.photo_url?.trim() || null;
  if (payload.signature_url !== undefined) patch.signature_url = payload.signature_url?.trim() || null;
  if (payload.appointment_document_url !== undefined) patch.appointment_document_url = payload.appointment_document_url?.trim() || null;
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

import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList, unwrapOrThrow } from "../lib/supabaseResult";
import type { KiongoziRecord, Status } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isViongoziUuid(id: string): boolean {
  return UUID_RE.test(id);
}

function uiStatus(raw: string | null | undefined): Status {
  const s = String(raw ?? "active").toLowerCase().replace(/\s+/g, "_");
  if (s === "pending") return "Pending";
  if (s === "inactive") return "Inactive";
  if (s === "archived") return "Archived";
  if (s === "needs_review") return "Needs Review";
  return "Active";
}

function dbStatus(ui: Status): string {
  const raw = String(ui).trim();
  const map: Record<string, string> = {
    Active: "active",
    Pending: "pending",
    Inactive: "inactive",
    Archived: "archived",
    "Needs Review": "needs_review",
  };
  if (map[raw]) return map[raw];
  const slug = raw.toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");
  return slug || "active";
}

const CHURCH_VIONGOZI_APPOINTMENT_DOC_COLUMNS = [
  "full_name",
  "photo_url",
  "signature_url",
  "gender",
  "position_id",
  "leadership_level",
  "assigned_entity",
  "idara_name",
  "huduma_name",
  "taasisi_name",
  "jumuiya_name",
  "email",
  "start_date",
  "end_date",
  "term_status",
  "appointment_document_url",
  "appointment_document_name",
  "appointment_document_path",
  "appointment_document_size",
  "appointment_document_type",
  "appointment_uploaded_at",
  "date_of_birth",
  "national_id",
  "passport_number",
  "church_member_id",
  "whatsapp",
  "mkoa",
  "wilaya",
  "kata",
  "address",
  "leadership_category_id",
  "committee_group_id",
  "reporting_leader_id",
  "structure_entity_id",
  "appointment_date",
  "former_leader",
  "reason_for_leaving",
  "education_summary",
  "theology_training",
  "professional_skills",
  "certificates_summary",
  "ministry_gifts",
  "ministry_experience",
  "internal_notes",
  "audit_notes",
  "pdf_issued_by_name",
  "pdf_issued_by_title",
] as const;

function stripUnknownChurchViongoziColumns(
  payload: Record<string, unknown>,
  message: string | undefined
): Record<string, unknown> {
  if (!message) return payload;
  const missingColumns = CHURCH_VIONGOZI_APPOINTMENT_DOC_COLUMNS.filter((col) =>
    message.includes(`'${col}' column`)
  );
  if (!missingColumns.length) return payload;
  const next = { ...payload };
  for (const col of missingColumns) delete next[col];
  return next;
}

export function mapViongoziRow(row: Record<string, unknown>): KiongoziRecord {
  const ds = row.dayosisi as { jina?: string } | null | undefined;
  const jb = row.church_jimbo as { jina?: string } | null | undefined;
  const tw = row.church_tawi as { jina?: string } | null | undefined;

  return {
    id: String(row.id),
    jina: String(row.jina ?? ""),
    full_name: String(row.full_name ?? row.jina ?? ""),
    photo_url: row.photo_url ? String(row.photo_url) : null,
    signature_url: row.signature_url ? String(row.signature_url) : null,
    gender: row.gender ? String(row.gender) : null,
    cheo: String(row.cheo ?? ""),
    position_id: row.position_id ? String(row.position_id) : null,
    ngazi: String(row.ngazi ?? ""),
    leadership_level: row.leadership_level ? String(row.leadership_level) : null,
    assigned_entity: row.assigned_entity ? String(row.assigned_entity) : null,
    dayosisi: ds?.jina != null ? String(ds.jina) : "",
    jimbo: jb?.jina != null ? String(jb.jina) : "",
    tawi: tw?.jina != null ? String(tw.jina) : "",
    simu: String(row.simu ?? ""),
    email: row.email ? String(row.email) : null,
    whatsapp: row.whatsapp ? String(row.whatsapp) : null,
    address: row.address ? String(row.address) : null,
    idara_name: row.idara_name ? String(row.idara_name) : null,
    huduma_name: row.huduma_name ? String(row.huduma_name) : null,
    taasisi_name: row.taasisi_name ? String(row.taasisi_name) : null,
    jumuiya_name: row.jumuiya_name ? String(row.jumuiya_name) : null,
    start_date: row.start_date ? String(row.start_date).slice(0, 10) : null,
    end_date: row.end_date ? String(row.end_date).slice(0, 10) : null,
    appointment_date: row.appointment_date ? String(row.appointment_date).slice(0, 10) : null,
    term_status: (String(row.term_status ?? "active") as KiongoziRecord["term_status"]) ?? "active",
    appointment_document_url: row.appointment_document_url ? String(row.appointment_document_url) : null,
    appointment_document_name: row.appointment_document_name ? String(row.appointment_document_name) : null,
    appointment_document_path: row.appointment_document_path ? String(row.appointment_document_path) : null,
    appointment_document_size:
      typeof row.appointment_document_size === "number"
        ? row.appointment_document_size
        : row.appointment_document_size != null
        ? Number(row.appointment_document_size)
        : null,
    appointment_document_type: row.appointment_document_type ? String(row.appointment_document_type) : null,
    appointment_uploaded_at: row.appointment_uploaded_at ? String(row.appointment_uploaded_at) : null,
    notes: row.notes ? String(row.notes) : null,
    date_of_birth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : null,
    national_id: row.national_id ? String(row.national_id) : null,
    passport_number: row.passport_number ? String(row.passport_number) : null,
    church_member_id: row.church_member_id ? String(row.church_member_id) : null,
    mkoa: row.mkoa ? String(row.mkoa) : null,
    wilaya: row.wilaya ? String(row.wilaya) : null,
    kata: row.kata ? String(row.kata) : null,
    leadership_category_id: row.leadership_category_id ? String(row.leadership_category_id) : null,
    committee_group_id: row.committee_group_id ? String(row.committee_group_id) : null,
    reporting_leader_id: row.reporting_leader_id ? String(row.reporting_leader_id) : null,
    structure_entity_id: row.structure_entity_id ? String(row.structure_entity_id) : null,
    former_leader: Boolean(row.former_leader),
    reason_for_leaving: row.reason_for_leaving ? String(row.reason_for_leaving) : null,
    education_summary: row.education_summary ? String(row.education_summary) : null,
    theology_training: row.theology_training ? String(row.theology_training) : null,
    professional_skills: row.professional_skills ? String(row.professional_skills) : null,
    certificates_summary: row.certificates_summary ? String(row.certificates_summary) : null,
    ministry_gifts: row.ministry_gifts ? String(row.ministry_gifts) : null,
    ministry_experience: row.ministry_experience ? String(row.ministry_experience) : null,
    internal_notes: row.internal_notes ? String(row.internal_notes) : null,
    audit_notes: row.audit_notes ? String(row.audit_notes) : null,
    pdf_issued_by_name: row.pdf_issued_by_name ? String(row.pdf_issued_by_name) : null,
    pdf_issued_by_title: row.pdf_issued_by_title ? String(row.pdf_issued_by_title) : null,
    status: uiStatus(row.status as string),
    dayosisi_id: row.dayosisi_id ? String(row.dayosisi_id) : undefined,
    jimbo_id: row.jimbo_id ? String(row.jimbo_id) : undefined,
    tawi_id: row.tawi_id ? String(row.tawi_id) : undefined,
  };
}

export async function fetchChurchViongozi(limit = 800): Promise<KiongoziRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  const res = await c
    .from("church_viongozi")
    .select("*, dayosisi ( jina ), church_jimbo ( jina ), church_tawi ( jina )")
    .order("jina", { ascending: true })
    .limit(limit);
  const rows = unwrapList(res, "church_viongozi.list");
  return rows.map((r) => mapViongoziRow(r as unknown as Record<string, unknown>));
}

export async function upsertKiongozi(row: Partial<KiongoziRecord> & { jina: string }): Promise<KiongoziRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");

  const optUuid = (v: string | null | undefined) => (v && isViongoziUuid(v.trim()) ? v.trim() : null);

  const payload: Record<string, unknown> = {
    jina: row.jina.trim(),
    full_name: row.full_name?.trim() || row.jina.trim(),
    photo_url: row.photo_url?.trim() || null,
    signature_url: row.signature_url?.trim() || null,
    gender: row.gender?.trim() || null,
    cheo: row.cheo?.trim() || null,
    position_id: optUuid(row.position_id ?? null),
    ngazi: row.ngazi?.trim() || "",
    leadership_level: row.leadership_level?.trim() || row.ngazi?.trim() || null,
    assigned_entity: row.assigned_entity?.trim() || null,
    dayosisi_id: row.dayosisi_id && isViongoziUuid(row.dayosisi_id) ? row.dayosisi_id : null,
    jimbo_id: row.jimbo_id && isViongoziUuid(row.jimbo_id) ? row.jimbo_id : null,
    tawi_id: row.tawi_id && isViongoziUuid(row.tawi_id) ? row.tawi_id : null,
    simu: row.simu?.trim() || null,
    email: row.email?.trim() || null,
    whatsapp: row.whatsapp?.trim() || null,
    address: row.address?.trim() || null,
    idara_name: row.idara_name?.trim() || null,
    huduma_name: row.huduma_name?.trim() || null,
    taasisi_name: row.taasisi_name?.trim() || null,
    jumuiya_name: row.jumuiya_name?.trim() || null,
    start_date: row.start_date?.trim() ? row.start_date.trim().slice(0, 10) : null,
    end_date: row.end_date?.trim() ? row.end_date.trim().slice(0, 10) : null,
    appointment_date: row.appointment_date?.trim() ? row.appointment_date.trim().slice(0, 10) : null,
    term_status: row.term_status ?? "active",
    appointment_document_url: row.appointment_document_url?.trim() || null,
    appointment_document_name: row.appointment_document_name?.trim() || null,
    appointment_document_path: row.appointment_document_path?.trim() || null,
    appointment_document_size:
      typeof row.appointment_document_size === "number" && Number.isFinite(row.appointment_document_size)
        ? Math.trunc(row.appointment_document_size)
        : null,
    appointment_document_type: row.appointment_document_type?.trim() || null,
    appointment_uploaded_at: row.appointment_uploaded_at?.trim() || null,
    notes: row.notes?.trim() || null,
    date_of_birth: row.date_of_birth?.trim() ? row.date_of_birth.trim().slice(0, 10) : null,
    national_id: row.national_id?.trim() || null,
    passport_number: row.passport_number?.trim() || null,
    church_member_id: row.church_member_id?.trim() || null,
    mkoa: row.mkoa?.trim() || null,
    wilaya: row.wilaya?.trim() || null,
    kata: row.kata?.trim() || null,
    leadership_category_id: optUuid(row.leadership_category_id ?? null),
    committee_group_id: optUuid(row.committee_group_id ?? null),
    reporting_leader_id: optUuid(row.reporting_leader_id ?? null),
    structure_entity_id: optUuid(row.structure_entity_id ?? null),
    former_leader: (() => {
      const v: unknown = row.former_leader;
      if (v === true) return true;
      if (typeof v === "number" && v === 1) return true;
      const s = String(v ?? "").toLowerCase();
      return s === "true" || s === "yes" || s === "1" || s === "on";
    })(),
    reason_for_leaving: row.reason_for_leaving?.trim() || null,
    education_summary: row.education_summary?.trim() || null,
    theology_training: row.theology_training?.trim() || null,
    professional_skills: row.professional_skills?.trim() || null,
    certificates_summary: row.certificates_summary?.trim() || null,
    ministry_gifts: row.ministry_gifts?.trim() || null,
    ministry_experience: row.ministry_experience?.trim() || null,
    internal_notes: row.internal_notes?.trim() || null,
    audit_notes: row.audit_notes?.trim() || null,
    pdf_issued_by_name: row.pdf_issued_by_name?.trim() || null,
    pdf_issued_by_title: row.pdf_issued_by_title?.trim() || null,
    status: dbStatus(row.status ?? "Active"),
    updated_at: new Date().toISOString(),
  };

  if (!payload.jina) throw new Error("Jina la kiongozi linahitajika.");
  if (!payload.cheo) throw new Error("Cheo kinahitajika.");
  if (!payload.leadership_level) throw new Error("Leadership level inahitajika.");
  if (!payload.assigned_entity) throw new Error("Assigned entity inahitajika.");
  const simu = typeof payload.simu === "string" ? payload.simu : null;
  const email = typeof payload.email === "string" ? payload.email : null;
  if (simu && !/^[0-9+\-\s()]{7,20}$/.test(simu)) throw new Error("Namba ya simu si sahihi.");
  const wa = typeof payload.whatsapp === "string" ? payload.whatsapp.trim() : "";
  if (wa && !/^[0-9+\-\s()]{7,22}$/.test(wa)) throw new Error("WhatsApp si sahihi.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Barua pepe si sahihi.");
  const startDate = typeof payload.start_date === "string" ? payload.start_date : null;
  const endDate = typeof payload.end_date === "string" ? payload.end_date : null;
  if (startDate && endDate && endDate < startDate) {
    throw new Error("Tarehe ya mwisho haiwezi kuwa kabla ya tarehe ya kuanza.");
  }

  const executeViongoziSave = async (mode: "update" | "insert", id?: string) => {
    const run = (cleanPayload: Record<string, unknown>) =>
      mode === "update"
        ? c.from("church_viongozi").update(cleanPayload).eq("id", id ?? "").select(sEmb()).single()
        : c.from("church_viongozi").insert(cleanPayload).select(sEmb()).single();

    let res = await run(payload);
    const fallbackPayload = stripUnknownChurchViongoziColumns(
      payload,
      (res as { error?: { message?: string } })?.error?.message
    );
    if (fallbackPayload !== payload) {
      res = await run(fallbackPayload);
    }
    return res;
  };

  if (row.id && isViongoziUuid(row.id)) {
    const res = await executeViongoziSave("update", row.id);
    const data = unwrapOrThrow(res, "church_viongozi.update");
    return mapViongoziRow(data as unknown as Record<string, unknown>);
  }

  const res = await executeViongoziSave("insert");
  const data = unwrapOrThrow(res, "church_viongozi.insert");
  await c.from("leadership_terms").insert({
    leader_id: String((data as { id?: unknown }).id ?? ""),
    position_id: payload.position_id,
    start_date: payload.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: payload.end_date,
    term_status: payload.term_status ?? "active",
  });
  return mapViongoziRow(data as unknown as Record<string, unknown>);
}

function sEmb() {
  return "*, dayosisi ( jina ), church_jimbo ( jina ), church_tawi ( jina )";
}

export async function deleteKiongozi(id: string): Promise<void> {
  const c = getSupabase();
  if (!c || !isViongoziUuid(id)) return;
  const { error } = await c
    .from("church_viongozi")
    .update({ status: "archived", term_status: "ended", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "church_viongozi.archive"));
}

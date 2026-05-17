import { coalesceRealtimeCallback } from "../lib/portalHardening/realtimeCoalesce";
import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import { unwrapList, unwrapMaybe } from "../lib/supabaseResult";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { CredentialDocumentKind } from "../lib/certificateEngine";

export type LeadershipRoleCatalogRow = {
  id: string;
  level_key: string;
  role_key: string;
  title_sw: string;
  title_en: string;
  jimbo_leader_variant: string | null;
  sort_order: number;
};

export type LeadershipEducationCatalogRow = {
  id: string;
  category: string;
  option_key: string;
  label_sw: string;
  label_en: string;
  sort_order: number;
};

export type LeadershipProfileExtendedRow = {
  id: string;
  leader_id: string;
  nationality: string | null;
  biography: string | null;
  gender: string | null;
  church_id_number: string | null;
  leadership_id_number: string | null;
  whatsapp: string | null;
  official_seal_storage_path: string | null;
  marital_status: string | null;
  service_status: string;
  years_in_ministry: number | null;
  years_in_current_position: number | null;
  position_started_at: string | null;
  position_ended_at: string | null;
  baptized: boolean | null;
  baptism_date: string | null;
  baptism_place: string | null;
  baptized_by: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  approved_by_title: string | null;
};

export type CredentialIssueRow = {
  id: string;
  source_type: "church_viongozi" | "national_leadership";
  source_id: string;
  document_kind: CredentialDocumentKind;
  verification_serial: string;
  verify_url: string | null;
  hierarchy_label: string;
  position_title: string;
  issued_at: string;
};

function clientOrNull() {
  return getSupabase();
}

function mapRole(r: Record<string, unknown>): LeadershipRoleCatalogRow {
  return {
    id: String(r.id ?? ""),
    level_key: String(r.level_key ?? ""),
    role_key: String(r.role_key ?? ""),
    title_sw: String(r.title_sw ?? ""),
    title_en: String(r.title_en ?? ""),
    jimbo_leader_variant: r.jimbo_leader_variant != null ? String(r.jimbo_leader_variant) : null,
    sort_order: Number(r.sort_order ?? 0),
  };
}

function mapEduCat(r: Record<string, unknown>): LeadershipEducationCatalogRow {
  return {
    id: String(r.id ?? ""),
    category: String(r.category ?? ""),
    option_key: String(r.option_key ?? ""),
    label_sw: String(r.label_sw ?? ""),
    label_en: String(r.label_en ?? ""),
    sort_order: Number(r.sort_order ?? 0),
  };
}

function mapProfileExt(r: Record<string, unknown>): LeadershipProfileExtendedRow {
  return {
    id: String(r.id ?? ""),
    leader_id: String(r.leader_id ?? ""),
    nationality: r.nationality != null ? String(r.nationality) : null,
    biography: r.biography != null ? String(r.biography) : null,
    gender: r.gender != null ? String(r.gender) : null,
    church_id_number: r.church_id_number != null ? String(r.church_id_number) : null,
    leadership_id_number: r.leadership_id_number != null ? String(r.leadership_id_number) : null,
    whatsapp: r.whatsapp != null ? String(r.whatsapp) : null,
    official_seal_storage_path:
      r.official_seal_storage_path != null ? String(r.official_seal_storage_path) : null,
    marital_status: r.marital_status != null ? String(r.marital_status) : null,
    service_status: String(r.service_status ?? "active"),
    years_in_ministry: r.years_in_ministry != null ? Number(r.years_in_ministry) : null,
    years_in_current_position:
      r.years_in_current_position != null ? Number(r.years_in_current_position) : null,
    position_started_at: r.position_started_at != null ? String(r.position_started_at) : null,
    position_ended_at: r.position_ended_at != null ? String(r.position_ended_at) : null,
    baptized: r.baptized === true || r.baptized === false ? Boolean(r.baptized) : null,
    baptism_date: r.baptism_date != null ? String(r.baptism_date) : null,
    baptism_place: r.baptism_place != null ? String(r.baptism_place) : null,
    baptized_by: r.baptized_by != null ? String(r.baptized_by) : null,
    approved_at: r.approved_at != null ? String(r.approved_at) : null,
    approved_by_name: r.approved_by_name != null ? String(r.approved_by_name) : null,
    approved_by_title: r.approved_by_title != null ? String(r.approved_by_title) : null,
  };
}

export async function fetchLeadershipRoleCatalogOptional(): Promise<LeadershipRoleCatalogRow[]> {
  const c = clientOrNull();
  if (!c) return [];
  const res = await c
    .from("leadership_role_catalog")
    .select("*")
    .eq("active", true)
    .order("level_key")
    .order("sort_order");
  if (res.error) return [];
  return unwrapList(res, "leadership_role_catalog.list").map((r) => mapRole(r as Record<string, unknown>));
}

export async function fetchLeadershipEducationCatalogOptional(): Promise<LeadershipEducationCatalogRow[]> {
  const c = clientOrNull();
  if (!c) return [];
  const res = await c
    .from("leadership_education_catalog")
    .select("*")
    .eq("active", true)
    .order("category")
    .order("sort_order");
  if (res.error) return [];
  return unwrapList(res, "leadership_education_catalog.list").map((r) => mapEduCat(r as Record<string, unknown>));
}

export async function fetchLeadershipProfileExtendedOptional(
  leaderId: string,
): Promise<LeadershipProfileExtendedRow | null> {
  const c = clientOrNull();
  if (!c || !leaderId.trim()) return null;
  const res = await c.from("leadership_profiles").select("*").eq("leader_id", leaderId).maybeSingle();
  if (res.error) return null;
  const row = unwrapMaybe(res, "leadership_profiles.by_leader") as Record<string, unknown> | null;
  return row ? mapProfileExt(row) : null;
}

export async function upsertLeadershipProfileExtended(
  leaderId: string,
  patch: Partial<Omit<LeadershipProfileExtendedRow, "id" | "leader_id">>,
): Promise<LeadershipProfileExtendedRow | null> {
  const c = clientOrNull();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const existing = await c.from("leadership_profiles").select("id").eq("leader_id", leaderId).maybeSingle();
  if (existing.error) throw new Error(formatPostgrestError(existing.error, "leadership_profiles.lookup"));

  const payload = { leader_id: leaderId, ...patch };
  if (existing.data?.id) {
    const res = await c
      .from("leadership_profiles")
      .update(patch)
      .eq("leader_id", leaderId)
      .select("*")
      .single();
    if (res.error) throw new Error(formatPostgrestError(res.error, "leadership_profiles.update"));
    return mapProfileExt(res.data as Record<string, unknown>);
  }
  const res = await c.from("leadership_profiles").insert(payload).select("*").single();
  if (res.error) throw new Error(formatPostgrestError(res.error, "leadership_profiles.insert"));
  return mapProfileExt(res.data as Record<string, unknown>);
}

export async function fetchCredentialIssuesForSourceOptional(
  sourceType: "church_viongozi" | "national_leadership",
  sourceId: string,
  limit = 12,
): Promise<CredentialIssueRow[]> {
  const c = clientOrNull();
  if (!c) return [];
  const res = await c
    .from("leadership_credential_issues")
    .select("*")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .order("issued_at", { ascending: false })
    .limit(limit);
  if (res.error) return [];
  return unwrapList(res, "leadership_credential_issues.by_source").map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      source_type: row.source_type as CredentialIssueRow["source_type"],
      source_id: String(row.source_id ?? ""),
      document_kind: String(row.document_kind ?? "appointment_certificate") as CredentialDocumentKind,
      verification_serial: String(row.verification_serial ?? ""),
      verify_url: row.verify_url != null ? String(row.verify_url) : null,
      hierarchy_label: String(row.hierarchy_label ?? ""),
      position_title: String(row.position_title ?? ""),
      issued_at: String(row.issued_at ?? ""),
    };
  });
}

export type RecordCredentialIssuanceResult = {
  issueId: string | null;
  officialCertificateId: string | null;
  verificationId: string | null;
  certificateNumber: string | null;
};

export async function recordCredentialIssueOptional(input: {
  source_type: "church_viongozi" | "national_leadership";
  source_id: string;
  document_kind: CredentialDocumentKind;
  verification_serial: string;
  verify_url?: string | null;
  hierarchy_label: string;
  position_title: string;
  holder_full_name?: string;
  leader_id?: string | null;
  national_role_key?: string | null;
  issued_by?: string | null;
  payload?: Record<string, unknown>;
  register_official?: boolean;
}): Promise<RecordCredentialIssuanceResult> {
  const c = clientOrNull();
  const empty: RecordCredentialIssuanceResult = {
    issueId: null,
    officialCertificateId: null,
    verificationId: null,
    certificateNumber: null,
  };
  if (!c) return empty;

  const res = await c
    .from("leadership_credential_issues")
    .insert({
      source_type: input.source_type,
      source_id: input.source_id,
      document_kind: input.document_kind,
      verification_serial: input.verification_serial,
      verify_url: input.verify_url ?? null,
      hierarchy_label: input.hierarchy_label,
      position_title: input.position_title,
      issued_by: input.issued_by ?? null,
      payload: input.payload ?? {},
    })
    .select("id")
    .single();

  let issueId: string | null = null;
  if (res.error) {
    console.warn("[leadership_credential_issues]", formatPostgrestError(res.error, "insert"));
  } else {
    issueId = res.data?.id != null ? String(res.data.id) : null;
  }

  if (input.register_official === false) {
    return { ...empty, issueId };
  }

  const { registerOfficialCertificateOptional } = await import("./leadershipOfficialCertificateService");
  const official = await registerOfficialCertificateOptional({
    source_type: input.source_type,
    source_id: input.source_id,
    leader_id: input.leader_id ?? (input.source_type === "church_viongozi" ? input.source_id : null),
    national_role_key:
      input.national_role_key ?? (input.source_type === "national_leadership" ? input.source_id : null),
    document_kind: input.document_kind,
    verification_serial: input.verification_serial,
    verify_url: input.verify_url,
    hierarchy_label: input.hierarchy_label,
    position_title: input.position_title,
    holder_full_name: input.holder_full_name ?? input.position_title,
    issued_by: input.issued_by,
    credential_issue_id: issueId,
    payload: input.payload,
    status: "verified",
  });

  return {
    issueId,
    officialCertificateId: official?.id ?? null,
    verificationId: official?.verification_id ?? null,
    certificateNumber: official?.certificate_number ?? null,
  };
}

export function subscribeLeadershipCredentialsEngine(onChange: () => void): RealtimeChannel | null {
  const c = clientOrNull();
  if (!c || !isSupabaseRealtimeEnabled()) return null;
  const debounced = coalesceRealtimeCallback(onChange, 520);
  return c
    .channel("leadership-credentials-engine")
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_profiles" }, debounced)
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_credential_issues" }, debounced)
    .on("postgres_changes", { event: "*", schema: "public", table: "church_viongozi" }, debounced)
    .on("postgres_changes", { event: "*", schema: "public", table: "national_leadership_profiles" }, debounced)
    .subscribe();
}

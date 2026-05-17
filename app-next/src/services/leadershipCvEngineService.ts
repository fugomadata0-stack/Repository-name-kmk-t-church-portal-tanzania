import { formatPostgrestError } from "../lib/supabaseErrors";
import { STORAGE_BUCKETS } from "../lib/storageBuckets";
import { getSupabase, isSupabaseRealtimeEnabled } from "../lib/supabase";
import { unwrapList, unwrapMaybe, unwrapOrThrow } from "../lib/supabaseResult";
import { enterpriseStorageUpload, PORTAL_DOCUMENT_FILE_GUARD } from "../lib/enterpriseStorageUpload";
import { buildSafeStoragePath } from "../lib/storageUpload";
import { mbToBytes, validateSelectedFile } from "../lib/fileUploadGuard";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { coalesceRealtimeCallback } from "../lib/portalHardening/realtimeCoalesce";
import type {
  LeadershipCvAttachmentRow,
  LeadershipCvBundle,
  LeadershipCvCertificateRow,
  LeadershipCvEducationRow,
  LeadershipCvExperienceRow,
  LeadershipCvSkillRow,
  LeadershipProfileCvRecord,
} from "../types";

export const LEADERSHIP_CV_STORAGE_BUCKET = STORAGE_BUCKETS.leadershipCvAttachments;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLeaderUuid(id: string): boolean {
  return UUID_RE.test(String(id ?? "").trim());
}

function mapProfile(row: Record<string, unknown>): LeadershipProfileCvRecord {
  return {
    id: String(row.id ?? ""),
    leader_id: String(row.leader_id ?? ""),
    nationality: row.nationality != null ? String(row.nationality) : null,
    biography: row.biography != null ? String(row.biography) : null,
    reporting_office: row.reporting_office != null ? String(row.reporting_office) : null,
    profile_photo_storage_path: row.profile_photo_storage_path != null ? String(row.profile_photo_storage_path) : null,
    signature_storage_path: row.signature_storage_path != null ? String(row.signature_storage_path) : null,
    original_cv_storage_path: row.original_cv_storage_path != null ? String(row.original_cv_storage_path) : null,
    original_cv_file_name: row.original_cv_file_name != null ? String(row.original_cv_file_name) : null,
    original_cv_mime: row.original_cv_mime != null ? String(row.original_cv_mime) : null,
    original_cv_bytes:
      typeof row.original_cv_bytes === "number"
        ? row.original_cv_bytes
        : row.original_cv_bytes != null
        ? Number(row.original_cv_bytes)
        : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapExp(row: Record<string, unknown>): LeadershipCvExperienceRow {
  return {
    id: String(row.id ?? ""),
    leader_id: String(row.leader_id ?? ""),
    start_year: Number(row.start_year ?? 0),
    end_year: row.end_year != null && row.end_year !== "" ? Number(row.end_year) : null,
    institution: String(row.institution ?? ""),
    position: String(row.position ?? ""),
    description: row.description != null ? String(row.description) : null,
    sort_order: Number(row.sort_order ?? 0),
  };
}

function mapEdu(row: Record<string, unknown>): LeadershipCvEducationRow {
  return {
    id: String(row.id ?? ""),
    leader_id: String(row.leader_id ?? ""),
    education_kind: String(row.education_kind ?? "other"),
    institution: String(row.institution ?? ""),
    qualification: String(row.qualification ?? ""),
    year: row.year != null && row.year !== "" ? Number(row.year) : null,
    specialization: row.specialization != null ? String(row.specialization) : null,
    sort_order: Number(row.sort_order ?? 0),
  };
}

function mapCert(row: Record<string, unknown>): LeadershipCvCertificateRow {
  return {
    id: String(row.id ?? ""),
    leader_id: String(row.leader_id ?? ""),
    certificate_name: String(row.certificate_name ?? ""),
    issuer: row.issuer != null ? String(row.issuer) : null,
    year: row.year != null && row.year !== "" ? Number(row.year) : null,
    notes: row.notes != null ? String(row.notes) : null,
    document_storage_path: row.document_storage_path != null ? String(row.document_storage_path) : null,
    sort_order: Number(row.sort_order ?? 0),
  };
}

function mapSkill(row: Record<string, unknown>): LeadershipCvSkillRow {
  return {
    id: String(row.id ?? ""),
    leader_id: String(row.leader_id ?? ""),
    skill_category: String(row.skill_category ?? "leadership"),
    label: String(row.label ?? ""),
    sort_order: Number(row.sort_order ?? 0),
  };
}

function mapAtt(row: Record<string, unknown>): LeadershipCvAttachmentRow {
  return {
    id: String(row.id ?? ""),
    leader_id: String(row.leader_id ?? ""),
    attachment_kind: String(row.attachment_kind ?? "other"),
    storage_path: String(row.storage_path ?? ""),
    file_name: String(row.file_name ?? ""),
    mime_type: row.mime_type != null ? String(row.mime_type) : null,
    file_size:
      typeof row.file_size === "number" ? row.file_size : row.file_size != null ? Number(row.file_size) : null,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

export async function fetchLeadershipCvBundle(leaderId: string): Promise<LeadershipCvBundle> {
  const c = getSupabase();
  if (!c || !isLeaderUuid(leaderId)) {
    return { profile: null, experience: [], education: [], certificates: [], skills: [], attachments: [] };
  }
  const [p, e, ed, ce, sk, at] = await Promise.all([
    c.from("leadership_profiles").select("*").eq("leader_id", leaderId).maybeSingle(),
    c.from("leadership_experience").select("*").eq("leader_id", leaderId).order("sort_order").order("start_year", { ascending: false }),
    c.from("leadership_education").select("*").eq("leader_id", leaderId).order("sort_order").order("year", { ascending: false }),
    c.from("leadership_certificates").select("*").eq("leader_id", leaderId).order("sort_order"),
    c.from("leadership_skills").select("*").eq("leader_id", leaderId).order("skill_category").order("sort_order"),
    c.from("leadership_attachments").select("*").eq("leader_id", leaderId).order("sort_order").order("created_at", { ascending: false }),
  ]);
  const profileRow = unwrapMaybe(p, "leadership_profiles.one");
  return {
    profile: profileRow ? mapProfile(profileRow as Record<string, unknown>) : null,
    experience: unwrapList(e, "leadership_experience.list").map((r) => mapExp(r as Record<string, unknown>)),
    education: unwrapList(ed, "leadership_education.list").map((r) => mapEdu(r as Record<string, unknown>)),
    certificates: unwrapList(ce, "leadership_certificates.list").map((r) => mapCert(r as Record<string, unknown>)),
    skills: unwrapList(sk, "leadership_skills.list").map((r) => mapSkill(r as Record<string, unknown>)),
    attachments: unwrapList(at, "leadership_attachments.list").map((r) => mapAtt(r as Record<string, unknown>)),
  };
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Tafuta IDs za viongozi kwa mstari katika elimu / uzoefu (ili kuchuja orodha). */
export async function fetchCvSearchLeaderIds(q: string): Promise<string[]> {
  const raw = q.trim();
  if (raw.length < 2) return [];
  const c = getSupabase();
  if (!c) return [];
  const pat = `%${escapeIlike(raw)}%`;
  const ids = new Set<string>();
  const add = (rows: { leader_id?: string }[] | null | undefined) => {
    for (const r of rows ?? []) {
      const id = r.leader_id;
      if (id) ids.add(String(id));
    }
  };
  const colsExp = ["institution", "position", "description"] as const;
  const colsEdu = ["institution", "qualification", "specialization"] as const;
  const colsCert = ["certificate_name", "issuer", "notes"] as const;
  const colsSkill = ["label"] as const;
  for (const col of colsExp) {
    const res = await c.from("leadership_experience").select("leader_id").ilike(col, pat);
    add(res.data as { leader_id?: string }[]);
  }
  for (const col of colsEdu) {
    const res = await c.from("leadership_education").select("leader_id").ilike(col, pat);
    add(res.data as { leader_id?: string }[]);
  }
  for (const col of colsCert) {
    const res = await c.from("leadership_certificates").select("leader_id").ilike(col, pat);
    add(res.data as { leader_id?: string }[]);
  }
  for (const col of colsSkill) {
    const res = await c.from("leadership_skills").select("leader_id").ilike(col, pat);
    add(res.data as { leader_id?: string }[]);
  }
  for (const col of ["biography", "nationality", "reporting_office"] as const) {
    const res = await c.from("leadership_profiles").select("leader_id").ilike(col, pat);
    add(res.data as { leader_id?: string }[]);
  }
  return [...ids];
}

export async function signLeadershipCvPath(path: string, expiresSec = 7200): Promise<string | null> {
  const t = path?.trim();
  if (!t || /^https?:\/\//i.test(t)) return null;
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c.storage.from(LEADERSHIP_CV_STORAGE_BUCKET).createSignedUrl(t, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadLeadershipCvObject(
  leaderId: string,
  folder: "photo" | "signature" | "cv" | "cert" | "attach",
  file: File
): Promise<{ path: string }> {
  if (!isLeaderUuid(leaderId)) throw new Error("Kitambulisho cha kiongozi si sahihi.");
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const guard = validateSelectedFile(file, {
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic", ".heif", ".doc", ".docx", ".xlsx", ".pptx", ".zip", ".txt"],
    maxBytes: mbToBytes(150),
    labelSw: "Faili ya CV / hati",
  });
  if (guard) throw new Error(guard);
  const path = buildSafeStoragePath(`${leaderId}/${folder}`, file.name);
  await enterpriseStorageUpload({
    bucket: LEADERSHIP_CV_STORAGE_BUCKET,
    file,
    path,
    guard: PORTAL_DOCUMENT_FILE_GUARD,
    upsert: true,
    optimizeImage: true,
  });
  return { path };
}

export type LeadershipCvProfileDraft = Omit<
  LeadershipProfileCvRecord,
  "id" | "leader_id" | "created_at" | "updated_at"
> & { leader_id: string };

export async function saveLeadershipCvBundle(leaderId: string, bundle: LeadershipCvBundle): Promise<void> {
  if (!isLeaderUuid(leaderId)) throw new Error("Kitambulisho cha kiongozi si sahihi.");
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");

  const prof = bundle.profile;
  const row = {
    leader_id: leaderId,
    nationality: prof?.nationality?.trim() || null,
    biography: prof?.biography?.trim() || null,
    reporting_office: prof?.reporting_office?.trim() || null,
    profile_photo_storage_path: prof?.profile_photo_storage_path?.trim() || null,
    signature_storage_path: prof?.signature_storage_path?.trim() || null,
    original_cv_storage_path: prof?.original_cv_storage_path?.trim() || null,
    original_cv_file_name: prof?.original_cv_file_name?.trim() || null,
    original_cv_mime: prof?.original_cv_mime?.trim() || null,
    original_cv_bytes: prof?.original_cv_bytes != null && Number.isFinite(prof.original_cv_bytes) ? Math.trunc(prof.original_cv_bytes) : null,
  };
  const res = await c.from("leadership_profiles").upsert(row, { onConflict: "leader_id" }).select("id").single();
  unwrapOrThrow(res, "leadership_profiles.upsert");

  const wipe = async (table: string) => {
    const { error } = await c.from(table).delete().eq("leader_id", leaderId);
    if (error) throw new Error(formatPostgrestError(error, `${table}.delete`));
  };

  await wipe("leadership_experience");
  if (bundle.experience.length) {
    const rows = bundle.experience.map((x, i) => ({
      leader_id: leaderId,
      start_year: Math.trunc(Number(x.start_year) || 0),
      end_year: x.end_year != null && Number.isFinite(x.end_year) ? Math.trunc(x.end_year) : null,
      institution: x.institution.trim(),
      position: x.position.trim(),
      description: x.description?.trim() || null,
      sort_order: i,
    }));
    const res = await c.from("leadership_experience").insert(rows);
    unwrapOrThrow(res, "leadership_experience.insert");
  }

  await wipe("leadership_education");
  if (bundle.education.length) {
    const rows = bundle.education.map((x, i) => ({
      leader_id: leaderId,
      education_kind: (x.education_kind || "other").trim(),
      institution: x.institution.trim(),
      qualification: x.qualification.trim(),
      year: x.year != null && Number.isFinite(x.year) ? Math.trunc(x.year) : null,
      specialization: x.specialization?.trim() || null,
      sort_order: i,
    }));
    const res = await c.from("leadership_education").insert(rows);
    unwrapOrThrow(res, "leadership_education.insert");
  }

  await wipe("leadership_certificates");
  if (bundle.certificates.length) {
    const rows = bundle.certificates.map((x, i) => ({
      leader_id: leaderId,
      certificate_name: x.certificate_name.trim(),
      issuer: x.issuer?.trim() || null,
      year: x.year != null && Number.isFinite(x.year) ? Math.trunc(x.year) : null,
      notes: x.notes?.trim() || null,
      document_storage_path: x.document_storage_path?.trim() || null,
      sort_order: i,
    }));
    const res = await c.from("leadership_certificates").insert(rows);
    unwrapOrThrow(res, "leadership_certificates.insert");
  }

  await wipe("leadership_skills");
  if (bundle.skills.length) {
    const rows = bundle.skills.map((x, i) => ({
      leader_id: leaderId,
      skill_category: (x.skill_category || "leadership").trim(),
      label: x.label.trim(),
      sort_order: i,
    }));
    const res = await c.from("leadership_skills").insert(rows);
    unwrapOrThrow(res, "leadership_skills.insert");
  }

  await wipe("leadership_attachments");
  if (bundle.attachments.length) {
    const rows = bundle.attachments.map((x, i) => ({
      leader_id: leaderId,
      attachment_kind: (x.attachment_kind || "other").trim(),
      storage_path: x.storage_path.trim(),
      file_name: x.file_name.trim() || "file",
      mime_type: x.mime_type?.trim() || null,
      file_size: x.file_size != null && Number.isFinite(x.file_size) ? Math.trunc(x.file_size) : null,
      sort_order: i,
    }));
    const res = await c.from("leadership_attachments").insert(rows);
    unwrapOrThrow(res, "leadership_attachments.insert");
  }
}

export type LeadershipCvRealtimeHandlers = {
  onChange?: () => void;
  onSubscribeStatus?: (status: string, err?: Error) => void;
};

/** Realtime kwa jedwali za CV (channel tofauti na enterprise hub). */
export function subscribeLeadershipCvEngine(h: LeadershipCvRealtimeHandlers): RealtimeChannel | null {
  const c = getSupabase();
  if (!c || !isSupabaseRealtimeEnabled()) return null;
  const bump = coalesceRealtimeCallback(() => h.onChange?.(), 520);
  return c
    .channel("leadership-cv-engine-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_profiles" }, bump)
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_experience" }, bump)
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_education" }, bump)
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_certificates" }, bump)
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_skills" }, bump)
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_attachments" }, bump)
    .on("postgres_changes", { event: "*", schema: "public", table: "church_viongozi" }, bump)
    .subscribe((status, err) => {
      h.onSubscribeStatus?.(status, err);
      if (status === "CHANNEL_ERROR") {
        console.warn("[leadershipCvEngine] realtime channel error", err?.message ?? "");
      }
    });
}

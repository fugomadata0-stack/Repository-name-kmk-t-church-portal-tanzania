import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import { unwrapList } from "../lib/supabaseResult";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { coalesceRealtimeCallback } from "../lib/portalHardening/realtimeCoalesce";
import type { CredentialDocumentKind } from "../lib/certificateEngine";

export type OfficialCertificateStatus =
  | "draft"
  | "pending"
  | "verified"
  | "approved"
  | "rejected"
  | "archived";

export type OfficialCertificateRow = {
  id: string;
  leader_id: string | null;
  national_role_key: string | null;
  source_type: "church_viongozi" | "national_leadership";
  document_kind: CredentialDocumentKind;
  certificate_number: string;
  verification_id: string;
  verify_url: string | null;
  status: OfficialCertificateStatus;
  hierarchy_label: string;
  position_title: string;
  holder_full_name: string;
  pdf_version: number;
  issued_at: string | null;
  approved_at: string | null;
  credential_issue_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadershipApprovalRow = {
  id: string;
  official_certificate_id: string;
  approval_step: number;
  status: OfficialCertificateStatus;
  approver_name: string | null;
  approver_title: string | null;
  decision_notes: string | null;
  decided_at: string | null;
  created_at: string;
};

export const OFFICIAL_CERT_STATUS_LABELS: Record<
  OfficialCertificateStatus,
  { sw: string; en: string; tone: string }
> = {
  draft: { sw: "Rasimu", en: "Draft", tone: "bg-slate-100 text-slate-700" },
  pending: { sw: "Inasubiri", en: "Pending", tone: "bg-amber-100 text-amber-900" },
  verified: { sw: "Imethibitishwa", en: "Verified", tone: "bg-sky-100 text-sky-900" },
  approved: { sw: "Imeidhinishwa", en: "Approved", tone: "bg-emerald-100 text-emerald-900" },
  rejected: { sw: "Imekataliwa", en: "Rejected", tone: "bg-red-100 text-red-800" },
  archived: { sw: "Imehifadhiwa", en: "Archived", tone: "bg-slate-200 text-slate-600" },
};

function clientOrNull() {
  return getSupabase();
}

function mapOfficial(row: Record<string, unknown>): OfficialCertificateRow {
  return {
    id: String(row.id ?? ""),
    leader_id: row.leader_id != null ? String(row.leader_id) : null,
    national_role_key: row.national_role_key != null ? String(row.national_role_key) : null,
    source_type: row.source_type as OfficialCertificateRow["source_type"],
    document_kind: String(row.document_kind ?? "appointment_certificate") as CredentialDocumentKind,
    certificate_number: String(row.certificate_number ?? ""),
    verification_id: String(row.verification_id ?? ""),
    verify_url: row.verify_url != null ? String(row.verify_url) : null,
    status: String(row.status ?? "draft") as OfficialCertificateStatus,
    hierarchy_label: String(row.hierarchy_label ?? ""),
    position_title: String(row.position_title ?? ""),
    holder_full_name: String(row.holder_full_name ?? ""),
    pdf_version: Number(row.pdf_version ?? 1),
    issued_at: row.issued_at != null ? String(row.issued_at) : null,
    approved_at: row.approved_at != null ? String(row.approved_at) : null,
    credential_issue_id: row.credential_issue_id != null ? String(row.credential_issue_id) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function mapApproval(row: Record<string, unknown>): LeadershipApprovalRow {
  return {
    id: String(row.id ?? ""),
    official_certificate_id: String(row.official_certificate_id ?? ""),
    approval_step: Number(row.approval_step ?? 1),
    status: String(row.status ?? "pending") as OfficialCertificateStatus,
    approver_name: row.approver_name != null ? String(row.approver_name) : null,
    approver_title: row.approver_title != null ? String(row.approver_title) : null,
    decision_notes: row.decision_notes != null ? String(row.decision_notes) : null,
    decided_at: row.decided_at != null ? String(row.decided_at) : null,
    created_at: String(row.created_at ?? ""),
  };
}

export type PublicOfficialCertificateVerify = {
  found: boolean;
  certificateNumber?: string;
  verificationId?: string;
  holderFullName?: string;
  positionTitle?: string;
  hierarchyLabel?: string;
  documentKind?: string;
  status?: OfficialCertificateStatus;
  sourceType?: string;
  issuedAt?: string | null;
  approvedAt?: string | null;
  verifyUrl?: string | null;
};

export async function fetchPublicOfficialCertificateVerifyOptional(
  verificationId: string,
): Promise<PublicOfficialCertificateVerify> {
  const c = clientOrNull();
  const id = String(verificationId ?? "").trim();
  if (!c || !id) return { found: false };
  const { data, error } = await c.rpc("portal_public_verify_leadership_certificate", {
    p_verification_id: id,
  });
  if (error) {
    console.warn("[portal_public_verify_leadership_certificate]", error.message);
    return { found: false };
  }
  const row = data as Record<string, unknown> | null;
  if (!row || row.found !== true) return { found: false };
  return {
    found: true,
    certificateNumber: row.certificate_number != null ? String(row.certificate_number) : undefined,
    verificationId: row.verification_id != null ? String(row.verification_id) : undefined,
    holderFullName: row.holder_full_name != null ? String(row.holder_full_name) : undefined,
    positionTitle: row.position_title != null ? String(row.position_title) : undefined,
    hierarchyLabel: row.hierarchy_label != null ? String(row.hierarchy_label) : undefined,
    documentKind: row.document_kind != null ? String(row.document_kind) : undefined,
    status: row.status != null ? (String(row.status) as OfficialCertificateStatus) : undefined,
    sourceType: row.source_type != null ? String(row.source_type) : undefined,
    issuedAt: row.issued_at != null ? String(row.issued_at) : null,
    approvedAt: row.approved_at != null ? String(row.approved_at) : null,
    verifyUrl: row.verify_url != null ? String(row.verify_url) : null,
  };
}

export async function fetchOfficialCertificatesForSourceOptional(
  sourceType: "church_viongozi" | "national_leadership",
  sourceId: string,
  limit = 16,
): Promise<OfficialCertificateRow[]> {
  const c = clientOrNull();
  if (!c) return [];
  const q =
    sourceType === "church_viongozi"
      ? c
          .from("leadership_official_certificates")
          .select("*")
          .eq("source_type", sourceType)
          .eq("leader_id", sourceId)
      : c
          .from("leadership_official_certificates")
          .select("*")
          .eq("source_type", sourceType)
          .eq("national_role_key", sourceId);
  const res = await q.order("created_at", { ascending: false }).limit(limit);
  if (res.error) return [];
  return unwrapList(res, "leadership_official_certificates.by_source").map((r) =>
    mapOfficial(r as Record<string, unknown>),
  );
}

export async function fetchApprovalsForCertificateOptional(
  certificateId: string,
): Promise<LeadershipApprovalRow[]> {
  const c = clientOrNull();
  if (!c || !certificateId.trim()) return [];
  const res = await c
    .from("leadership_approvals")
    .select("*")
    .eq("official_certificate_id", certificateId)
    .order("approval_step", { ascending: true });
  if (res.error) return [];
  return unwrapList(res, "leadership_approvals.by_certificate").map((r) =>
    mapApproval(r as Record<string, unknown>),
  );
}

export type RegisterOfficialCertificateInput = {
  source_type: "church_viongozi" | "national_leadership";
  source_id: string;
  leader_id?: string | null;
  national_role_key?: string | null;
  document_kind: CredentialDocumentKind;
  verification_serial: string;
  verify_url?: string | null;
  hierarchy_label: string;
  position_title: string;
  holder_full_name: string;
  issued_by?: string | null;
  credential_issue_id?: string | null;
  status?: OfficialCertificateStatus;
  payload?: Record<string, unknown>;
};

/** Sajili cheti rasmi + kiungo cha credential_issues (chanzo kimoja). */
export async function registerOfficialCertificateOptional(
  input: RegisterOfficialCertificateInput,
): Promise<OfficialCertificateRow | null> {
  const c = clientOrNull();
  if (!c) return null;

  const status = input.status ?? "verified";
  const payload = {
    source_type: input.source_type,
    leader_id: input.source_type === "church_viongozi" ? input.leader_id ?? input.source_id : null,
    national_role_key:
      input.source_type === "national_leadership" ? input.national_role_key ?? input.source_id : null,
    document_kind: input.document_kind,
    certificate_number: "",
    verification_id: "",
    verify_url: input.verify_url ?? null,
    status,
    hierarchy_label: input.hierarchy_label,
    position_title: input.position_title,
    holder_full_name: input.holder_full_name,
    issued_by: input.issued_by ?? null,
    credential_issue_id: input.credential_issue_id ?? null,
    payload: {
      ...(input.payload ?? {}),
      pdf_serial: input.verification_serial,
    },
    qr_payload: input.verify_url ?? input.verification_serial,
  };

  const res = await c.from("leadership_official_certificates").insert(payload).select("*").single();
  if (res.error) {
    console.warn(
      "[leadership_official_certificates]",
      formatPostgrestError(res.error, "insert"),
    );
    return null;
  }
  const row = mapOfficial(res.data as Record<string, unknown>);

  if (input.source_type === "church_viongozi" && input.leader_id) {
    try {
      await c
        .from("leadership_profiles")
        .update({
          last_official_certificate_id: row.id,
          last_verification_id: row.verification_id,
          certificate_workflow_status: status,
        })
        .eq("leader_id", input.leader_id);
    } catch {
      /* wasifu haijawahi kuundwa — salama */
    }
  }

  return row;
}

export async function submitCertificateForApprovalOptional(
  certificateId: string,
  opts?: { approverName?: string; approverTitle?: string; notes?: string },
): Promise<boolean> {
  const c = clientOrNull();
  if (!c) return false;
  const upd = await c
    .from("leadership_official_certificates")
    .update({ status: "pending" })
    .eq("id", certificateId)
    .in("status", ["draft", "verified"]);
  if (upd.error) return false;
  const res = await c.from("leadership_approvals").insert({
    official_certificate_id: certificateId,
    approval_step: 1,
    status: "pending",
    approver_name: opts?.approverName ?? null,
    approver_title: opts?.approverTitle ?? null,
    decision_notes: opts?.notes ?? null,
  });
  return !res.error;
}

export async function approveOfficialCertificateOptional(
  certificateId: string,
  opts: { approverUserId?: string | null; approverName?: string; approverTitle?: string; notes?: string },
): Promise<boolean> {
  const c = clientOrNull();
  if (!c) return false;
  const res = await c.from("leadership_approvals").insert({
    official_certificate_id: certificateId,
    approval_step: 1,
    status: "approved",
    approver_user_id: opts.approverUserId ?? null,
    approver_name: opts.approverName ?? null,
    approver_title: opts.approverTitle ?? null,
    decision_notes: opts.notes ?? null,
    decided_at: new Date().toISOString(),
  });
  return !res.error;
}

export async function rejectOfficialCertificateOptional(
  certificateId: string,
  reason: string,
  opts?: { approverUserId?: string | null; approverName?: string },
): Promise<boolean> {
  const c = clientOrNull();
  if (!c) return false;
  const res = await c.from("leadership_approvals").insert({
    official_certificate_id: certificateId,
    approval_step: 1,
    status: "rejected",
    approver_user_id: opts?.approverUserId ?? null,
    approver_name: opts?.approverName ?? null,
    decision_notes: reason,
    decided_at: new Date().toISOString(),
  });
  return !res.error;
}

export async function archiveOfficialCertificateOptional(certificateId: string): Promise<boolean> {
  const c = clientOrNull();
  if (!c) return false;
  const res = await c
    .from("leadership_official_certificates")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", certificateId);
  return !res.error;
}

export function subscribeLeadershipCertificateSystem(onChange: () => void): RealtimeChannel | null {
  const c = clientOrNull();
  if (!c || !isSupabaseRealtimeEnabled()) return null;
  const debounced = coalesceRealtimeCallback(onChange, 520);
  return c
    .channel("leadership-certificate-system")
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_official_certificates" }, debounced)
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_approvals" }, debounced)
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_credential_issues" }, debounced)
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership_audit_logs" }, debounced)
    .subscribe();
}

import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";

export type Phase33SignupStatus =
  | "Pending Approval"
  | "Submitted"
  | "Under Review"
  | "Needs Correction"
  | "Approved"
  | "Rejected"
  | "Activated"
  | "Archived";

export interface Phase33SignupRequestRow {
  id: string;
  full_name: string;
  gender: string | null;
  phone: string;
  email: string;
  requested_role: string;
  request_reason: string;
  previous_responsibility: string | null;
  requested_scope: string | null;
  unit_name: string | null;
  dynamic_payload: Record<string, unknown>;
  status: string;
  verification_flag: string | null;
  submitted_at: string | null;
}

export interface Phase33SignupRequest {
  id: string;
  fullName: string;
  gender: string;
  phone: string;
  email: string;
  requestedRole: string;
  requestReason: string;
  previousResponsibility: string;
  requestedScope: string;
  unitName: string;
  dynamicPayload: Record<string, string>;
  status: string;
  verificationFlag: string;
  submittedAt: string;
}

function stamp(): string {
  return `REQ-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

function fromDb(r: Phase33SignupRequestRow): Phase33SignupRequest {
  const dyn = r.dynamic_payload && typeof r.dynamic_payload === "object" && !Array.isArray(r.dynamic_payload) ? r.dynamic_payload : {};
  const flat: Record<string, string> = {};
  Object.entries(dyn).forEach(([k, v]) => {
    flat[k] = v == null ? "" : String(v);
  });
  return {
    id: r.id,
    fullName: r.full_name,
    gender: r.gender || "",
    phone: r.phone,
    email: r.email,
    requestedRole: r.requested_role,
    requestReason: r.request_reason,
    previousResponsibility: r.previous_responsibility || "",
    requestedScope: r.requested_scope || "",
    unitName: r.unit_name || "",
    dynamicPayload: flat,
    status: r.status || "Pending Approval",
    verificationFlag: r.verification_flag || "",
    submittedAt: r.submitted_at || "",
  };
}

export async function insertPhase33SignupRequest(payload: {
  fullName: string;
  gender: string;
  phone: string;
  email: string;
  requestedRole: string;
  requestReason: string;
  previousResponsibility: string;
  requestedScope: string;
  unitName: string;
  dynamicPayload: Record<string, string>;
  verificationFlag: string;
}): Promise<Phase33SignupRequest> {
  const sb = getSupabase();
  const id = stamp();
  const row = {
    id,
    full_name: payload.fullName,
    gender: payload.gender || null,
    phone: payload.phone.trim(),
    email: payload.email.trim().toLowerCase(),
    requested_role: payload.requestedRole,
    request_reason: payload.requestReason,
    previous_responsibility: payload.previousResponsibility || "",
    requested_scope: payload.requestedScope || "",
    unit_name: payload.unitName || "",
    dynamic_payload: payload.dynamicPayload,
    status: "Pending Approval" as const,
    verification_flag: payload.verificationFlag || "",
  };

  if (!sb) {
    return fromDb({
      ...row,
      submitted_at: new Date().toISOString(),
    } as Phase33SignupRequestRow);
  }

  const { data, error } = await sb.from("phase33_signup_requests").insert(row).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "phase33 insert"));
  return fromDb(data as Phase33SignupRequestRow);
}

export async function fetchPhase33SignupRequests(): Promise<Phase33SignupRequest[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("phase33_signup_requests")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(formatPostgrestError(error, "phase33 list"));
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => fromDb(r as Phase33SignupRequestRow));
}

export async function updatePhase33SignupStatus(
  id: string,
  status: string,
  dynamicPatch?: Record<string, unknown>
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const patch: Record<string, unknown> = { status };
  if (dynamicPatch && Object.keys(dynamicPatch).length) {
    const { data: cur, error: readErr } = await sb.from("phase33_signup_requests").select("dynamic_payload").eq("id", id).single();
    if (readErr) throw new Error(formatPostgrestError(readErr, "phase33 read payload"));
    const prev =
      cur?.dynamic_payload && typeof cur.dynamic_payload === "object" && !Array.isArray(cur.dynamic_payload)
        ? (cur.dynamic_payload as Record<string, unknown>)
        : {};
    patch.dynamic_payload = { ...prev, ...dynamicPatch };
  }
  const { error } = await sb.from("phase33_signup_requests").update(patch).eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "phase33 update"));
}

export async function validatePasswordRemote(password: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  try {
    const { data, error } = await sb.rpc("phase33_password_valid", { p: password });
    if (error) return true;
    if (typeof data === "boolean") return data;
    return true;
  } catch {
    return true;
  }
}

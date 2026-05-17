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

/** JSONB salama kwa insert — kamwe usitume undefined/null kwenye dynamic_payload. */
export function sanitizePhase33DynamicPayload(
  raw: Record<string, string> | Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const k = String(key ?? "").trim();
    if (!k) continue;
    if (value == null) {
      out[k] = "";
      continue;
    }
    if (typeof value === "object") {
      try {
        out[k] = JSON.parse(JSON.stringify(value));
      } catch {
        out[k] = String(value);
      }
      continue;
    }
    out[k] = String(value);
  }
  return out;
}

/** Flat string map kwa validators za fomu (scope, unit, flags). */
export function phase33DynamicPayloadAsStrings(
  raw: Record<string, string> | Record<string, unknown> | null | undefined
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(sanitizePhase33DynamicPayload(raw)).map(([k, v]) => [k, v == null ? "" : String(v)])
  );
}

function isMissingDynamicPayloadColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  const msg = String(error.message ?? "").toLowerCase();
  return (
    code === "PGRST204" ||
    (msg.includes("dynamic_payload") && (msg.includes("schema cache") || msg.includes("could not find")))
  );
}

function buildPhase33InsertRow(payload: {
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
}): Record<string, unknown> {
  const id = stamp();
  const fullName = String(payload.fullName ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const phone = String(payload.phone ?? "").trim();
  const requestedRole = String(payload.requestedRole ?? "").trim();
  const requestReason = String(payload.requestReason ?? "").trim();

  return {
    id,
    full_name: fullName || "—",
    gender: String(payload.gender ?? "").trim() || null,
    phone: phone || "—",
    email: email || "—",
    requested_role: requestedRole || "Viewer / Mtazamaji",
    request_reason: requestReason || "—",
    previous_responsibility: String(payload.previousResponsibility ?? "").trim() || "",
    requested_scope: String(payload.requestedScope ?? "").trim() || "",
    unit_name: String(payload.unitName ?? "").trim() || "",
    dynamic_payload: sanitizePhase33DynamicPayload(payload.dynamicPayload),
    status: "Pending Approval",
    verification_flag: String(payload.verificationFlag ?? "").trim() || "",
  };
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
  const row = buildPhase33InsertRow(payload);

  if (!sb) {
    return fromDb({
      ...row,
      submitted_at: new Date().toISOString(),
    } as Phase33SignupRequestRow);
  }

  let { data, error } = await sb.from("phase33_signup_requests").insert(row).select("*").single();

  if (error && isMissingDynamicPayloadColumn(error)) {
    const { dynamic_payload: _omit, ...rowWithoutDynamic } = row;
    void _omit;
    const retry = await sb.from("phase33_signup_requests").insert(rowWithoutDynamic).select("*").single();
    data = retry.data;
    error = retry.error;
  }

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

import { formatPostgrestError, formatStorageError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList } from "../lib/supabaseResult";
import { publicObjectUploadOptions } from "../lib/storageUpload";

export type AuditLogRecord = {
  id: string;
  audit_uuid?: string;
  action: string;
  module: string;
  entity: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  performed_by_user_id: string | null;
  performed_by_name: string | null;
  role_key: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: "success" | "failed";
  message: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  attachment_url?: string;
  file_label?: string;
  notes?: string;
};

export type AuditActionInput = {
  module: string;
  action: string;
  entity_type?: string;
  entity_id?: string | null;
  entity_name?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  status?: "success" | "failed";
  message?: string | null;
  performed_by_user_id?: string | null;
  performed_by_name?: string | null;
  role_key?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  meta?: Record<string, unknown> | null;
};

const REDACT_KEYS = [
  "password",
  "token",
  "secret",
  "key",
  "authorization",
  "access_token",
  "refresh_token",
];

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((x) => sanitizeAuditValue(x));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const low = k.toLowerCase();
    if (REDACT_KEYS.some((rk) => low.includes(rk))) {
      out[k] = "[REDACTED]";
      continue;
    }
    out[k] = sanitizeAuditValue(v);
  }
  return out;
}

function mapRow(r: Record<string, unknown>): AuditLogRecord {
  const meta = (r.meta as Record<string, unknown> | null | undefined) ?? null;
  const attachment_url = typeof meta?.attachment_url === "string" ? meta.attachment_url : undefined;
  const file_label = typeof meta?.file_label === "string" ? meta.file_label : undefined;
  const notes = typeof meta?.notes === "string" ? meta.notes : undefined;
  return {
    id: String(r.id),
    audit_uuid: typeof r.audit_uuid === "string" ? r.audit_uuid : undefined,
    action: String(r.action ?? ""),
    module: String(r.module ?? "general"),
    entity: String(r.entity ?? ""),
    entity_type: String(r.entity_type ?? r.entity ?? ""),
    entity_id: String(r.entity_id ?? ""),
    entity_name: String(r.entity_name ?? ""),
    performed_by_user_id: typeof r.performed_by_user_id === "string" ? r.performed_by_user_id : null,
    performed_by_name: typeof r.performed_by_name === "string" ? r.performed_by_name : null,
    role_key: typeof r.role_key === "string" ? r.role_key : null,
    old_values: (r.old_values as Record<string, unknown> | null | undefined) ?? null,
    new_values: (r.new_values as Record<string, unknown> | null | undefined) ?? null,
    ip_address: typeof r.ip_address === "string" ? r.ip_address : null,
    user_agent: typeof r.user_agent === "string" ? r.user_agent : null,
    status: String(r.status ?? "success") === "failed" ? "failed" : "success",
    message: typeof r.message === "string" ? r.message : null,
    meta,
    created_at: String(r.created_at ?? ""),
    attachment_url,
    file_label,
    notes,
  };
}

/** Safu za jedwali (PremiumTable) — kiini kimoja kwa kila mstari */
export type AuditLogTableRow = {
  id: string;
  module: string;
  action: string;
  entity_type: string;
  entity_name: string;
  performed_by_name: string;
  role_key: string;
  entity: string;
  entity_id: string;
  created_at: string;
  status: "success" | "failed";
  notes_short: string;
  /** Maelezo kamili kwa modal ya Maelezo */
  notes_full: string;
  message: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  attachment_url?: string;
  file_label?: string;
};

export function toTableRows(records: AuditLogRecord[]): AuditLogTableRow[] {
  return records.map((r) => ({
    id: r.id,
    module: r.module || "general",
    action: r.action,
    entity_type: r.entity_type || "—",
    entity_name: r.entity_name || "—",
    performed_by_name: r.performed_by_name || "Haijulikani",
    role_key: r.role_key || "—",
    entity: r.entity || "—",
    entity_id: r.entity_id || "—",
    created_at: r.created_at ? new Date(r.created_at).toLocaleString("sw-TZ") : "—",
    status: r.status,
    notes_short:
      r.notes && r.notes.length > 80 ? `${r.notes.slice(0, 80)}…` : r.notes || "—",
    notes_full: r.notes || "",
    message: r.message || "—",
    old_values: r.old_values,
    new_values: r.new_values,
    attachment_url: r.attachment_url,
    file_label: r.file_label,
  }));
}

export async function fetchAuditLogs(limit = 500): Promise<AuditLogRecord[]> {
  try {
    const client = getSupabase();
    if (!client) throw new Error("Supabase haijasanidiwa.");
    const res = await client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    const rows = unwrapList(res, "audit_logs.list");
    return rows.map((x) => mapRow(x as Record<string, unknown>));
  } catch (e) {
    console.error("fetchAuditLogs error:", e);
    throw new Error("Imeshindikana kupakua taarifa.");
  }
}

export async function logAuditAction(input: AuditActionInput): Promise<void> {
  try {
    const client = getSupabase();
    if (!client) return;
    const pruneMissingAuditColumns = (rawPayload: Record<string, unknown>, message?: string): Record<string, unknown> => {
      if (!message) return rawPayload;
      const lower = message.toLowerCase();
      const knownColumns = [
        "entity_type",
        "entity_name",
        "performed_by_user_id",
        "performed_by_name",
        "role_key",
        "old_values",
        "new_values",
        "ip_address",
        "user_agent",
        "status",
        "message",
        "meta",
      ] as const;
      const missing = knownColumns.filter((col) => lower.includes(`'${col}'`) || lower.includes(`"${col}"`) || lower.includes(` ${col} `));
      if (!missing.length) return rawPayload;
      const next = { ...rawPayload };
      for (const col of missing) delete next[col];
      return next;
    };
    const payload: Record<string, unknown> = {
      module: input.module.trim() || "general",
      action: input.action.trim(),
      entity: input.entity_type?.trim() || "general",
      entity_type: input.entity_type?.trim() || "general",
      entity_id: input.entity_id?.trim() || null,
      entity_name: input.entity_name?.trim() || null,
      performed_by_user_id: input.performed_by_user_id || null,
      performed_by_name: input.performed_by_name || null,
      role_key: input.role_key || null,
      old_values: (sanitizeAuditValue(input.old_values ?? null) as Record<string, unknown> | null) ?? null,
      new_values: (sanitizeAuditValue(input.new_values ?? null) as Record<string, unknown> | null) ?? null,
      ip_address: input.ip_address || null,
      user_agent: input.user_agent || null,
      status: input.status ?? "success",
      message: input.message || null,
      meta: (sanitizeAuditValue(input.meta ?? null) as Record<string, unknown> | null) ?? null,
    };
    let { error } = await client.from("audit_logs").insert(payload);
    if (error) {
      const fallbackPayload = pruneMissingAuditColumns(payload, error.message);
      if (fallbackPayload !== payload) {
        ({ error } = await client.from("audit_logs").insert(fallbackPayload));
      }
    }
    if (error) throw new Error(formatPostgrestError(error, "audit_logs.insert"));
  } catch (err) {
    console.warn("Audit logging failed:", err);
  }
}

export async function fetchAuditLogCount(): Promise<number> {
  const client = getSupabase();
  if (!client) throw new Error("Supabase haijasanidiwa.");
  const res = await client.from("audit_logs").select("*", { count: "exact", head: true });
  if (res.error) throw new Error(formatPostgrestError(res.error, "audit_logs.count"));
  return res.count ?? 0;
}

export async function insertChurchAuditEntry(payload: {
  action: string;
  entity?: string;
  entity_id?: string;
  notes?: string;
  attachment_url?: string;
  file_label?: string;
}): Promise<void> {
  try {
    const meta: Record<string, unknown> = {};
    if (payload.notes?.trim()) meta.notes = payload.notes.trim();
    if (payload.attachment_url) meta.attachment_url = payload.attachment_url;
    if (payload.file_label) meta.file_label = payload.file_label;
    await logAuditAction({
      module: "audit",
      action: payload.action.trim(),
      entity_type: payload.entity?.trim() || "church_audit",
      entity_id: payload.entity_id?.trim() || null,
      message: "Ingizo la log kwa mkono",
      new_values: { notes: payload.notes ?? null },
      status: "success",
      meta: Object.keys(meta).length ? meta : null,
    });
  } catch (e) {
    console.error("insertChurchAuditEntry error:", e);
    throw new Error("Imeshindikana kuhifadhi taarifa.");
  }
}

export async function uploadAuditAttachment(file: File): Promise<{ path: string; publicUrl: string }> {
  const client = getSupabase();
  if (!client) throw new Error("Hakuna muunganisho wa Supabase.");
  const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
  const path = `audit-logs/${Date.now()}-${safeName || "faili"}`;
  const { error } = await client.storage.from("site-assets").upload(path, file, publicObjectUploadOptions(file));
  if (error) throw new Error(formatStorageError(error, "audit-attachment"));
  const { data } = client.storage.from("site-assets").getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

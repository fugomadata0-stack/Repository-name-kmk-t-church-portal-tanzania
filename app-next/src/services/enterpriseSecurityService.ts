import { getSupabase } from "../lib/supabase";
import { formatPostgrestError } from "../lib/supabaseErrors";
import { normalizePortalRoleKey } from "../lib/enterpriseRbac";

export type SecurityAuditOutcome = "allowed" | "denied" | "error";

export type SecurityAuditLogRow = {
  id: string;
  auth_user_id: string | null;
  role_key: string | null;
  event_type: string;
  module_key: string | null;
  resource_path: string | null;
  outcome: SecurityAuditOutcome;
  message: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type LogSecurityEventInput = {
  eventType: string;
  moduleKey?: string;
  resourcePath?: string;
  outcome?: SecurityAuditOutcome;
  message?: string;
  detail?: Record<string, unknown>;
};

let securityRpcUnavailable = false;

export async function logSecurityEvent(input: LogSecurityEventInput): Promise<void> {
  if (securityRpcUnavailable) return;
  const c = getSupabase();
  if (!c) return;
  try {
    const { error } = await c.rpc("portal_log_security_event", {
      p_event_type: input.eventType,
      p_module_key: input.moduleKey ?? null,
      p_resource_path: input.resourcePath ?? null,
      p_outcome: input.outcome ?? "denied",
      p_message: input.message ?? null,
      p_detail: input.detail ?? {},
    });
    if (error) {
      const msg = formatPostgrestError(error, "portal_log_security_event");
      if (/not find|does not exist|42883|pgrst202/i.test(msg)) {
        securityRpcUnavailable = true;
      }
    }
  } catch {
    /* non-blocking */
  }
}

export async function logRbacDenied(moduleKey: string, detail?: Record<string, unknown>): Promise<void> {
  await Promise.all([
    logSecurityEvent({
      eventType: "rbac_denied",
      moduleKey,
      outcome: "denied",
      message: "module_not_in_matrix",
      detail,
    }),
    logAccessEventFallback("rbac_denied", moduleKey, detail),
  ]);
}

async function logAccessEventFallback(
  eventType: string,
  moduleKey: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  try {
    await c.from("portal_access_events").insert({
      event_type: eventType,
      detail: { module_key: moduleKey, ...detail },
    });
  } catch {
    /* optional diary */
  }
}

export async function fetchSecurityAuditLogs(limit = 200): Promise<SecurityAuditLogRow[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c
    .from("portal_security_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (/does not exist|42P01/i.test(error.message ?? "")) return [];
    throw new Error(formatPostgrestError(error, "portal_security_audit_logs"));
  }
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      auth_user_id: row.auth_user_id != null ? String(row.auth_user_id) : null,
      role_key: row.role_key != null ? normalizePortalRoleKey(String(row.role_key)) : null,
      event_type: String(row.event_type ?? ""),
      module_key: row.module_key != null ? String(row.module_key) : null,
      resource_path: row.resource_path != null ? String(row.resource_path) : null,
      outcome: (String(row.outcome ?? "denied") as SecurityAuditOutcome) || "denied",
      message: row.message != null ? String(row.message) : null,
      detail: (row.detail as Record<string, unknown> | null) ?? null,
      created_at: String(row.created_at ?? ""),
    };
  });
}

export async function logSessionEvent(
  eventType: "login" | "logout" | "token_refresh" | "session_idle",
  userLabel?: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  try {
    await c.from("portal_access_events").insert({
      user_label: userLabel ?? null,
      event_type: eventType,
      detail: detail ?? null,
    });
  } catch {
    /* non-blocking */
  }
}

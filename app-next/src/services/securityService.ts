import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList } from "../lib/supabaseResult";
import { PORTAL_MODULE_KEYS } from "../data/portalModuleKeys";
import type {
  PortalAccessEventRow,
  PortalDirectoryProfile,
  PortalModuleMatrixRow,
  PortalRoleRow,
  PortalSecurityPoliciesRow,
  PortalVisibilityRule,
} from "../types";

let rateLimitRpcMissing = false;

export const DEFAULT_SECURITY_POLICY: Record<string, unknown> = {
  password_min_length: 10,
  lockout_attempts: 5,
  session_idle_minutes: 30,
  mfa_enforced_roles: ["super_admin", "chief_admin", "finance_admin"],
  ip_allowlist_enabled: false,
  ip_allowlist_cidrs: [],
  require_email_verify: true,
  audit_retention_days: 365,
  rate_limit: {
    login: { enabled: true, window_seconds: 300, max_attempts: 5, block_seconds: 300 },
    api: { enabled: true, window_seconds: 60, max_attempts: 120, block_seconds: 60 },
    uploads: { enabled: true, window_seconds: 60, max_attempts: 30, block_seconds: 180 },
  },
};

export type RateLimitCheckResult = {
  allowed: boolean;
  retry_after_seconds: number;
  attempts: number;
};

function normalizeSecurityPolicy(input: unknown): Record<string, unknown> {
  const raw = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  return {
    ...DEFAULT_SECURITY_POLICY,
    ...raw,
    rate_limit: {
      ...(DEFAULT_SECURITY_POLICY.rate_limit as Record<string, unknown>),
      ...(raw.rate_limit && typeof raw.rate_limit === "object" && !Array.isArray(raw.rate_limit)
        ? (raw.rate_limit as Record<string, unknown>)
        : {}),
    },
  };
}

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

export async function fetchPortalRoles(): Promise<PortalRoleRow[]> {
  const c = clientOrThrow();
  const res = await c.from("portal_roles").select("*").order("hierarchy_rank", { ascending: true });
  const rows = unwrapList(res, "portal_roles.list");
  return rows as PortalRoleRow[];
}

export async function updatePortalRole(
  roleKey: string,
  patch: Partial<Pick<PortalRoleRow, "label_sw" | "label_en" | "hierarchy_rank" | "description">>
): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("portal_roles").update({ ...patch, updated_at: new Date().toISOString() }).eq("role_key", roleKey);
  if (error) throw new Error(formatPostgrestError(error, "portal_roles.update"));
}

export async function createPortalRole(row: {
  role_key: string;
  label_sw: string;
  label_en?: string | null;
  hierarchy_rank?: number;
  description?: string | null;
}): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("portal_roles").insert({
    role_key: row.role_key.trim(),
    label_sw: row.label_sw.trim(),
    label_en: row.label_en?.trim() || null,
    hierarchy_rank: Number.isFinite(Number(row.hierarchy_rank)) ? Number(row.hierarchy_rank) : 500,
    description: row.description?.trim() || null,
    is_system: false,
  });
  if (error) throw new Error(formatPostgrestError(error, "portal_roles.insert"));
}

/**
 * Jedwali la matrix kutoka DB; moduli zisizo na safu bado zijazwa kwa can_* = false
 * (si data ya dashibodi — ni chaguomsingi salama la ruhusa ili gridi isivunjike).
 */
export async function fetchMatrixForRole(roleKey: string): Promise<PortalModuleMatrixRow[]> {
  const c = clientOrThrow();
  const res = await c.from("portal_module_matrix").select("*").eq("role_key", roleKey);
  const rows = unwrapList(res, "portal_module_matrix.list") as PortalModuleMatrixRow[];
  const byMod = new Map(rows.map((r) => [r.module_key, r]));
  return PORTAL_MODULE_KEYS.map((mk) => {
    const x = byMod.get(mk);
    if (x) return x;
    return {
      role_key: roleKey,
      module_key: mk,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_approve: false,
      can_reject: false,
      can_export: false,
      can_print: false,
      can_upload: false,
      can_download: false,
      can_manage_settings: false,
      can_audit: false,
      updated_at: new Date().toISOString(),
    };
  });
}

export async function upsertMatrixRows(rows: PortalModuleMatrixRow[]): Promise<void> {
  if (rows.length === 0) return;
  const c = clientOrThrow();
  const payload = rows.map((r) => ({
    role_key: r.role_key,
    module_key: r.module_key,
    can_view: r.can_view,
    can_create: r.can_create,
    can_edit: r.can_edit,
    can_delete: r.can_delete,
    can_approve: r.can_approve ?? false,
    can_reject: r.can_reject ?? false,
    can_export: r.can_export,
    can_print: r.can_print ?? false,
    can_upload: r.can_upload ?? false,
    can_download: r.can_download ?? false,
    can_manage_settings: r.can_manage_settings ?? false,
    can_audit: r.can_audit,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await c.from("portal_module_matrix").upsert(payload, { onConflict: "role_key,module_key" });
  if (error) throw new Error(formatPostgrestError(error, "portal_module_matrix.upsert"));
}

export async function fetchDirectoryProfiles(): Promise<PortalDirectoryProfile[]> {
  const c = clientOrThrow();
  const res = await c.from("portal_directory_profiles").select("*").order("created_at", { ascending: false });
  return unwrapList(res, "portal_directory_profiles.list") as PortalDirectoryProfile[];
}

export async function upsertDirectoryProfile(row: Partial<PortalDirectoryProfile> & { email: string }): Promise<PortalDirectoryProfile> {
  const c = clientOrThrow();
  if (!row.id && !row.role_key?.trim()) {
    throw new Error("role_key linahitajika kwa mtumiaji mpya.");
  }
  const payload = {
    email: row.email.trim(),
    full_name: row.full_name ?? null,
    phone: row.phone ?? null,
    role_key: row.role_key as string,
    auth_user_id: row.auth_user_id ?? null,
    dayosisi_scope: row.dayosisi_scope ?? null,
    jimbo_scope: row.jimbo_scope ?? null,
    tawi_scope: row.tawi_scope ?? null,
    status: row.status ?? "pending",
    notes: row.notes ?? null,
    meta: row.meta ?? {},
    updated_at: new Date().toISOString(),
  };
  if (row.id) {
    const { data, error } = await c.from("portal_directory_profiles").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "portal_directory_profiles.update"));
    return data as PortalDirectoryProfile;
  }
  const { data, error } = await c.from("portal_directory_profiles").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "portal_directory_profiles.insert"));
  return data as PortalDirectoryProfile;
}

export async function deleteDirectoryProfile(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("portal_directory_profiles").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "portal_directory_profiles.delete"));
}

export async function fetchVisibilityRules(): Promise<PortalVisibilityRule[]> {
  const c = clientOrThrow();
  const res = await c.from("portal_visibility_rules").select("*").order("priority", { ascending: true });
  return unwrapList(res, "portal_visibility_rules.list") as PortalVisibilityRule[];
}

export async function upsertVisibilityRule(
  row: Partial<PortalVisibilityRule> & { name: string; module_key: string; scope_type: PortalVisibilityRule["scope_type"] }
): Promise<PortalVisibilityRule> {
  const c = clientOrThrow();
  const base = {
    name: row.name.trim(),
    module_key: row.module_key,
    scope_type: row.scope_type,
    dayosisi_match: row.dayosisi_match ?? null,
    jimbo_match: row.jimbo_match ?? null,
    tawi_match: row.tawi_match ?? null,
    allowed_roles: row.allowed_roles ?? [],
    priority: row.priority ?? 100,
    active: row.active ?? true,
    notes: row.notes ?? null,
    meta: row.meta ?? {},
    updated_at: new Date().toISOString(),
  };
  if (row.id) {
    const { data, error } = await c.from("portal_visibility_rules").update(base).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "portal_visibility_rules.update"));
    return data as PortalVisibilityRule;
  }
  const { data, error } = await c.from("portal_visibility_rules").insert(base).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "portal_visibility_rules.insert"));
  return data as PortalVisibilityRule;
}

export async function deleteVisibilityRule(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("portal_visibility_rules").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "portal_visibility_rules.delete"));
}

/**
 * Sera za mfumo (si KPI za dashibodi). Ikiwa hakuna safu bado kwenye DB, rudisha chaguomsingi tupu
 * ili skrini ya usalama ifunguke bila kudai rekodi ya awali.
 */
export async function fetchSecurityPolicies(): Promise<PortalSecurityPoliciesRow> {
  const c = clientOrThrow();
  const { data, error } = await c.from("portal_security_policies").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(formatPostgrestError(error, "portal_security_policies"));
  if (!data) {
    return {
      id: 1,
      policy_json: normalizeSecurityPolicy({}),
      updated_at: new Date().toISOString(),
    };
  }
  return {
    ...(data as PortalSecurityPoliciesRow),
    policy_json: normalizeSecurityPolicy((data as PortalSecurityPoliciesRow).policy_json ?? {}),
  };
}

export async function saveSecurityPolicies(policyJson: Record<string, unknown>): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c
    .from("portal_security_policies")
    .upsert({ id: 1, policy_json: normalizeSecurityPolicy(policyJson), updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new Error(formatPostgrestError(error, "portal_security_policies.save"));
}

export async function fetchAccessEvents(limit = 300): Promise<PortalAccessEventRow[]> {
  const c = clientOrThrow();
  const res = await c
    .from("portal_access_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  const data = unwrapList(res, "portal_access_events.list");
  return data.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      ...r,
      id: String(x.id ?? ""),
    } as PortalAccessEventRow;
  });
}

export async function insertAccessEvent(entry: {
  user_label?: string;
  event_type: PortalAccessEventRow["event_type"];
  detail?: Record<string, unknown>;
}): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("portal_access_events").insert({
    user_label: entry.user_label ?? null,
    event_type: entry.event_type,
    detail: entry.detail ?? null,
  });
  if (error) throw new Error(formatPostgrestError(error, "portal_access_events.insert"));
}

/** Hesabu za KPI za dashibodi (haitupi makosa ikiwa jedwali bado halijasukuliwa). */
export async function fetchPortalSecurityCounts(): Promise<{
  directory: number;
  visibilityRules: number;
  rbacMatrixRows: number;
}> {
  const c = getSupabase();
  if (!c) return { directory: 0, visibilityRules: 0, rbacMatrixRows: 0 };
  try {
    const [d, v, mx] = await Promise.all([
      c.from("portal_directory_profiles").select("*", { count: "exact", head: true }),
      c.from("portal_visibility_rules").select("*", { count: "exact", head: true }),
      c.from("portal_module_matrix").select("*", { count: "exact", head: true }),
    ]);
    if (d.error || v.error || mx.error) return { directory: 0, visibilityRules: 0, rbacMatrixRows: 0 };
    return {
      directory: d.count ?? 0,
      visibilityRules: v.count ?? 0,
      rbacMatrixRows: mx.count ?? 0,
    };
  } catch {
    return { directory: 0, visibilityRules: 0, rbacMatrixRows: 0 };
  }
}

export async function checkAndIncrementRateLimit(
  scope: string,
  identifier: string,
  maxAttempts: number,
  windowSeconds: number,
  blockSeconds: number
): Promise<RateLimitCheckResult | null> {
  const c = getSupabase();
  if (!c) return null;
  if (rateLimitRpcMissing) return null;
  const { data, error } = await c.rpc("portal_rate_limit_check_and_increment", {
    p_scope: scope,
    p_identifier: identifier,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
    p_block_seconds: blockSeconds,
  });
  if (error) {
    const code = String((error as { code?: unknown } | null)?.code ?? "").toUpperCase();
    const status = Number((error as { status?: unknown } | null)?.status ?? 0);
    const msg = formatPostgrestError(error, "portal_rate_limit_check_and_increment");
    const low = msg.toLowerCase();
    if (
      low.includes("404") ||
      low.includes("not find") ||
      low.includes("does not exist") ||
      low.includes("undefined function") ||
      code === "PGRST202" ||
      code === "42883" ||
      status === 400
    ) {
      rateLimitRpcMissing = true;
    }
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    allowed: Boolean(r.allowed),
    retry_after_seconds: Number(r.retry_after_seconds ?? 0),
    attempts: Number(r.attempts ?? 0),
  };
}

export async function resetRateLimit(scope: string, identifier: string): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  if (rateLimitRpcMissing) return;
  const { error } = await c.rpc("portal_rate_limit_reset", { p_scope: scope, p_identifier: identifier });
  if (error) {
    const code = String((error as { code?: unknown } | null)?.code ?? "").toUpperCase();
    const status = Number((error as { status?: unknown } | null)?.status ?? 0);
    const msg = formatPostgrestError(error, "portal_rate_limit_reset");
    const low = msg.toLowerCase();
    if (
      low.includes("404") ||
      low.includes("not find") ||
      low.includes("does not exist") ||
      low.includes("undefined function") ||
      code === "PGRST202" ||
      code === "42883" ||
      status === 400
    ) {
      rateLimitRpcMissing = true;
    }
  }
}

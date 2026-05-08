import type { FunctionsHttpError } from "@supabase/supabase-js";
import { formatPostgrestError, formatCaughtError, isMissingTableError } from "../lib/supabaseErrors";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabaseClient";
import type { PortalDirectoryProfile, UserRole } from "../types";
import type { Phase34RoleChangeRow } from "./phase34PromotionService";
import { fetchRoleChangeHistory } from "./phase34PromotionService";

/** Super Admin hawezi kudhibiti maisha ya akaunti ya Chief Admin (sawa na sheria za Phase 34). */
export function canAdminTargetLifecycle(actorRole: UserRole, target: PortalDirectoryProfile): boolean {
  if (target.role_key === "chief_admin" && actorRole === "super_admin") return false;
  return true;
}

export type Phase36LifecycleAction = "activate" | "suspend" | "reset_password";

export interface Phase36UserLifecycleResponse {
  ok: boolean;
  error?: string;
  new_status?: string;
  email_sent?: boolean;
  mock_mode?: boolean;
  recovery_link?: string;
  email_error?: string | null;
  warning?: string;
}

export interface Phase36LifecycleEventRow {
  id: string;
  profile_id: string;
  action: Phase36LifecycleAction;
  previous_status: string | null;
  new_status: string | null;
  actor_user_id: string | null;
  target_email: string;
  target_role: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function userLifecycleAction(payload: {
  action: Phase36LifecycleAction;
  profile_id: string;
  reason?: string;
}): Promise<Phase36UserLifecycleResponse> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase haijasanidiwa." };

  try {
    const { data, error } = await sb.functions.invoke<Phase36UserLifecycleResponse>("phase36-user-lifecycle", {
      body: {
        action: payload.action,
        profile_id: payload.profile_id,
        reason: payload.reason ?? null,
      },
    });

    if (error) {
      const ctx = error as FunctionsHttpError;
      const msg = typeof ctx.message === "string" ? ctx.message : "Edge Function haipo au imeshindwa.";
      return { ok: false, error: msg };
    }
    if (!data) return { ok: false, error: "Hakuna majibu." };
    return data;
  } catch (e) {
    return { ok: false, error: formatCaughtError(e) };
  }
}

export async function fetchPhase36LifecycleEvents(limit = 200): Promise<Phase36LifecycleEventRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("phase36_account_lifecycle_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingTableError(error as PostgrestError)) return [];
    throw new Error(formatPostgrestError(error as PostgrestError, "phase36_account_lifecycle_events"));
  }
  return (data ?? []) as Phase36LifecycleEventRow[];
}

export type UnifiedAuditRow =
  | { id: string; kind: "lifecycle"; created_at: string; detail: Phase36LifecycleEventRow }
  | { id: string; kind: "role"; created_at: string; detail: Phase34RoleChangeRow };

/** Historia ya pamoja: maisha ya akaunti (Phase 36) + mabadiliko ya jukumu (Phase 34). */
export async function fetchUnifiedRoleAndLifecycleTimeline(limitPerSource = 120): Promise<UnifiedAuditRow[]> {
  let life: Phase36LifecycleEventRow[] = [];
  let roles: Phase34RoleChangeRow[] = [];
  try {
    life = await fetchPhase36LifecycleEvents(limitPerSource);
  } catch {
    life = [];
  }
  try {
    roles = await fetchRoleChangeHistory();
  } catch {
    roles = [];
  }

  const merged: UnifiedAuditRow[] = [
    ...life.map((d) => ({
      id: `lc-${d.id}`,
      kind: "lifecycle" as const,
      created_at: d.created_at,
      detail: d,
    })),
    ...roles.slice(0, limitPerSource).map((d) => ({
      id: `rc-${d.id}`,
      kind: "role" as const,
      created_at: d.created_at,
      detail: d,
    })),
  ];
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return merged.slice(0, limitPerSource * 2);
}

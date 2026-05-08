import type { PostgrestError } from "@supabase/supabase-js";
import { formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import type { PortalDirectoryProfile, UserRole } from "../types";
import { fetchDirectoryProfiles, fetchPortalRoles, upsertDirectoryProfile } from "./securityService";

export interface Phase34RoleChangeRow {
  id: string;
  profile_id: string;
  previous_role_key: string;
  new_role_key: string;
  action: "promote" | "demote";
  reason: string | null;
  performed_by: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

/** Sheria za biashara: Super Admin hawezi kugusa Chief Admin. */
export function assertRoleChangeAllowed(
  actorRole: UserRole,
  target: PortalDirectoryProfile,
  newRoleKey: string
): void {
  if (target.role_key === "chief_admin" && actorRole === "super_admin") {
    throw new Error("Super Admin hawezi kubadilisha au kuondoa ruhusa za Chief Admin.");
  }
  if (newRoleKey === "chief_admin" && actorRole === "super_admin") {
    throw new Error("Super Admin hawezi kuongeza au kuhamisha mtu kuwa Chief Admin.");
  }
  if (target.role_key === "chief_admin" && newRoleKey !== "chief_admin" && actorRole !== "chief_admin") {
    throw new Error("Kuondoa au kupunguza Chief Admin kunaruhusiwa kwa Chief Admin pekee.");
  }
}

export async function fetchRoleChangeHistory(): Promise<Phase34RoleChangeRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("phase34_role_change_history")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error as PostgrestError)) return [];
    throw new Error(formatPostgrestError(error as PostgrestError, "phase34_role_change_history"));
  }
  return (data ?? []) as Phase34RoleChangeRow[];
}

export async function recordRoleChange(entry: {
  profile_id: string;
  previous_role_key: string;
  new_role_key: string;
  action: "promote" | "demote";
  reason?: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("phase34_role_change_history").insert({
    profile_id: entry.profile_id,
    previous_role_key: entry.previous_role_key,
    new_role_key: entry.new_role_key,
    action: entry.action,
    reason: entry.reason?.trim() || null,
    meta: {},
  });
  if (error && !isMissingTableError(error as PostgrestError)) {
    throw new Error(formatPostgrestError(error as PostgrestError, "phase34_role_change_history.insert"));
  }
}

/** Nambari ndogo ya hierarchy_rank = mamlaka makubwa zaidi (kulingana na portal_roles). */
export async function inferRoleChangeAction(previousRoleKey: string, newRoleKey: string): Promise<"promote" | "demote"> {
  try {
    const roles = await fetchPortalRoles();
    const rank = (k: string) => roles.find((r) => r.role_key === k)?.hierarchy_rank ?? 999;
    const rp = rank(previousRoleKey);
    const rn = rank(newRoleKey);
    return rn < rp ? "promote" : "demote";
  } catch {
    return "promote";
  }
}

export async function applyRoleChange(params: {
  actorRole: UserRole;
  profile: PortalDirectoryProfile;
  newRoleKey: string;
  reason: string;
  action: "promote" | "demote";
}): Promise<PortalDirectoryProfile> {
  assertRoleChangeAllowed(params.actorRole, params.profile, params.newRoleKey);
  const updated = await upsertDirectoryProfile({
    id: params.profile.id,
    email: params.profile.email,
    role_key: params.newRoleKey,
    full_name: params.profile.full_name ?? undefined,
    phone: params.profile.phone ?? undefined,
    dayosisi_scope: params.profile.dayosisi_scope ?? undefined,
    jimbo_scope: params.profile.jimbo_scope ?? undefined,
    tawi_scope: params.profile.tawi_scope ?? undefined,
    status: params.profile.status,
    notes: params.profile.notes ?? undefined,
    meta: params.profile.meta ?? {},
  });
  try {
    await recordRoleChange({
      profile_id: params.profile.id,
      previous_role_key: params.profile.role_key,
      new_role_key: params.newRoleKey,
      action: params.action,
      reason: params.reason,
    });
  } catch {
    /* historia haijalishi iwapo jedwali halipo */
  }
  return updated;
}

export { fetchDirectoryProfiles };

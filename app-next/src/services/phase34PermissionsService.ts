import type { PostgrestError } from "@supabase/supabase-js";
import { isMissingTableError } from "../lib/supabaseErrors";
import type { PortalModuleMatrixRow, UserRole } from "../types";
import { fetchMatrixForRole, fetchPortalRoles, upsertMatrixRows } from "./securityService";

/** Super Admin anaweza kutazama matrix; Chief Admin pekee anahariri (UX + biashara). */
export function canEditPermissionsMatrix(actorRole: UserRole): boolean {
  return actorRole === "chief_admin";
}

export function canViewPermissionsMatrix(actorRole: UserRole): boolean {
  return actorRole === "chief_admin" || actorRole === "super_admin";
}

/**
 * Super Admin asiweze kupunguza ruhusa za jukumu chief_admin kwenye matrix.
 * Tunazuia kuokoa ikiwa safu ya chief_admin ingependekeza can_view=false kwa moduli zote muhimu.
 */
export function guardChiefAdminMatrixRows(rows: PortalModuleMatrixRow[], actorRole: UserRole): PortalModuleMatrixRow[] {
  if (actorRole !== "super_admin") return rows;
  return rows.map((r) => {
    if (r.role_key !== "chief_admin") return r;
    const critical = ["dashboard", "usalama", "mipangilio", "invite_promote_permissions"];
    if (!critical.includes(r.module_key)) return r;
    return {
      ...r,
      can_view: true,
      can_edit: r.can_edit || false,
      can_create: r.can_create || false,
      can_delete: r.can_delete || false,
      can_export: r.can_export || false,
      can_audit: r.can_audit || false,
    };
  });
}

export async function loadRolesForMatrix(): Promise<{ role_key: string; label_sw: string }[]> {
  try {
    const roles = await fetchPortalRoles();
    return roles.map((x) => ({ role_key: x.role_key, label_sw: x.label_sw }));
  } catch (e) {
    if (e && typeof e === "object" && "message" in e && isMissingTableError(e as PostgrestError)) return [];
    throw e;
  }
}

export async function loadMatrixSafe(roleKey: string): Promise<PortalModuleMatrixRow[]> {
  try {
    return await fetchMatrixForRole(roleKey);
  } catch (e) {
    if (e && typeof e === "object" && "message" in e && isMissingTableError(e as PostgrestError)) return [];
    throw e;
  }
}

export async function saveMatrixSafe(rows: PortalModuleMatrixRow[], actorRole: UserRole): Promise<void> {
  if (!canEditPermissionsMatrix(actorRole)) {
    throw new Error("Uhariri wa matrix unaruhusiwa kwa Chief Admin pekee.");
  }
  const cleaned = guardChiefAdminMatrixRows(rows, actorRole);
  await upsertMatrixRows(cleaned);
}

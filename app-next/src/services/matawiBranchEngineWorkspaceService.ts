import { formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { stripUndefined } from "../lib/supabaseResult";
import { getSupabase } from "../lib/supabaseClient";
import type { MasterBranchScope } from "./masterBranchEngineService";

import type { BranchEngineLeaderSlot } from "../lib/matawiBranchEngineTypes";

export type BranchEngineWorkspacePayload = {
  fields: Record<string, string>;
  contributionSources?: string[];
  /** URLs za faili zilizopakiwa kwenye Storage. */
  uploads?: Record<string, { publicUrl: string; fileName: string; uploadedAt: string }>;
  formHistory?: string[];
  /** Viongozi wa tawi (nafasi 4) — viunganisho na church_viongozi. */
  leaderSlots?: Record<string, BranchEngineLeaderSlot>;
  /** Viungo vya jedwali rasmi baada ya usawazishaji (mahudhurio, fedha, n.k.). */
  syncRefs?: {
    attendanceSessionId?: string;
    financeEntryId?: string;
  };
};

export type BranchEngineWorkspaceRecord = {
  scope: MasterBranchScope;
  entityId: string;
  activeModuleId: string;
  payload: BranchEngineWorkspacePayload;
  updatedAt: string | null;
};

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa — weka VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY.");
  return c;
}

function normalizePayload(raw: unknown): BranchEngineWorkspacePayload {
  if (!raw || typeof raw !== "object") return { fields: {} };
  const o = raw as Record<string, unknown>;
  if (o.fields && typeof o.fields === "object" && !Array.isArray(o.fields)) {
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(o.fields as Record<string, unknown>)) {
      if (typeof v === "string" || typeof v === "number") fields[k] = String(v);
    }
    const contributionSources = Array.isArray(o.contributionSources)
      ? o.contributionSources.map((x) => String(x)).filter(Boolean)
      : undefined;
    const uploads =
      o.uploads && typeof o.uploads === "object" && !Array.isArray(o.uploads)
        ? (o.uploads as BranchEngineWorkspacePayload["uploads"])
        : undefined;
    const formHistory = Array.isArray(o.formHistory)
      ? o.formHistory.map((x) => String(x)).slice(-200)
      : undefined;
    let leaderSlots: BranchEngineWorkspacePayload["leaderSlots"];
    if (o.leaderSlots && typeof o.leaderSlots === "object" && !Array.isArray(o.leaderSlots)) {
      leaderSlots = {};
      for (const [role, slot] of Object.entries(o.leaderSlots as Record<string, unknown>)) {
        if (!slot || typeof slot !== "object") continue;
        const s = slot as Record<string, unknown>;
        leaderSlots[role] = {
          id: s.id == null ? undefined : String(s.id),
          role: String(s.role ?? role),
          jina: String(s.jina ?? ""),
          simu: s.simu == null ? undefined : String(s.simu),
          whatsapp: s.whatsapp == null ? undefined : String(s.whatsapp),
          email: s.email == null ? undefined : String(s.email),
          status: s.status == null ? undefined : String(s.status),
        };
      }
    }
    let syncRefs: BranchEngineWorkspacePayload["syncRefs"];
    if (o.syncRefs && typeof o.syncRefs === "object" && !Array.isArray(o.syncRefs)) {
      const sr = o.syncRefs as Record<string, unknown>;
      syncRefs = {
        attendanceSessionId: sr.attendanceSessionId == null ? undefined : String(sr.attendanceSessionId),
        financeEntryId: sr.financeEntryId == null ? undefined : String(sr.financeEntryId),
      };
    }
    return { fields, contributionSources, uploads, formHistory, leaderSlots, syncRefs };
  }
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" || typeof v === "number") fields[k] = String(v);
  }
  return { fields };
}

export async function loadBranchEngineWorkspace(
  scope: MasterBranchScope,
  entityId = "",
): Promise<BranchEngineWorkspaceRecord | null> {
  const c = clientOrThrow();
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) throw new Error("Ingia kwenye akaunti ili kupakia data kutoka Supabase.");

  const { data, error } = await c
    .from("portal_branch_engine_workspace")
    .select("scope, entity_id, active_module_id, form_payload, updated_at")
    .eq("auth_user_id", user.id)
    .eq("scope", scope)
    .eq("entity_id", entityId || "")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error(
        "Jedwali portal_branch_engine_workspace halipo — endesha migration 20260628140000_portal_branch_engine_workspace.sql kwenye Supabase.",
      );
    }
    throw new Error(formatPostgrestError(error, "portal_branch_engine_workspace"));
  }
  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    scope: String(row.scope ?? scope) as MasterBranchScope,
    entityId: String(row.entity_id ?? ""),
    activeModuleId: String(row.active_module_id ?? "registration"),
    payload: normalizePayload(row.form_payload),
    updatedAt: row.updated_at == null ? null : String(row.updated_at),
  };
}

export async function saveBranchEngineWorkspace(input: {
  scope: MasterBranchScope;
  entityId?: string;
  activeModuleId?: string;
  payload: BranchEngineWorkspacePayload;
}): Promise<void> {
  const c = clientOrThrow();
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) throw new Error("Ingia kwenye akaunti ili kuhifadhi kwenye Supabase.");

  const row = stripUndefined({
    auth_user_id: user.id,
    scope: input.scope,
    entity_id: input.entityId ?? "",
    active_module_id: input.activeModuleId ?? "registration",
    form_payload: input.payload,
  });

  const { error } = await c.from("portal_branch_engine_workspace").upsert(row, {
    onConflict: "auth_user_id,scope,entity_id",
  });

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error(
        "Jedwali portal_branch_engine_workspace halipo — endesha migration kwenye Supabase.",
      );
    }
    throw new Error(formatPostgrestError(error, "portal_branch_engine_workspace upsert"));
  }
}

export async function clearBranchEngineWorkspace(scope: MasterBranchScope, entityId = ""): Promise<void> {
  const c = clientOrThrow();
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) throw new Error("Ingia kwenye akaunti ili kufuta data.");

  const { error } = await c
    .from("portal_branch_engine_workspace")
    .delete()
    .eq("auth_user_id", user.id)
    .eq("scope", scope)
    .eq("entity_id", entityId || "");

  if (error && !isMissingTableError(error)) {
    throw new Error(formatPostgrestError(error, "portal_branch_engine_workspace delete"));
  }
}

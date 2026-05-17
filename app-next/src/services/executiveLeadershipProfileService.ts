import { resolveHierarchyLevelFromLeader } from "../lib/certificateEngine/resolveLevel";
import { computeAgeFromBirthDate, computeYearsBetween } from "../lib/executiveLeadershipProfile/profileCalculations";
import { roleTitleForSlot } from "../lib/executiveLeadershipProfile/hierarchyConfig";
import type { ExecutiveHierarchyLevel } from "../lib/executiveLeadershipProfile/hierarchyConfig";
import { formatPostgrestError } from "../lib/supabaseErrors";
import {
  patchOfficialLockedViongoziMedia,
  syncViongoziLeaderMediaToNationalProfile,
} from "../lib/nationalLeadershipSync";
import { isChurchViongoziOfficialLocked, mapViongoziRow } from "./viongoziService";
import { getSupabase } from "../lib/supabaseClient";
import {
  fetchLeadershipEducationCatalogOptional,
  fetchLeadershipProfileExtendedOptional,
  fetchLeadershipRoleCatalogOptional,
  upsertLeadershipProfileExtended,
  type LeadershipEducationCatalogRow,
  type LeadershipProfileExtendedRow,
  type LeadershipRoleCatalogRow,
} from "./leadershipCredentialsEngineService";
import { fetchLeadershipCvBundle, saveLeadershipCvBundle } from "./leadershipCvEngineService";
import type { LeadershipCvBundle } from "../types";
import type { NationalLeadershipProfileRow } from "./nationalLeadershipService";
import type { KiongoziRecord } from "../types";

export type ExecutiveProfileBundle = {
  leader: KiongoziRecord;
  extended: LeadershipProfileExtendedRow | null;
  cvBundle: LeadershipCvBundle | null;
  computedAge: number | null;
  computedYearsMinistry: number | null;
  computedYearsPosition: number | null;
};

export type RoleSlotAssignment = {
  role: LeadershipRoleCatalogRow;
  assignedLeader: KiongoziRecord | null;
  nationalRow: NationalLeadershipProfileRow | null;
};

export async function loadExecutiveProfileCatalogs(): Promise<{
  roles: LeadershipRoleCatalogRow[];
  education: LeadershipEducationCatalogRow[];
}> {
  const [roles, education] = await Promise.all([
    fetchLeadershipRoleCatalogOptional(),
    fetchLeadershipEducationCatalogOptional(),
  ]);
  return { roles, education };
}

export async function loadExecutiveProfileBundle(leaderId: string): Promise<ExecutiveProfileBundle | null> {
  const c = getSupabase();
  if (!c || !leaderId.trim()) return null;
  const res = await c
    .from("church_viongozi")
    .select("*, dayosisi ( jina ), church_jimbo ( jina ), church_tawi ( jina )")
    .eq("id", leaderId)
    .maybeSingle();
  if (res.error || !res.data) return null;

  const leader = mapViongoziRow(res.data as Record<string, unknown>);
  const [extended, cvBundle] = await Promise.all([
    fetchLeadershipProfileExtendedOptional(leaderId),
    fetchLeadershipCvBundle(leaderId),
  ]);

  const dob = leader.date_of_birth ?? null;
  const startMinistry = extended?.position_started_at ?? leader.start_date ?? leader.appointment_date;
  const startPos = extended?.position_started_at ?? leader.start_date ?? leader.appointment_date;
  const endPos = extended?.position_ended_at ?? leader.end_date;

  return {
    leader,
    extended,
    cvBundle,
    computedAge: computeAgeFromBirthDate(dob),
    computedYearsMinistry:
      extended?.years_in_ministry ??
      computeYearsBetween(startMinistry, leader.former_leader ? endPos : null),
    computedYearsPosition:
      extended?.years_in_current_position ??
      computeYearsBetween(startPos, leader.former_leader ? endPos : null),
  };
}

export type SaveExecutiveProfileInput = {
  leaderId: string;
  roleKey?: string | null;
  catalogLevelKey?: ExecutiveHierarchyLevel | null;
  jimboLeaderVariant?: string | null;
  cheoTitle?: string;
  viongoziPatch?: Partial<KiongoziRecord>;
  extendedPatch: Partial<Omit<LeadershipProfileExtendedRow, "id" | "leader_id">>;
  cvBundle?: LeadershipCvBundle | null;
};

export async function saveExecutiveProfileBundle(input: SaveExecutiveProfileInput): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");

  const vPatch: Record<string, unknown> = {};
  if (input.viongoziPatch) {
    const p = input.viongoziPatch;
    if (p.jina != null) vPatch.jina = p.jina;
    if (p.full_name != null) vPatch.full_name = p.full_name;
    if (p.gender != null) vPatch.gender = p.gender;
    if (p.simu != null) vPatch.simu = p.simu;
    if (p.whatsapp != null) vPatch.whatsapp = p.whatsapp;
    if (p.email != null) vPatch.email = p.email;
    if (p.address != null) vPatch.address = p.address;
    if (p.mkoa != null) vPatch.mkoa = p.mkoa;
    if (p.wilaya != null) vPatch.wilaya = p.wilaya;
    if (p.date_of_birth != null) vPatch.date_of_birth = p.date_of_birth || null;
    if (p.start_date != null) vPatch.start_date = p.start_date || null;
    if (p.end_date != null) vPatch.end_date = p.end_date || null;
    if (p.biography != null) vPatch.biography = p.biography;
  }
  const officialLocked = await isChurchViongoziOfficialLocked(input.leaderId);

  if (!officialLocked) {
    if (input.cheoTitle?.trim()) vPatch.cheo = input.cheoTitle.trim();
    if (input.roleKey?.trim()) vPatch.role_key = input.roleKey.trim();
    if (input.catalogLevelKey) vPatch.catalog_level_key = input.catalogLevelKey;
    if (input.jimboLeaderVariant != null) vPatch.jimbo_leader_variant = input.jimboLeaderVariant.trim() || null;
  }

  if (!officialLocked && Object.keys(vPatch).length) {
    const patchToSend: Record<string, unknown> = vPatch;
    const upd = await c.from("church_viongozi").update(patchToSend).eq("id", input.leaderId);
    if (upd.error) {
      const msg = formatPostgrestError(upd.error, "church_viongozi.update");
      if (!msg.includes("role_key") && !msg.includes("catalog_level_key")) {
        throw new Error(msg);
      }
      delete patchToSend.role_key;
      delete patchToSend.catalog_level_key;
      delete patchToSend.jimbo_leader_variant;
      if (Object.keys(patchToSend).length) {
        const retry = await c.from("church_viongozi").update(patchToSend).eq("id", input.leaderId);
        if (retry.error) throw new Error(formatPostgrestError(retry.error, "church_viongozi.update"));
      }
    }
  }

  await upsertLeadershipProfileExtended(input.leaderId, input.extendedPatch);

  if (input.cvBundle) {
    await saveLeadershipCvBundle(input.leaderId, input.cvBundle);
  }

  if (officialLocked) {
    const rowRes = await c
      .from("church_viongozi")
      .select("*, dayosisi ( jina ), church_jimbo ( jina ), church_tawi ( jina )")
      .eq("id", input.leaderId)
      .maybeSingle();
    if (rowRes.data) {
      const leader = mapViongoziRow(rowRes.data as Record<string, unknown>);
      const p = input.viongoziPatch;
      if (p) {
        if (p.address != null) leader.address = p.address;
        if (p.mkoa != null) leader.mkoa = p.mkoa;
        if (p.wilaya != null) leader.wilaya = p.wilaya;
        if (p.biography != null) leader.biography = p.biography;
        if (p.photo_url != null) leader.photo_url = p.photo_url;
        if (p.signature_url != null) leader.signature_url = p.signature_url;
      }
      await patchOfficialLockedViongoziMedia(leader);
      await syncViongoziLeaderMediaToNationalProfile(leader);
    }
  }
}

export function matchLeaderToRole(
  leader: KiongoziRecord,
  role: LeadershipRoleCatalogRow,
): boolean {
  const rk = (leader as KiongoziRecord & { role_key?: string }).role_key;
  if (rk && rk === role.role_key) return true;
  const hay = `${leader.cheo} ${leader.ngazi}`.toLowerCase();
  const t = role.title_sw.toLowerCase();
  return hay.includes(t) || t.includes(hay.trim());
}

export function buildRoleSlots(
  level: ExecutiveHierarchyLevel,
  roles: LeadershipRoleCatalogRow[],
  viongozi: KiongoziRecord[],
  national: NationalLeadershipProfileRow[],
): RoleSlotAssignment[] {
  const levelRoles = roles.filter((r) => r.level_key === level);
  if (level === "national") {
    return levelRoles.map((role) => ({
      role,
      assignedLeader: null,
      nationalRow: national.find((n) => n.role_key === role.role_key) ?? null,
    }));
  }
  const pool = viongozi.filter((v) => resolveHierarchyLevelFromLeader(v) === level);
  return levelRoles.map((role) => ({
    role,
    assignedLeader: pool.find((l) => matchLeaderToRole(l, role)) ?? null,
    nationalRow: null,
  }));
}

export function resolveCheoFromRole(
  role: LeadershipRoleCatalogRow,
  jimboVariant?: string | null,
): string {
  return roleTitleForSlot(role, jimboVariant);
}

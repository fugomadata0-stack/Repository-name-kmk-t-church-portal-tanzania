/**
 * Usawazishaji salama kati ya national_leadership_profiles na church_viongozi (viongozi rasmi 4).
 * Haihubadili jina/cheo/simu kwenye church_viongozi — trigger ya lock inaruhusu media/wasifu tu.
 */
import { formatPostgrestError } from "./supabaseErrors";
import { getSupabase } from "./supabaseClient";
import type { NationalLeadershipProfileRow, NationalLeadershipRoleKey } from "../services/nationalLeadershipService";
import type { KiongoziRecord } from "../types";

export const OFFICIAL_LOCK_KEY_BY_ROLE: Record<NationalLeadershipRoleKey, string> = {
  askofu_mkuu: "kmkt_official_askofu_mkuu",
  katibu_mkuu: "kmkt_official_katibu_mkuu",
  naibu_katibu_mkuu: "kmkt_official_naibu_katibu_mkuu",
  mhasibu_mkuu: "kmkt_official_mhasibu",
};

const ROLE_BY_LOCK_KEY: Record<string, NationalLeadershipRoleKey> = Object.fromEntries(
  Object.entries(OFFICIAL_LOCK_KEY_BY_ROLE).map(([role, lock]) => [lock, role as NationalLeadershipRoleKey]),
) as Record<string, NationalLeadershipRoleKey>;

export function roleKeyFromOfficialLockKey(lockKey: string | null | undefined): NationalLeadershipRoleKey | null {
  const k = lockKey?.trim();
  if (!k) return null;
  return ROLE_BY_LOCK_KEY[k] ?? null;
}

/** Baada ya kuhifadhi national_leadership_profiles — sasisha picha/saini/wasifu kwenye church_viongozi. */
export async function syncNationalProfileMediaToChurchViongozi(row: NationalLeadershipProfileRow): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const lockKey = OFFICIAL_LOCK_KEY_BY_ROLE[row.role_key];
  const payload = {
    photo_url: row.profile_photo_url.trim() || null,
    signature_url: row.signature_url.trim() || null,
    biography: row.biography.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const res = await client.from("church_viongozi").update(payload).eq("official_lock_key", lockKey);
  if (res.error) {
    const msg = formatPostgrestError(res.error, "church_viongozi.sync_media");
    if (/identity fields are locked|official.*locked/i.test(msg)) {
      throw new Error(
        "Imeshindwa kusawazisha picha/wasifu kwenye jedwali la viongozi. Wasiliana na ICT ikiwa tatizo linaendelea.",
      );
    }
    throw new Error(msg);
  }
}

/** Kutoka Leadership CV — sasisha national_leadership_profiles (media + wasifu) bila kugusa church_viongozi lock. */
export async function syncViongoziLeaderMediaToNationalProfile(leader: KiongoziRecord): Promise<void> {
  const roleKey = roleKeyFromOfficialLockKey(leader.official_lock_key);
  if (!roleKey) return;
  const client = getSupabase();
  if (!client) return;

  const payload = {
    profile_photo_url: leader.photo_url?.trim() || "",
    signature_url: leader.signature_url?.trim() || "",
    biography: leader.biography?.trim() || "",
    updated_at: new Date().toISOString(),
  };

  const res = await client.from("national_leadership_profiles").update(payload).eq("role_key", roleKey);
  if (res.error) throw new Error(formatPostgrestError(res.error, "national_leadership_profiles.sync_from_viongozi"));
}

/** Sasisha church_viongozi kwa viongozi aliye locked — sehemu zisizo za utambulisho tu. */
export async function patchOfficialLockedViongoziMedia(leader: KiongoziRecord): Promise<void> {
  if (!leader.official_locked || !leader.id) return;
  const client = getSupabase();
  if (!client) return;

  const payload: Record<string, unknown> = {
    photo_url: leader.photo_url?.trim() || null,
    signature_url: leader.signature_url?.trim() || null,
    biography: leader.biography?.trim() || null,
    education_summary: leader.education_summary?.trim() || null,
    theology_training: leader.theology_training?.trim() || null,
    professional_skills: leader.professional_skills?.trim() || null,
    certificates_summary: leader.certificates_summary?.trim() || null,
    ministry_gifts: leader.ministry_gifts?.trim() || null,
    ministry_experience: leader.ministry_experience?.trim() || null,
    internal_notes: leader.internal_notes?.trim() || null,
    notes: leader.notes?.trim() || null,
    address: leader.address?.trim() || null,
    mkoa: leader.mkoa?.trim() || null,
    wilaya: leader.wilaya?.trim() || null,
    kata: leader.kata?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const res = await client.from("church_viongozi").update(payload).eq("id", leader.id);
  if (res.error) {
    const msg = formatPostgrestError(res.error, "church_viongozi.patch_media");
    if (/identity fields are locked/i.test(msg)) return;
    throw new Error(msg);
  }
}

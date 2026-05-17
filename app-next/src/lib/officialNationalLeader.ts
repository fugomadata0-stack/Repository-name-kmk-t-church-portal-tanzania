import type { NationalLeadershipRoleKey } from "../services/nationalLeadershipService";
import type { KiongoziRecord } from "../types";
import { OFFICIAL_LOCK_KEY_BY_ROLE } from "./nationalLeadershipSync";

/** Viongozi rasmi 4 wa KMK(T) — kwa njia salama ya kuhifadhi. */
export function isOfficialNationalLeader(
  leader: Pick<KiongoziRecord, "official_locked" | "official_lock_key"> | null | undefined,
): boolean {
  if (!leader) return false;
  if (leader.official_locked) return true;
  const key = leader.official_lock_key?.trim();
  return Boolean(key && key in OFFICIAL_LOCK_KEY_BY_ROLE);
}

export function officialRoleKeyFromLeader(
  leader: Pick<KiongoziRecord, "official_lock_key"> | null | undefined,
): NationalLeadershipRoleKey | null {
  const key = leader?.official_lock_key?.trim();
  if (!key) return null;
  return (key in OFFICIAL_LOCK_KEY_BY_ROLE ? key : null) as NationalLeadershipRoleKey | null;
}

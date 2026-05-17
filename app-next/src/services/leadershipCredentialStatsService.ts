import { getSupabase } from "../lib/supabaseClient";
import type { OfficialCertificateStatus } from "./leadershipOfficialCertificateService";

export type GlobalCredentialStats = {
  totalOfficial: number;
  pending: number;
  approved: number;
  verified: number;
  rejected: number;
};

/** Takwimu za jumla za vyeti rasmi — si lazima (kurudi 0 ikiwa hakuna Supabase). */
export async function fetchGlobalCredentialStatsOptional(): Promise<GlobalCredentialStats> {
  const empty: GlobalCredentialStats = {
    totalOfficial: 0,
    pending: 0,
    approved: 0,
    verified: 0,
    rejected: 0,
  };
  const c = getSupabase();
  if (!c) return empty;
  const res = await c.from("leadership_official_certificates").select("status");
  if (res.error || !res.data?.length) return empty;
  const counts: Partial<Record<OfficialCertificateStatus, number>> = {};
  for (const row of res.data) {
    const s = String((row as { status?: string }).status ?? "draft") as OfficialCertificateStatus;
    counts[s] = (counts[s] ?? 0) + 1;
  }
  const total = res.data.length;
  return {
    totalOfficial: total,
    pending: counts.pending ?? 0,
    approved: counts.approved ?? 0,
    verified: counts.verified ?? 0,
    rejected: counts.rejected ?? 0,
  };
}

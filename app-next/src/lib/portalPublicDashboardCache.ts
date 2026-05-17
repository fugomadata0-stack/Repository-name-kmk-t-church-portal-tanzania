/**
 * Shared cache for `portal_public_dashboard_counts` — epuka RPC mara 3+ kwa login.
 */
import type { PostgrestError } from "@supabase/supabase-js";
import { dedupeInFlight } from "./inFlightDedupe";
import {
  fetchPortalPublicDashboardCounts,
  type PortalPublicDashboardCounts,
} from "../services/portalPublicDashboardService";

const CACHE_KEY = "portal:public-dashboard-counts";
const TTL_MS = 45_000;

type CachedPayload = {
  at: number;
  counts: PortalPublicDashboardCounts | null;
  error: PostgrestError | null;
  attendanceColumnsFromRpc: boolean;
  majimboActiveColumnFromRpc: boolean;
};

let memory: CachedPayload | null = null;

export function invalidatePortalPublicDashboardCountsCache(): void {
  memory = null;
}

export async function fetchPortalPublicDashboardCountsCached(force = false): Promise<{
  counts: PortalPublicDashboardCounts | null;
  error: PostgrestError | null;
  attendanceColumnsFromRpc: boolean;
  majimboActiveColumnFromRpc: boolean;
}> {
  if (!force && memory && Date.now() - memory.at < TTL_MS) {
    return {
      counts: memory.counts,
      error: memory.error,
      attendanceColumnsFromRpc: memory.attendanceColumnsFromRpc,
      majimboActiveColumnFromRpc: memory.majimboActiveColumnFromRpc,
    };
  }
  return dedupeInFlight(CACHE_KEY, async () => {
    const res = await fetchPortalPublicDashboardCounts();
    memory = { at: Date.now(), ...res };
    return res;
  });
}

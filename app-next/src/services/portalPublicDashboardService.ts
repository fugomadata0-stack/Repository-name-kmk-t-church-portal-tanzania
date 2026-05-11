/**
 * Takwimu za strip ya KPI kwenye ukurasa wa kuingia (hali ya kabla ya kuingia) —
 * zinapatikana kupitia RPC ya Supabase (`portal_public_dashboard_counts`), sawa na
 * hesabu za jumla za taifa kwenye DB (security definer).
 */
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabaseClient";

export type PortalPublicDashboardCounts = {
  dayosisi: number;
  majimbo: number;
  matawi: number;
  waumini: number;
  viongozi: number;
  nyaraka: number;
  matukio: number;
};

function parseCount(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function rowToCounts(row: Record<string, unknown> | null | undefined): PortalPublicDashboardCounts | null {
  if (!row || typeof row !== "object") return null;
  return {
    dayosisi: parseCount(row.dayosisi as number | string | null | undefined),
    majimbo: parseCount(row.majimbo as number | string | null | undefined),
    matawi: parseCount(row.matawi as number | string | null | undefined),
    waumini: parseCount(row.waumini as number | string | null | undefined),
    viongozi: parseCount(row.viongozi as number | string | null | undefined),
    nyaraka: parseCount(row.nyaraka as number | string | null | undefined),
    matukio: parseCount(row.matukio as number | string | null | undefined),
  };
}

export async function fetchPortalPublicDashboardCounts(): Promise<{
  counts: PortalPublicDashboardCounts | null;
  error: PostgrestError | null;
}> {
  const c = getSupabase();
  if (!c) return { counts: null, error: null };
  const { data, error } = await c.rpc("portal_public_dashboard_counts");
  if (error) return { counts: null, error };
  const raw = Array.isArray(data) ? data[0] : data;
  const counts = rowToCounts(raw as Record<string, unknown>);
  return { counts, error: null };
}

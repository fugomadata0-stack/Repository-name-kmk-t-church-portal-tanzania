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
  /** Majimbo yenye status active (ikiwa RPC inarudisha safu hii). */
  majimboActive: number;
  matawi: number;
  /** Matawi yenye hali active (operational). */
  matawiActive: number;
  /** Matawi zinazosubiri uhakiki wa usajili (status pending). */
  matawiPending: number;
  /** Matawi zilizothibitishwa kwenye sajili (verification_status = verified). */
  matawiRegistryVerified: number;
  /** Matawi yenye sajili inayosubiri uhakiki (verification_status = pending_review). */
  matawiRegistryPendingReview: number;
  waumini: number;
  viongozi: number;
  nyaraka: number;
  matukio: number;
  /** Idadi ya vikao vya mahudhurio vilivyosajiliwa leo (TZ Dar es Salaam). */
  attendanceSessionsToday: number;
  /** Idadi ya vikao katika mwezi wa kalenda wa sasa (TZ). */
  attendanceSessionsMonth: number;
  /** Jumla ya wageni (safu ya visitors) kwa mwezi wa sasa. */
  attendanceVisitorsMonth: number;
  /** Miradi hai (ikiwa RPC inarudisha safu hii). */
  projectsActive?: number;
  /** Upakiaji wa michango unasubiri uhakiki. */
  contributionUploadsPending?: number;
  /** Idhini zinazosubiri (remittance + mapato). */
  approvalsPending?: number;
};

function parseCount(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const ATTENDANCE_RPC_COLUMN_KEYS = ["attendance_sessions_today", "attendance_sessions_month", "attendance_visitors_month"] as const;
const MAJIMBO_ACTIVE_RPC_KEY = "majimbo_active";

/** True when PostgREST row includes attendance columns (avoids showing 0 before migration applies). */
export function portalPublicDashboardRowHasAttendanceColumns(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return ATTENDANCE_RPC_COLUMN_KEYS.every((k) => Object.prototype.hasOwnProperty.call(o, k));
}

/** True when RPC includes majimbo_active (baada ya migration 20260629150000). */
export function portalPublicDashboardRowHasMajimboActiveColumn(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  return Object.prototype.hasOwnProperty.call(raw as Record<string, unknown>, MAJIMBO_ACTIVE_RPC_KEY);
}

function rowToCounts(row: Record<string, unknown> | null | undefined): PortalPublicDashboardCounts | null {
  if (!row || typeof row !== "object") return null;
  return {
    dayosisi: parseCount(row.dayosisi as number | string | null | undefined),
    majimbo: parseCount(row.majimbo as number | string | null | undefined),
    majimboActive: parseCount(row.majimbo_active as number | string | null | undefined),
    matawi: parseCount(row.matawi as number | string | null | undefined),
    matawiActive: parseCount(row.matawi_active as number | string | null | undefined),
    matawiPending: parseCount(row.matawi_pending as number | string | null | undefined),
    matawiRegistryVerified: parseCount(row.matawi_registry_verified as number | string | null | undefined),
    matawiRegistryPendingReview: parseCount(row.matawi_registry_pending_review as number | string | null | undefined),
    waumini: parseCount(row.waumini as number | string | null | undefined),
    viongozi: parseCount(row.viongozi as number | string | null | undefined),
    nyaraka: parseCount(row.nyaraka as number | string | null | undefined),
    matukio: parseCount(row.matukio as number | string | null | undefined),
    attendanceSessionsToday: parseCount(row.attendance_sessions_today as number | string | null | undefined),
    attendanceSessionsMonth: parseCount(row.attendance_sessions_month as number | string | null | undefined),
    attendanceVisitorsMonth: parseCount(row.attendance_visitors_month as number | string | null | undefined),
    projectsActive: Object.prototype.hasOwnProperty.call(row, "projects_active")
      ? parseCount(row.projects_active as number | string | null | undefined)
      : undefined,
    contributionUploadsPending: Object.prototype.hasOwnProperty.call(row, "contribution_uploads_pending")
      ? parseCount(row.contribution_uploads_pending as number | string | null | undefined)
      : undefined,
    approvalsPending: Object.prototype.hasOwnProperty.call(row, "approvals_pending")
      ? parseCount(row.approvals_pending as number | string | null | undefined)
      : undefined,
  };
}

export async function fetchPortalPublicDashboardCounts(): Promise<{
  counts: PortalPublicDashboardCounts | null;
  error: PostgrestError | null;
  /** Meaningful only when `error` is null: false if RPC response omits attendance totals (old `portal_public_dashboard_counts`). */
  attendanceColumnsFromRpc: boolean;
  majimboActiveColumnFromRpc: boolean;
}> {
  const c = getSupabase();
  if (!c) return { counts: null, error: null, attendanceColumnsFromRpc: false, majimboActiveColumnFromRpc: false };
  const { data, error } = await c.rpc("portal_public_dashboard_counts");
  if (error) return { counts: null, error, attendanceColumnsFromRpc: false, majimboActiveColumnFromRpc: false };
  const raw = Array.isArray(data) ? data[0] : data;
  const attendanceColumnsFromRpc = portalPublicDashboardRowHasAttendanceColumns(raw);
  const majimboActiveColumnFromRpc = portalPublicDashboardRowHasMajimboActiveColumn(raw);
  const counts = rowToCounts(raw as Record<string, unknown>);
  return { counts, error: null, attendanceColumnsFromRpc, majimboActiveColumnFromRpc };
}

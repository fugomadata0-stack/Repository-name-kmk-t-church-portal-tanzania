import { aggregateMembershipCategories, type MemberIntelRow } from "../lib/membershipIntelligence";
import { getSupabaseOrThrow, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import {
  fetchMembershipStatistics,
  type MembershipCategoryStats,
  type MembershipStatisticsResult,
  type Phase1Scope,
} from "./phase1FoundationService";

export type HierarchyBreakdownRow = {
  entity_id: string;
  entity_name: string;
  child_scope: Phase1Scope;
  total: number;
};

export type MembershipIntelligenceBundle = {
  stats: MembershipStatisticsResult;
  breakdown: HierarchyBreakdownRow[];
  source: "rpc" | "client";
};

export async function fetchMembershipHierarchyBreakdown(
  scope: Phase1Scope,
  entityId?: string | null
): Promise<HierarchyBreakdownRow[]> {
  const { data, error } = await getSupabaseOrThrow().rpc("portal_membership_hierarchy_breakdown", {
    p_scope: scope,
    p_entity_id: entityId ?? null,
  });
  if (error || !data) return [];
  if (typeof data === "object" && data !== null && "error" in (data as object)) return [];
  const arr = Array.isArray(data) ? data : [];
  return arr.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      entity_id: String(r.entity_id ?? ""),
      entity_name: String(r.entity_name ?? "—"),
      child_scope: String(r.child_scope ?? "tawi") as Phase1Scope,
      total: Number(r.total) || 0,
    };
  });
}

async function fetchMembersForScope(scope: Phase1Scope, entityId?: string | null): Promise<MemberIntelRow[]> {
  const c = getSupabaseOrThrow();
  let q = c.from("church_members").select("gender, birth_date, membership_status, is_baptized, ministry_segment, tawi_id, jimbo_id, dayosisi_id");

  if (scope === "tawi" && entityId) {
    q = q.eq("tawi_id", entityId);
  } else if (scope === "jimbo" && entityId) {
    const tawiRes = await c.from("church_tawi").select("id").eq("jimbo_id", entityId);
    const tawiIds = (tawiRes.data ?? []).map((t) => String((t as { id: string }).id));
    if (tawiIds.length > 0) {
      q = q.or(`jimbo_id.eq.${entityId},tawi_id.in.(${tawiIds.join(",")})`);
    } else {
      q = q.eq("jimbo_id", entityId);
    }
  } else if (scope === "dayosisi" && entityId) {
    q = q.eq("dayosisi_id", entityId);
  }

  const res = await q.limit(15000);
  return (res.data ?? []) as MemberIntelRow[];
}

export async function fetchMembershipIntelligenceBundle(
  scope: Phase1Scope = "kmkt",
  entityId?: string | null
): Promise<MembershipIntelligenceBundle> {
  const [stats, breakdown] = await Promise.all([
    fetchMembershipStatistics(scope, entityId),
    fetchMembershipHierarchyBreakdown(scope, entityId),
  ]);

  if (!stats.error && stats.categories.total > 0) {
    return { stats, breakdown, source: "rpc" };
  }

  try {
    const rows = await fetchMembersForScope(scope, entityId);
    const categories = aggregateMembershipCategories(rows);
    return {
      stats: {
        scope,
        entity_id: entityId ?? null,
        categories,
        generated_at: new Date().toISOString(),
      },
      breakdown,
      source: "client",
    };
  } catch {
    return { stats, breakdown, source: "rpc" };
  }
}

export function subscribeMembershipRealtime(onChange: () => void): () => void {
  if (!isSupabaseRealtimeEnabled()) return () => undefined;
  const c = getSupabaseOrThrow();
  const ch = c
    .channel("membership-intelligence-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "church_members" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "church_families" }, () => onChange())
    .subscribe();
  return () => {
    void c.removeChannel(ch);
  };
}

export function validateCategoryTotals(categories: MembershipCategoryStats): boolean {
  const sumGender = categories.wanaume + categories.wanawake;
  if (categories.total > 0 && sumGender > categories.total) return false;
  const sumBaptism = categories.waliobatizwa + categories.wasio_batizwa;
  if (categories.total > 0 && Math.abs(sumBaptism - categories.total) > 2) return false;
  return categories.total >= 0;
}

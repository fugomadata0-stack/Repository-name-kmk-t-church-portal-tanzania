import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import { unwrapList, unwrapOrThrow } from "../lib/supabaseResult";
import type { LeadershipCategoryRecord, LeadershipCommitteeRecord, LeadershipPositionRecord } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalUuid(v: string | null | undefined): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s && UUID_RE.test(s) ? s : null;
}

export async function fetchLeadershipCategories(): Promise<LeadershipCategoryRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  const res = await c.from("leadership_categories").select("*").eq("active", true).order("sort_order").order("name");
  const rows = unwrapList(res, "leadership_categories.list");
  return rows.map(mapCategoryRow);
}

export async function fetchLeadershipPositions(): Promise<LeadershipPositionRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  const res = await c
    .from("leadership_positions")
    .select("id,title,level_key,active,sort_order,code,description,category_id,created_at,updated_at")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  const rows = unwrapList(res, "leadership_positions.list");
  return rows.map(mapPositionRow);
}

export async function fetchCommitteeGroups(): Promise<LeadershipCommitteeRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  const res = await c.from("committee_groups").select("*").eq("active", true).order("sort_order").order("name");
  const rows = unwrapList(res, "committee_groups.list");
  return rows.map(mapCommitteeRow);
}

export async function insertLeadershipPosition(input: {
  title: string;
  level_key?: string | null;
  code?: string | null;
  description?: string | null;
  category_id?: string | null;
  sort_order?: number;
}): Promise<LeadershipPositionRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const payload = {
    title: input.title.trim(),
    level_key: input.level_key?.trim() || null,
    code: input.code?.trim() || null,
    description: input.description?.trim() || null,
    category_id: optionalUuid(input.category_id ?? null),
    sort_order: typeof input.sort_order === "number" ? input.sort_order : 0,
    active: true,
    updated_at: new Date().toISOString(),
  };
  if (!payload.title) throw new Error("Jina la nafasi linahitajika.");
  const res = await c.from("leadership_positions").insert(payload).select("*").single();
  const data = unwrapOrThrow(res, "leadership_positions.insert");
  return mapPositionRow(data as Record<string, unknown>);
}

export async function insertLeadershipCategory(input: { name: string; level_key?: string | null; description?: string | null }): Promise<LeadershipCategoryRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const payload = {
    name: input.name.trim(),
    level_key: input.level_key?.trim() || null,
    description: input.description?.trim() || null,
    active: true,
    updated_at: new Date().toISOString(),
  };
  if (!payload.name) throw new Error("Jina la kundi linahitajika.");
  const res = await c.from("leadership_categories").insert(payload).select("*").single();
  const data = unwrapOrThrow(res, "leadership_categories.insert");
  return mapCategoryRow(data as Record<string, unknown>);
}

export async function insertCommitteeGroup(input: {
  name: string;
  level_key?: string | null;
  description?: string | null;
  dayosisi_id?: string | null;
  jimbo_id?: string | null;
  tawi_id?: string | null;
}): Promise<LeadershipCommitteeRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const payload = {
    name: input.name.trim(),
    level_key: input.level_key?.trim() || null,
    description: input.description?.trim() || null,
    dayosisi_id: optionalUuid(input.dayosisi_id ?? null),
    jimbo_id: optionalUuid(input.jimbo_id ?? null),
    tawi_id: optionalUuid(input.tawi_id ?? null),
    active: true,
    updated_at: new Date().toISOString(),
  };
  if (!payload.name) throw new Error("Jina la kamati linahitajika.");
  const res = await c.from("committee_groups").insert(payload).select("*").single();
  const data = unwrapOrThrow(res, "committee_groups.insert");
  return mapCommitteeRow(data as Record<string, unknown>);
}

function mapPositionRow(row: Record<string, unknown>): LeadershipPositionRecord {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    level_key: row.level_key ? String(row.level_key) : null,
    active: Boolean(row.active ?? true),
    sort_order: Number(row.sort_order ?? 0),
    code: row.code ? String(row.code) : null,
    description: row.description ? String(row.description) : null,
    category_id: row.category_id ? String(row.category_id) : null,
    created_at: row.created_at ? String(row.created_at) : "",
    updated_at: row.updated_at ? String(row.updated_at) : "",
  };
}

function mapCategoryRow(row: Record<string, unknown>): LeadershipCategoryRecord {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    description: row.description ? String(row.description) : null,
    level_key: row.level_key ? String(row.level_key) : null,
    sort_order: Number(row.sort_order ?? 0),
    active: Boolean(row.active ?? true),
  };
}

function mapCommitteeRow(row: Record<string, unknown>): LeadershipCommitteeRecord {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    description: row.description ? String(row.description) : null,
    level_key: row.level_key ? String(row.level_key) : null,
    dayosisi_id: row.dayosisi_id ? String(row.dayosisi_id) : null,
    jimbo_id: row.jimbo_id ? String(row.jimbo_id) : null,
    tawi_id: row.tawi_id ? String(row.tawi_id) : null,
    structure_entity_id: row.structure_entity_id ? String(row.structure_entity_id) : null,
    sort_order: Number(row.sort_order ?? 0),
    active: Boolean(row.active ?? true),
  };
}

export type LeadershipRealtimeHandlers = {
  onPositions?: () => void;
  onCategories?: () => void;
  onCommittees?: () => void;
  onLeaders?: () => void;
  onLeadershipProfiles?: () => void;
  /** Hali ya usajili wa channel (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT, CLOSED, …). */
  onSubscribeStatus?: (status: string, err?: Error) => void;
};

export function subscribeLeadershipEnterprise(h: LeadershipRealtimeHandlers): RealtimeChannel | null {
  const c = getSupabase();
  if (!c || !isSupabaseRealtimeEnabled()) return null;
  const channel = c.channel("leadership-enterprise-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "leadership_positions" },
      () => h.onPositions?.()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "leadership_categories" },
      () => h.onCategories?.()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "committee_groups" },
      () => h.onCommittees?.()
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "church_viongozi" }, () => h.onLeaders?.())
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "leadership_profiles" },
      () => h.onLeadershipProfiles?.()
    )
    .subscribe((status, err) => {
      h.onSubscribeStatus?.(status, err);
      if (status === "CHANNEL_ERROR") {
        console.warn("[leadershipEnterprise] realtime channel error", err?.message ?? "");
      }
    });
  return channel;
}

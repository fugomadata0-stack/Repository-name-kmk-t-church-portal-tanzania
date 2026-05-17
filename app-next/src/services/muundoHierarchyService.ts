import {
  mirrorDeleteJimboCascade,
  mirrorDeleteStructureById,
  mirrorLegacyJimboToStructure,
  mirrorLegacyTawiToStructure,
} from "../lib/legacyStructureMirror";
import { getCachedSession } from "../lib/authSessionCache";
import { dedupeInFlight } from "../lib/inFlightDedupe";
import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList, unwrapOrThrow } from "../lib/supabaseResult";
import { logAuditAction } from "./auditLogService";
import type { DayosisiRecord, JimboRecord, Status, TawiRecord } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedUuid(id: string): boolean {
  return UUID_RE.test(id);
}

function uiStatus(raw: string | null | undefined): Status {
  const s = String(raw ?? "active").toLowerCase().replace(/\s+/g, "_");
  if (s === "pending") return "Pending";
  if (s === "inactive") return "Inactive";
  if (s === "suspended") return "Suspended";
  if (s === "archived") return "Archived";
  if (s === "needs_review") return "Needs Review";
  return "Active";
}

function dbStatus(ui: Status): string {
  const x = String(ui).trim().toLowerCase().replace(/\s+/g, "_");
  if (x === "active") return "active";
  if (x === "pending") return "pending";
  if (x === "inactive") return "inactive";
  if (x === "suspended") return "suspended";
  if (x === "archived") return "archived";
  if (x === "needs_review") return "needs_review";
  return "active";
}

function optNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeTawiVerification(raw: string | null | undefined): string {
  const t = String(raw ?? "unverified").trim().toLowerCase();
  if (t === "pending_review" || t === "verified" || t === "unverified") return t;
  return "unverified";
}

export function resolveDayosisiId(label: string, dayosisiList: DayosisiRecord[]): string | null {
  const raw = label.trim();
  if (isPersistedUuid(raw)) return raw;
  const t = raw.toLowerCase();
  const byJina = dayosisiList.find((d) => d.jina.trim().toLowerCase() === t);
  if (byJina && isPersistedUuid(byJina.id)) return byJina.id;
  const byCode = dayosisiList.find((d) => d.code.trim().toLowerCase() === t);
  return byCode && isPersistedUuid(byCode.id) ? byCode.id : null;
}

export function resolveJimboId(label: string, majimbo: JimboRecord[]): string | null {
  const raw = label.trim();
  if (isPersistedUuid(raw)) return raw;
  const t = raw.toLowerCase();
  const j = majimbo.find((x) => x.jina.trim().toLowerCase() === t);
  return j && isPersistedUuid(j.id) ? j.id : null;
}

export function resolveTawiId(label: string, matawi: TawiRecord[]): string | null {
  const raw = label.trim();
  if (isPersistedUuid(raw)) return raw;
  const t = raw.toLowerCase();
  const tw = matawi.find((x) => x.jina.trim().toLowerCase() === t);
  return tw && isPersistedUuid(tw.id) ? tw.id : null;
}

export function mapJimboRow(row: Record<string, unknown>): JimboRecord {
  const embed = row.dayosisi as { jina?: string } | null | undefined;
  const dayosisiLabel =
    embed && typeof embed === "object" && embed.jina != null ? String(embed.jina) : "";
  return {
    id: String(row.id),
    jina: String(row.jina ?? ""),
    dayosisi: dayosisiLabel,
    dayosisi_id: row.dayosisi_id ? String(row.dayosisi_id) : undefined,
    mkuu: String(row.mkuu ?? ""),
    mkoa: String(row.mkoa ?? ""),
    simu: String(row.simu ?? ""),
    status: uiStatus(row.status as string),
  };
}

export function mapTawiRow(row: Record<string, unknown>): TawiRecord {
  const jb = row.church_jimbo as { jina?: string; dayosisi?: { jina?: string } } | null | undefined;
  let jimboName = "";
  let dayosisiName = "";
  if (jb && typeof jb === "object") {
    jimboName = jb.jina != null ? String(jb.jina) : "";
    const ds = jb.dayosisi;
    if (ds && typeof ds === "object" && ds.jina != null) dayosisiName = String(ds.jina);
  }
  return {
    id: String(row.id),
    jina: String(row.jina ?? ""),
    aina: String(row.aina ?? "Tawi"),
    dayosisi: dayosisiName,
    jimbo: jimboName,
    jimbo_id: row.jimbo_id ? String(row.jimbo_id) : undefined,
    branch_code: row.branch_code != null ? String(row.branch_code) : null,
    mkoa: row.mkoa != null ? String(row.mkoa) : null,
    wilaya: row.wilaya != null ? String(row.wilaya) : null,
    kata: row.kata != null ? String(row.kata) : null,
    mtaa: row.mtaa != null ? String(row.mtaa) : null,
    gps_lat: optNum(row.gps_lat),
    gps_lng: optNum(row.gps_lng),
    founded_date: row.founded_date != null ? String(row.founded_date).slice(0, 10) : null,
    verification_status: row.verification_status != null ? String(row.verification_status) : "unverified",
    verified_at: row.verified_at != null ? String(row.verified_at) : null,
    verified_by: row.verified_by != null ? String(row.verified_by) : null,
    kiongozi: String(row.kiongozi ?? ""),
    simu: String(row.simu ?? ""),
    status: uiStatus(row.status as string),
  };
}

export async function fetchChurchJimbo(): Promise<JimboRecord[]> {
  return dedupeInFlight("church_jimbo.list", async () => {
    const c = getSupabase();
    if (!c) return [];
    const res = await c
      .from("church_jimbo")
      .select("*, dayosisi ( jina )")
      .order("jina", { ascending: true });
    const rows = unwrapList(res, "church_jimbo.list");
    return rows.map((r) => mapJimboRow(r as unknown as Record<string, unknown>));
  });
}

export async function fetchChurchTawi(): Promise<TawiRecord[]> {
  return dedupeInFlight("church_tawi.list", async () => {
    const c = getSupabase();
    if (!c) return [];
    const res = await c
      .from("church_tawi")
      .select("*, church_jimbo ( jina, dayosisi ( jina ) )")
      .order("jina", { ascending: true });
    const rows = unwrapList(res, "church_tawi.list");
    return rows.map((r) => mapTawiRow(r as unknown as Record<string, unknown>));
  });
}

export async function upsertChurchJimbo(
  row: Partial<JimboRecord> & { jina: string },
  dayosisiList: DayosisiRecord[]
): Promise<JimboRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const dayosisiId =
    row.dayosisi_id && isPersistedUuid(String(row.dayosisi_id))
      ? String(row.dayosisi_id)
      : resolveDayosisiId(String(row.dayosisi ?? ""), dayosisiList);
  if (!dayosisiId) throw new Error("Andika jina la dayosisi lililo kwenye orodha (au code), au UUID sahihi.");

  const payload = {
    dayosisi_id: dayosisiId,
    jina: row.jina.trim(),
    mkuu: row.mkuu?.trim() || null,
    mkoa: row.mkoa?.trim() || null,
    simu: row.simu?.trim() || null,
    status: dbStatus(row.status ?? "Active"),
    updated_at: new Date().toISOString(),
  };

  if (row.id && isPersistedUuid(row.id)) {
    const res = await c.from("church_jimbo").update(payload).eq("id", row.id).select("*, dayosisi ( jina )").single();
    const data = unwrapOrThrow(res, "church_jimbo.update");
    const mapped = mapJimboRow(data as unknown as Record<string, unknown>);
    void mirrorLegacyJimboToStructure(mapped);
    return mapped;
  }

  const res = await c.from("church_jimbo").insert(payload).select("*, dayosisi ( jina )").single();
  const data = unwrapOrThrow(res, "church_jimbo.insert");
  const mapped = mapJimboRow(data as unknown as Record<string, unknown>);
  void mirrorLegacyJimboToStructure(mapped);
  return mapped;
}

export async function deleteChurchJimbo(id: string): Promise<void> {
  const c = getSupabase();
  if (!c || !isPersistedUuid(id)) return;
  await mirrorDeleteJimboCascade(id);
  const { error } = await c.from("church_jimbo").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "church_jimbo.delete"));
}

export async function upsertChurchTawi(
  row: Partial<TawiRecord> & { jina: string },
  dayosisiList: DayosisiRecord[],
  majimbo: JimboRecord[]
): Promise<TawiRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");

  let jimboId =
    row.jimbo_id && isPersistedUuid(String(row.jimbo_id)) ? String(row.jimbo_id) : resolveJimboId(String(row.jimbo ?? ""), majimbo);
  if (!jimboId) {
    const dId = resolveDayosisiId(String(row.dayosisi ?? ""), dayosisiList);
    if (dId) {
      const matchName = (row.jimbo ?? "").trim().toLowerCase();
      const fallback = majimbo.find(
        (m) => m.jina.trim().toLowerCase() === matchName && m.dayosisi.trim().toLowerCase() === String(row.dayosisi).trim().toLowerCase()
      );
      if (fallback && isPersistedUuid(fallback.id)) jimboId = fallback.id;
    }
  }
  if (!jimboId) throw new Error("Andika jina la jimbo lililo kwenye orodha (sambamba na dayosisi).");

  const ver = normalizeTawiVerification(row.verification_status as string);
  const basePayload = {
    jimbo_id: jimboId,
    jina: row.jina.trim(),
    aina: (row.aina?.trim() || "Tawi").trim(),
    branch_code: row.branch_code?.trim() || null,
    mkoa: row.mkoa?.trim() || null,
    wilaya: row.wilaya?.trim() || null,
    kata: row.kata?.trim() || null,
    mtaa: row.mtaa?.trim() || null,
    gps_lat: optNum(row.gps_lat as unknown),
    gps_lng: optNum(row.gps_lng as unknown),
    founded_date: row.founded_date?.trim() ? row.founded_date.trim().slice(0, 10) : null,
    verification_status: ver,
    kiongozi: row.kiongozi?.trim() || null,
    simu: row.simu?.trim() || null,
    status: dbStatus(row.status ?? "Active"),
    updated_at: new Date().toISOString(),
  };
  const payload =
    ver !== "verified" ? { ...basePayload, verified_at: null as string | null, verified_by: null as string | null } : basePayload;

  if (row.id && isPersistedUuid(row.id)) {
    const res = await c
      .from("church_tawi")
      .update(payload)
      .eq("id", row.id)
      .select("*, church_jimbo ( jina, dayosisi ( jina ) )")
      .single();
    const data = unwrapOrThrow(res, "church_tawi.update");
    const mapped = mapTawiRow(data as unknown as Record<string, unknown>);
    void mirrorLegacyTawiToStructure(mapped);
    return mapped;
  }

  const res = await c.from("church_tawi").insert(payload).select("*, church_jimbo ( jina, dayosisi ( jina ) )").single();
  const data = unwrapOrThrow(res, "church_tawi.insert");
  const mapped = mapTawiRow(data as unknown as Record<string, unknown>);
  void mirrorLegacyTawiToStructure(mapped);
  return mapped;
}

export async function deleteChurchTawi(id: string): Promise<void> {
  const c = getSupabase();
  if (!c || !isPersistedUuid(id)) return;
  await mirrorDeleteStructureById(id);
  const { error } = await c.from("church_tawi").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "church_tawi.delete"));
}

export type ChurchTawiVerificationUi = "unverified" | "pending_review" | "verified";

/** Sasisha hali ya sajili ya tawi; `verified` huweka verified_at / verified_by (mtumiaji aliyeingia). */
export async function patchChurchTawiVerificationStatus(tawiId: string, next: ChurchTawiVerificationUi): Promise<TawiRecord> {
  const c = getSupabase();
  if (!c || !isPersistedUuid(tawiId)) throw new Error("Kitambulisho cha tawi si halali.");
  const normalized = normalizeTawiVerification(next);
  const authUser = getCachedSession()?.user;
  const performerId = authUser?.id ?? null;
  const performerName =
    (typeof authUser?.email === "string" && authUser.email.trim()) ||
    (typeof authUser?.user_metadata?.full_name === "string" &&
      String(authUser.user_metadata.full_name).trim()) ||
    null;

  const patch: Record<string, unknown> = {
    verification_status: normalized,
    updated_at: new Date().toISOString(),
  };
  if (normalized === "verified") {
    if (!performerId) throw new Error("Ingia ili kuthibitisha sajili ya tawi.");
    patch.verified_at = new Date().toISOString();
    patch.verified_by = performerId;
  } else {
    patch.verified_at = null;
    patch.verified_by = null;
  }
  const res = await c.from("church_tawi").update(patch).eq("id", tawiId).select("*, church_jimbo ( jina, dayosisi ( jina ) )").single();
  const data = unwrapOrThrow(res, "church_tawi.patch_verification");
  const mapped = mapTawiRow(data as unknown as Record<string, unknown>);
  void mirrorLegacyTawiToStructure(mapped);
  void logAuditAction({
    module: "muundo",
    action: "tawi_registry_verification",
    entity_type: "church_tawi",
    entity_id: tawiId,
    entity_name: mapped.jina,
    performed_by_user_id: performerId,
    performed_by_name: performerName,
    new_values: {
      verification_status: normalized,
      verified_at: mapped.verified_at ?? null,
      verified_by: mapped.verified_by ?? null,
    },
    message: `Uhakiki wa sajili ya tawi: ${normalized}`,
  });
  if (typeof window !== "undefined") {
    void (async () => {
      try {
        const { createNotification } = await import("./notificationsService");
        const qs = new URLSearchParams({ module: "muundo", submodule: "Orodha ya Matawi / Vituo" });
        await createNotification({
          module: "muundo",
          title: "Uhakiki wa sajili ya tawi",
          message: `${mapped.jina}: hali ${normalized}.`,
          type: "structure",
          priority: normalized === "verified" ? "success" : "info",
          is_global: true,
          action_url: `/portal?${qs.toString()}`,
        });
      } catch {
        /* RLS au mipangilio — arifa ni hiari */
      }
    })();
  }
  return mapped;
}

import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList, unwrapOrThrow } from "../lib/supabaseResult";
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
  if (s === "archived") return "Archived";
  if (s === "needs_review") return "Needs Review";
  return "Active";
}

function dbStatus(ui: Status): string {
  const x = String(ui).trim().toLowerCase().replace(/\s+/g, "_");
  if (x === "active") return "active";
  if (x === "pending") return "pending";
  if (x === "inactive") return "inactive";
  if (x === "archived") return "archived";
  if (x === "needs_review") return "needs_review";
  return "active";
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
    kiongozi: String(row.kiongozi ?? ""),
    simu: String(row.simu ?? ""),
    status: uiStatus(row.status as string),
  };
}

export async function fetchChurchJimbo(): Promise<JimboRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  const res = await c
    .from("church_jimbo")
    .select("*, dayosisi ( jina )")
    .order("jina", { ascending: true });
  const rows = unwrapList(res, "church_jimbo.list");
  return rows.map((r) => mapJimboRow(r as unknown as Record<string, unknown>));
}

export async function fetchChurchTawi(): Promise<TawiRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  const res = await c
    .from("church_tawi")
    .select("*, church_jimbo ( jina, dayosisi ( jina ) )")
    .order("jina", { ascending: true });
  const rows = unwrapList(res, "church_tawi.list");
  return rows.map((r) => mapTawiRow(r as unknown as Record<string, unknown>));
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
    return mapJimboRow(data as unknown as Record<string, unknown>);
  }

  const res = await c.from("church_jimbo").insert(payload).select("*, dayosisi ( jina )").single();
  const data = unwrapOrThrow(res, "church_jimbo.insert");
  return mapJimboRow(data as unknown as Record<string, unknown>);
}

export async function deleteChurchJimbo(id: string): Promise<void> {
  const c = getSupabase();
  if (!c || !isPersistedUuid(id)) return;
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

  const payload = {
    jimbo_id: jimboId,
    jina: row.jina.trim(),
    aina: (row.aina?.trim() || "Tawi").trim(),
    kiongozi: row.kiongozi?.trim() || null,
    simu: row.simu?.trim() || null,
    status: dbStatus(row.status ?? "Active"),
    updated_at: new Date().toISOString(),
  };

  if (row.id && isPersistedUuid(row.id)) {
    const res = await c
      .from("church_tawi")
      .update(payload)
      .eq("id", row.id)
      .select("*, church_jimbo ( jina, dayosisi ( jina ) )")
      .single();
    const data = unwrapOrThrow(res, "church_tawi.update");
    return mapTawiRow(data as unknown as Record<string, unknown>);
  }

  const res = await c.from("church_tawi").insert(payload).select("*, church_jimbo ( jina, dayosisi ( jina ) )").single();
  const data = unwrapOrThrow(res, "church_tawi.insert");
  return mapTawiRow(data as unknown as Record<string, unknown>);
}

export async function deleteChurchTawi(id: string): Promise<void> {
  const c = getSupabase();
  if (!c || !isPersistedUuid(id)) return;
  const { error } = await c.from("church_tawi").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "church_tawi.delete"));
}

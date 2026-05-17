import { getSupabaseOrThrow } from "./supabaseClient";
import type { IncomeManagementRecord } from "../types";

export type ResolvedIncomeGeo = {
  tawi_id: string | null;
  jimbo_id: string | null;
  dayosisi_id: string | null;
  origin_level: "tawi" | "jimbo" | "dayosisi" | "kmkt";
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: string | null | undefined): v is string {
  return Boolean(v && UUID_RE.test(v));
}

/**
 * Kamilisha mnyororo wa geo kutoka tawi → jimbo → dayosisi kwa usahihi wa remittance.
 */
export async function resolveIncomeLineGeo(
  line: Partial<IncomeManagementRecord>
): Promise<ResolvedIncomeGeo> {
  const c = getSupabaseOrThrow();
  const tawiId = isUuid(line.tawi_id) ? line.tawi_id : null;
  let jimboId = isUuid(line.jimbo_id) ? line.jimbo_id : null;
  let dayosisiId = isUuid(line.dayosisi_id) ? line.dayosisi_id : null;

  if (tawiId) {
    const { data: tawi } = await c.from("church_tawi").select("id, jimbo_id").eq("id", tawiId).maybeSingle();
    if (tawi?.jimbo_id) jimboId = String(tawi.jimbo_id);
  }

  if (jimboId && !dayosisiId) {
    const { data: jimbo } = await c.from("church_jimbo").select("id, dayosisi_id").eq("id", jimboId).maybeSingle();
    if (jimbo?.dayosisi_id) dayosisiId = String(jimbo.dayosisi_id);
  }

  if (!tawiId && !jimboId && !dayosisiId) {
    const level = String(line.churchLevel ?? "").toLowerCase();
    if (level.includes("tawi") || level.includes("branch")) {
      /* churchLevel text only — cannot resolve without names */
    } else if (level.includes("jimbo")) {
      jimboId = null;
    }
  }

  let origin_level: ResolvedIncomeGeo["origin_level"] = "kmkt";
  if (tawiId) origin_level = "tawi";
  else if (jimboId) origin_level = "jimbo";
  else if (dayosisiId) origin_level = "dayosisi";

  return { tawi_id: tawiId, jimbo_id: jimboId, dayosisi_id: dayosisiId, origin_level };
}

export async function enrichIncomeLineGeo(
  line: Partial<IncomeManagementRecord>
): Promise<Partial<IncomeManagementRecord>> {
  const geo = await resolveIncomeLineGeo(line);
  return {
    ...line,
    tawi_id: geo.tawi_id ?? line.tawi_id,
    jimbo_id: geo.jimbo_id ?? line.jimbo_id,
    dayosisi_id: geo.dayosisi_id ?? line.dayosisi_id,
    churchLevel:
      line.churchLevel ||
      (geo.origin_level === "tawi"
        ? "Tawi"
        : geo.origin_level === "jimbo"
          ? "Jimbo"
          : geo.origin_level === "dayosisi"
            ? "Dayosisi"
            : "KMK(T)"),
  };
}

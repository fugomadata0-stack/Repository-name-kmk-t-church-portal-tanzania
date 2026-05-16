import { getSupabase } from "../lib/supabaseClient";
import { formatPostgrestError } from "../lib/supabaseErrors";

export type NgaziLevelKind = "tawi" | "jimbo" | "dayosisi" | "kitaifa";

export interface NgaziOperationsLevelRow {
  ngazi: NgaziLevelKind;
  entity_id: string | null;
  label: string;
  jimbo_id?: string | null;
  jimbo_label?: string | null;
  dayosisi_id?: string | null;
  dayosisi_label?: string | null;
  finance_mapato: number;
  finance_matumizi: number;
  finance_saldo: number;
  income_lines_total: number;
  attendance_sessions: number;
  attendance_total: number;
  members_count: number;
  families_count: number;
}

export interface NgaziOperationsSummaryPayload {
  from: string;
  to: string;
  levels: NgaziOperationsLevelRow[];
  rollup: {
    finance_mapato: number;
    finance_matumizi: number;
    finance_saldo: number;
    income_lines_total: number;
    attendance_sessions: number;
    attendance_total: number;
    members_count?: number;
    families_count?: number;
  };
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapLevel(raw: Record<string, unknown>): NgaziOperationsLevelRow {
  const mapato = num(raw.finance_mapato);
  const matumizi = num(raw.finance_matumizi);
  return {
    ngazi: String(raw.ngazi ?? "tawi") as NgaziLevelKind,
    entity_id: raw.entity_id != null ? String(raw.entity_id) : null,
    label: String(raw.label ?? ""),
    jimbo_id: raw.jimbo_id != null ? String(raw.jimbo_id) : null,
    jimbo_label: raw.jimbo_label != null ? String(raw.jimbo_label) : null,
    dayosisi_id: raw.dayosisi_id != null ? String(raw.dayosisi_id) : null,
    dayosisi_label: raw.dayosisi_label != null ? String(raw.dayosisi_label) : null,
    finance_mapato: mapato,
    finance_matumizi: matumizi,
    finance_saldo: mapato - matumizi,
    income_lines_total: num(raw.income_lines_total),
    attendance_sessions: Math.round(num(raw.attendance_sessions)),
    attendance_total: Math.round(num(raw.attendance_total)),
    members_count: Math.round(num(raw.members_count)),
    families_count: Math.round(num(raw.families_count)),
  };
}

export async function fetchNgaziOperationsSummary(opts?: {
  dayosisiId?: string;
  jimboId?: string;
  tawiId?: string;
  from?: string;
  to?: string;
}): Promise<NgaziOperationsSummaryPayload | null> {
  const c = getSupabase();
  if (!c) return null;

  const { data, error } = await c.rpc("portal_ngazi_operations_summary", {
    p_dayosisi_id: opts?.dayosisiId?.trim() || null,
    p_jimbo_id: opts?.jimboId?.trim() || null,
    p_tawi_id: opts?.tawiId?.trim() || null,
    p_from: opts?.from?.trim().slice(0, 10) || null,
    p_to: opts?.to?.trim().slice(0, 10) || null,
  });

  if (error) throw new Error(formatPostgrestError(error, "portal_ngazi_operations_summary"));
  if (!data || typeof data !== "object") return null;

  const root = data as Record<string, unknown>;
  const levelsRaw = Array.isArray(root.levels) ? root.levels : [];
  const rollupRaw = (root.rollup && typeof root.rollup === "object" ? root.rollup : {}) as Record<string, unknown>;

  const rollup = {
    finance_mapato: num(rollupRaw.finance_mapato),
    finance_matumizi: num(rollupRaw.finance_matumizi),
    finance_saldo: num(rollupRaw.finance_saldo),
    income_lines_total: num(rollupRaw.income_lines_total),
    attendance_sessions: Math.round(num(rollupRaw.attendance_sessions)),
    attendance_total: Math.round(num(rollupRaw.attendance_total)),
    members_count: rollupRaw.members_count != null ? Math.round(num(rollupRaw.members_count)) : undefined,
    families_count: rollupRaw.families_count != null ? Math.round(num(rollupRaw.families_count)) : undefined,
  };

  if (rollup.finance_saldo === 0 && rollup.finance_mapato !== rollup.finance_matumizi) {
    rollup.finance_saldo = rollup.finance_mapato - rollup.finance_matumizi;
  }

  return {
    from: String(root.from ?? "").slice(0, 10),
    to: String(root.to ?? "").slice(0, 10),
    levels: levelsRaw.map((row) => mapLevel(row as Record<string, unknown>)),
    rollup,
  };
}

import { getSupabase } from "../lib/supabaseClient";

export type MahudhurioPeriodTotals = {
  leo: number;
  wiki: number;
  mwezi: number;
  mwaka: number;
  wageniMwezi: number;
};

const TZ = "Africa/Dar_es_Salaam";

function ymdInTz(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

function parseYmd(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function startOfWeekYmd(todayYmd: string): string {
  const d = parseYmd(todayYmd);
  const dow = d.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonthYmd(todayYmd: string): string {
  return `${todayYmd.slice(0, 7)}-01`;
}

function startOfYearYmd(todayYmd: string): string {
  return `${todayYmd.slice(0, 4)}-01-01`;
}

/** Jumla ya mahudhurio (si vikao) — leo, wiki, mwezi, mwaka kutoka attendance_sessions. */
export async function fetchMahudhurioPeriodTotals(opts?: {
  tawiId?: string | null;
  jimboId?: string | null;
  dayosisiId?: string | null;
}): Promise<MahudhurioPeriodTotals> {
  const empty: MahudhurioPeriodTotals = { leo: 0, wiki: 0, mwezi: 0, mwaka: 0, wageniMwezi: 0 };
  const c = getSupabase();
  if (!c) return empty;

  const today = ymdInTz();
  const weekFrom = startOfWeekYmd(today);
  const monthFrom = startOfMonthYmd(today);
  const yearFrom = startOfYearYmd(today);

  let q = c
    .from("attendance_sessions")
    .select("attendance_date,total_attendance,visitors")
    .gte("attendance_date", yearFrom)
    .lte("attendance_date", today);

  const tawiId = opts?.tawiId?.trim();
  const jimboId = opts?.jimboId?.trim();
  const dayosisiId = opts?.dayosisiId?.trim();
  if (tawiId) q = q.eq("tawi_id", tawiId);
  else if (jimboId) q = q.eq("jimbo_id", jimboId);
  else if (dayosisiId) q = q.eq("dayosisi_id", dayosisiId);

  const { data, error } = await q;
  if (error || !data?.length) return empty;

  const out = { ...empty };
  for (const raw of data) {
    const date = String((raw as { attendance_date?: string }).attendance_date ?? "").slice(0, 10);
    if (!date) continue;
    const head = Number((raw as { total_attendance?: number }).total_attendance ?? 0) || 0;
    const visitors = Number((raw as { visitors?: number }).visitors ?? 0) || 0;
    out.mwaka += head;
    if (date >= monthFrom) {
      out.mwezi += head;
      out.wageniMwezi += visitors;
    }
    if (date >= weekFrom) out.wiki += head;
    if (date === today) out.leo += head;
  }
  return out;
}

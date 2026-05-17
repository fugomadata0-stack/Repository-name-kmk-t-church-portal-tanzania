/**
 * Injini ya Ngazi Kuu — chanzo kimoja cha KPI kwa tawi, jimbo, dayosisi na kitaifa.
 */
import { dedupeInFlight } from "../lib/inFlightDedupe";
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../types";
import { fetchPortalPublicDashboardCountsCached } from "../lib/portalPublicDashboardCache";
import { fetchNgaziOperationsSummary, type NgaziOperationsSummaryPayload } from "./ngaziOperationsService";
import { fetchTawiBranchDashboardPayload, type TawiBranchDashboardPayload } from "./tawiBranchDashboardService";

export type MasterBranchScope = "kitaifa" | "dayosisi" | "jimbo" | "tawi";

export type MasterBranchEngineCounts = {
  dayosisi: number;
  majimbo: number;
  matawi: number;
  matawiActive: number;
  waumini: number;
  families: number;
  viongozi: number;
  attendanceSessionsMonth: number;
  attendanceHeadcountMonth: number;
  financeMapatoMwezi: number;
  financeMatumiziMwezi: number;
  financeSaldoMwezi: number;
  incomeLinesMwezi: number;
  pendingApprovals: number;
};

export type MasterBranchEngineSnapshot = {
  scope: MasterBranchScope;
  entityId: string | null;
  label: string;
  sublabel: string | null;
  counts: MasterBranchEngineCounts;
  ngazi: NgaziOperationsSummaryPayload | null;
  tawiDetail: TawiBranchDashboardPayload | null;
  loadedAt: string;
};

function activeStatus(s: string | null | undefined): boolean {
  const x = String(s ?? "").toLowerCase();
  return x !== "inactive" && x !== "archived" && x !== "suspended";
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function emptyCounts(): MasterBranchEngineCounts {
  return {
    dayosisi: 0,
    majimbo: 0,
    matawi: 0,
    matawiActive: 0,
    waumini: 0,
    families: 0,
    viongozi: 0,
    attendanceSessionsMonth: 0,
    attendanceHeadcountMonth: 0,
    financeMapatoMwezi: 0,
    financeMatumiziMwezi: 0,
    financeSaldoMwezi: 0,
    incomeLinesMwezi: 0,
    pendingApprovals: 0,
  };
}

function countsFromNgazi(rollup: NgaziOperationsSummaryPayload["rollup"], base: MasterBranchEngineCounts): MasterBranchEngineCounts {
  return {
    ...base,
    waumini: rollup.members_count ?? base.waumini,
    families: rollup.families_count ?? base.families,
    attendanceSessionsMonth: rollup.attendance_sessions,
    attendanceHeadcountMonth: rollup.attendance_total,
    financeMapatoMwezi: rollup.finance_mapato,
    financeMatumiziMwezi: rollup.finance_matumizi,
    financeSaldoMwezi: rollup.finance_saldo,
    incomeLinesMwezi: rollup.income_lines_total,
  };
}

function structureCounts(
  dayosisi: DayosisiRecord[],
  majimbo: JimboRecord[],
  matawi: TawiRecord[],
  scope: MasterBranchScope,
  entityId: string | null
): Pick<MasterBranchEngineCounts, "dayosisi" | "majimbo" | "matawi" | "matawiActive"> {
  let ds = dayosisi;
  let jb = majimbo;
  let tw = matawi;

  if (scope === "dayosisi" && entityId) {
    jb = jb.filter((j) => j.dayosisi_id === entityId);
    const jbIds = new Set(jb.map((j) => j.id));
    tw = tw.filter((t) => jbIds.has(String(t.jimbo_id ?? "")));
    ds = ds.filter((d) => d.id === entityId);
  } else if (scope === "jimbo" && entityId) {
    jb = jb.filter((j) => j.id === entityId);
    tw = tw.filter((t) => String(t.jimbo_id ?? "") === entityId);
    const dId = jb[0]?.dayosisi_id;
    if (dId) ds = ds.filter((d) => d.id === dId);
  } else if (scope === "tawi" && entityId) {
    tw = tw.filter((t) => t.id === entityId);
    const jId = tw[0]?.jimbo_id;
    if (jId) {
      jb = jb.filter((j) => j.id === jId);
      const dId = jb[0]?.dayosisi_id;
      if (dId) ds = ds.filter((d) => d.id === dId);
    }
  }

  return {
    dayosisi: ds.length,
    majimbo: jb.length,
    matawi: tw.length,
    matawiActive: tw.filter((t) => activeStatus(t.status)).length,
  };
}

export async function fetchMasterBranchEngineSnapshot(opts: {
  scope: MasterBranchScope;
  entityId: string | null;
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
}): Promise<MasterBranchEngineSnapshot> {
  const key = `master-branch-engine:${opts.scope}:${opts.entityId ?? "kitaifa"}`;
  return dedupeInFlight(key, () => fetchMasterBranchEngineSnapshotInner(opts));
}

async function fetchMasterBranchEngineSnapshotInner(opts: {
  scope: MasterBranchScope;
  entityId: string | null;
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
}): Promise<MasterBranchEngineSnapshot> {
  const { scope, entityId, dayosisi, majimbo, matawi } = opts;
  const struct = structureCounts(dayosisi, majimbo, matawi, scope, entityId);
  let counts = { ...emptyCounts(), ...struct };
  let label = "KMK(T) — Kitaifa";
  let sublabel: string | null = "Kanisa la Mennonite la Kiinjili Tanzania";
  let ngazi: NgaziOperationsSummaryPayload | null = null;
  let tawiDetail: TawiBranchDashboardPayload | null = null;

  const range = monthRange();
  const ngaziOpts =
    scope === "tawi" && entityId
      ? { tawiId: entityId, ...range }
      : scope === "jimbo" && entityId
        ? { jimboId: entityId, ...range }
        : scope === "dayosisi" && entityId
          ? { dayosisiId: entityId, ...range }
          : { ...range };

  try {
    ngazi = await fetchNgaziOperationsSummary(ngaziOpts);
    if (ngazi) counts = countsFromNgazi(ngazi.rollup, counts);
  } catch {
    ngazi = null;
  }

  if (scope === "kitaifa") {
    const { counts: pub } = await fetchPortalPublicDashboardCountsCached();
    if (pub) {
      counts = {
        ...counts,
        dayosisi: pub.dayosisi,
        majimbo: pub.majimbo,
        matawi: pub.matawi,
        matawiActive: pub.matawiActive,
        waumini: pub.waumini,
        viongozi: pub.viongozi,
        attendanceSessionsMonth: pub.attendanceSessionsMonth,
      };
    }
  }

  if (scope === "dayosisi" && entityId) {
    const row = dayosisi.find((d) => d.id === entityId);
    label = row?.jina ?? "Dayosisi";
    sublabel = row?.code ? `Msimbo: ${row.code}` : null;
  } else if (scope === "jimbo" && entityId) {
    const row = majimbo.find((j) => j.id === entityId);
    label = row?.jina ?? "Jimbo";
    const ds = dayosisi.find((d) => d.id === row?.dayosisi_id);
    sublabel = ds?.jina ? `Dayosisi: ${ds.jina}` : null;
  } else if (scope === "tawi" && entityId) {
    const row = matawi.find((t) => t.id === entityId);
    label = row?.jina ?? "Tawi / Kituo";
    const jb = majimbo.find((j) => j.id === row?.jimbo_id);
    sublabel = jb?.jina ? `Jimbo: ${jb.jina}` : null;
    try {
      tawiDetail = await fetchTawiBranchDashboardPayload(entityId);
      if (tawiDetail) {
        counts = {
          ...counts,
          waumini: tawiDetail.members.total,
          families: counts.families,
          viongozi: tawiDetail.leadership.total,
          attendanceSessionsMonth: tawiDetail.attendanceSessionsMonth,
          attendanceHeadcountMonth: tawiDetail.attendanceHeadcountMonth,
          financeMapatoMwezi: tawiDetail.finance.mapatoMwezi,
          financeMatumiziMwezi: tawiDetail.finance.matumiziMwezi,
          financeSaldoMwezi: tawiDetail.finance.saldoMwezi,
          pendingApprovals: tawiDetail.finance.pendingApprovals,
        };
      }
    } catch {
      tawiDetail = null;
    }
  }

  return {
    scope,
    entityId,
    label,
    sublabel,
    counts,
    ngazi,
    tawiDetail,
    loadedAt: new Date().toISOString(),
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Banknote, CalendarRange, Loader2, TrendingUp, Users } from "lucide-react";
import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";
import {
  fetchNgaziOperationsSummary,
  type NgaziLevelKind,
  type NgaziOperationsLevelRow,
  type NgaziOperationsSummaryPayload,
} from "../../services/ngaziOperationsService";

function tzs(n: number) {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(n) + " TZS";
}

function monthRange(): { from: string; to: string } {
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const NGAZI_LABEL: Record<NgaziLevelKind, string> = {
  tawi: "Tawi / Kituo",
  jimbo: "Jimbo",
  dayosisi: "Dayosisi",
  kitaifa: "Kitaifa — Makao Makuu",
};

const NGAZI_ORDER: NgaziLevelKind[] = ["tawi", "jimbo", "dayosisi", "kitaifa"];

function sortLevels(levels: NgaziOperationsLevelRow[]) {
  return [...levels].sort((a, b) => NGAZI_ORDER.indexOf(a.ngazi) - NGAZI_ORDER.indexOf(b.ngazi));
}

interface Props {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
}

export function NgaziOperationsTrialPanel({ dayosisi, majimbo, matawi }: Props) {
  const initial = monthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [dayosisiId, setDayosisiId] = useState("");
  const [jimboId, setJimboId] = useState("");
  const [tawiId, setTawiId] = useState("");
  const [data, setData] = useState<NgaziOperationsSummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jimboOptions = useMemo(() => {
    if (!dayosisiId) return majimbo;
    return majimbo.filter((j) => j.dayosisi_id === dayosisiId);
  }, [majimbo, dayosisiId]);

  const tawiOptions = useMemo(() => {
    if (!jimboId) return matawi;
    return matawi.filter((t) => t.jimbo_id === jimboId);
  }, [matawi, jimboId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNgaziOperationsSummary({
        from,
        to,
        dayosisiId: dayosisiId || undefined,
        jimboId: jimboId || undefined,
        tawiId: tawiId || undefined,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Imeshindikana kupakia muhtasari wa ngazi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, dayosisiId, jimboId, tawiId]);

  useEffect(() => {
    void load();
  }, [load]);

  const levels = useMemo(() => (data?.levels ? sortLevels(data.levels) : []), [data?.levels]);

  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow">
      <PanelHeader />
      <p className="mt-1 text-xs text-slate-600">
        Muhtasari wa <strong>fedha</strong>, <strong>mapato</strong> na <strong>mahudhurio</strong> kwa kila ngazi — kutoka{" "}
        <strong>tawi (chini)</strong> hadi <strong>makao makuu (juu)</strong>. Ingiza rekodi kupitia moduli za Fedha, Mapato na
        Mahudhurio; KPI zitaonekana hapa baada ya kuhifadhi.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          <span className="inline-flex items-center gap-1">
            <CalendarRange className="h-3.5 w-3.5" /> Kutoka
          </span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Hadi
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Dayosisi
          <select
            value={dayosisiId}
            onChange={(e) => {
              setDayosisiId(e.target.value);
              setJimboId("");
              setTawiId("");
            }}
            className="min-w-[140px] rounded-lg border px-2 py-1.5 text-sm"
          >
            <option value="">Zote</option>
            {dayosisi.map((d) => (
              <option key={d.id} value={d.id}>
                {d.jina || d.code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Jimbo
          <select
            value={jimboId}
            onChange={(e) => {
              setJimboId(e.target.value);
              setTawiId("");
            }}
            className="min-w-[140px] rounded-lg border px-2 py-1.5 text-sm"
          >
            <option value="">Zote</option>
            {jimboOptions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.jina}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Tawi
          <select value={tawiId} onChange={(e) => setTawiId(e.target.value)} className="min-w-[160px] rounded-lg border px-2 py-1.5 text-sm">
            <option value="">Zote</option>
            {tawiOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.jina}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          Pakia upya
        </button>
      </div>

      {loading && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Inapakia KPI za ngazi…
        </p>
      )}

      {error && !loading && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {!loading && data?.rollup && <RollupBar rollup={data.rollup} from={data.from} to={data.to} />}

      {!loading && levels.length > 0 && <LevelsList levels={levels} />}

      {!loading && !error && levels.length === 0 && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Hakuna rekodi za fedha/mahudhurio kwa kipindi hiki. Nenda <strong>Fedha</strong>, <strong>Mapato</strong> au{" "}
          <strong>Mahudhurio</strong>, chagua ngazi (tawi/jimbo/dayosisi), kisha pakia upya.
        </p>
      )}
    </section>
  );
}

function PanelHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-slate-900">KPI za Uendeshaji kwa Ngazi</h3>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
        Moja kwa moja
      </span>
    </div>
  );
}

function RollupBar({
  rollup,
  from,
  to,
}: {
  rollup: NgaziOperationsSummaryPayload["rollup"];
  from: string;
  to: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Jumla ya chuja ({from} — {to})
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <KpiMini icon={TrendingUp} label="Mapato (fedha)" value={tzs(rollup.finance_mapato)} tone="emerald" />
        <KpiMini icon={Banknote} label="Matumizi" value={tzs(rollup.finance_matumizi)} tone="amber" />
        <KpiMini icon={Banknote} label="Salio" value={tzs(rollup.finance_saldo)} tone="blue" />
        <KpiMini icon={Activity} label="Mahudhurio" value={String(rollup.attendance_total)} tone="violet" />
        <KpiMini icon={Users} label="Vikao" value={String(rollup.attendance_sessions)} tone="slate" />
      </div>
    </div>
  );
}

function LevelsList({ levels }: { levels: NgaziOperationsLevelRow[] }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-semibold text-slate-700">Kila ngazi (chini → juu)</p>
      {levels.map((row) => (
        <LevelCard key={`${row.ngazi}-${row.entity_id ?? row.label}`} row={row} />
      ))}
    </div>
  );
}

function LevelCard({ row }: { row: NgaziOperationsLevelRow }) {
  const border =
    row.ngazi === "tawi"
      ? "border-teal-200"
      : row.ngazi === "jimbo"
        ? "border-cyan-200"
        : row.ngazi === "dayosisi"
          ? "border-blue-200"
          : "border-indigo-200";

  return (
    <article className={`rounded-xl border ${border} bg-white p-3 shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{NGAZI_LABEL[row.ngazi]}</p>
          <p className="text-sm font-bold text-slate-900">{row.label}</p>
          {row.jimbo_label && row.ngazi === "tawi" && (
            <p className="text-xs text-slate-500">
              {row.dayosisi_label} → {row.jimbo_label}
            </p>
          )}
        </div>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Fedha + Mahudhurio</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Mapato" value={tzs(row.finance_mapato)} />
        <Metric label="Matumizi" value={tzs(row.finance_matumizi)} />
        <Metric label="Salio" value={tzs(row.finance_saldo)} highlight />
        <Metric label="Mistari mapato" value={tzs(row.income_lines_total)} />
        <Metric label="Mahudhurio (jumla)" value={String(row.attendance_total)} />
        <Metric label="Vikao" value={String(row.attendance_sessions)} />
        <Metric label="Waumini" value={String(row.members_count)} />
        <Metric label="Familia" value={String(row.families_count)} />
      </div>
    </article>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 ${highlight ? "bg-emerald-50" : "bg-slate-50"}`}>
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${highlight ? "text-emerald-900" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function KpiMini({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  tone: "emerald" | "amber" | "blue" | "violet" | "slate";
}) {
  const bg =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-900"
      : tone === "amber"
        ? "bg-amber-50 text-amber-900"
        : tone === "blue"
          ? "bg-blue-50 text-blue-900"
          : tone === "violet"
            ? "bg-violet-50 text-violet-900"
            : "bg-slate-50 text-slate-900";
  return (
    <div className={`rounded-lg px-2 py-2 ${bg}`}>
      <p className="flex items-center gap-1 text-[10px] font-medium opacity-80">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

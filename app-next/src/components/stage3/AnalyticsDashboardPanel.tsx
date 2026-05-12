import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarRange,
  Download,
  Loader2,
  Printer,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { stage2GradHeader } from "../../lib/stage2Theme";
import { fetchPortalAnalyticsDashboard } from "../../services/stage3/analyticsService";
import type { AnalyticsDashboardPayload, DayosisiRecord, JimboRecord, TawiRecord } from "../../types";
import { GlassPanel, MotionCard } from "../stage2/Stage2Motion";
import { exportTableToPdf } from "../../lib/exportHelpers";
import { KMT_PORTAL_RELOAD_METRICS_EVENT } from "../../lib/portalEvents";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const ANALYTICS_CHART_PX = 256;

function tzs(n: number) {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(n) + " TZS";
}

const KIND_SW: Record<string, string> = {
  member: "Mwanachama",
  family: "Familia",
  finance: "Fedha",
  income_line: "Mapato",
  document: "Nyaraka",
  sermon: "Mahubiri",
  event: "Tukio",
  video: "Video",
  audio: "Sauti",
};

function monthStartEnd(d: Date): { from: string; to: string } {
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function daysAgo(n: number): Date {
  const x = new Date();
  x.setDate(x.getDate() - n);
  return x;
}

const EMPTY_DAYOSISI: DayosisiRecord[] = [];
const EMPTY_JIMBO: JimboRecord[] = [];
const EMPTY_TAWI: TawiRecord[] = [];

export type AnalyticsDashboardHierarchyProps = {
  dayosisi?: DayosisiRecord[];
  majimbo?: JimboRecord[];
  matawi?: TawiRecord[];
};

export function AnalyticsDashboardPanel(props: { variant?: "dashibodi" | "ripoti" } & AnalyticsDashboardHierarchyProps) {
  const variant = props.variant ?? "dashibodi";
  const isRipoti = variant === "ripoti";
  const { reportError, pushToast, canPortalExportModule } = usePortal();
  const canExport = canPortalExportModule("analytics");

  const dayosisiRows = props.dayosisi ?? EMPTY_DAYOSISI;
  const majimboRows = props.majimbo ?? EMPTY_JIMBO;
  const matawiRows = props.matawi ?? EMPTY_TAWI;
  const showHierarchyPickers = dayosisiRows.length > 0 || majimboRows.length > 0 || matawiRows.length > 0;

  const [data, setData] = useState<AnalyticsDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => monthStartEnd(new Date()).from);
  const [to, setTo] = useState(() => monthStartEnd(new Date()).to);
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [dayosisiId, setDayosisiId] = useState("");
  const [jimboId, setJimboId] = useState("");
  const [tawiId, setTawiId] = useState("");
  const [source, setSource] = useState("");
  const [leadershipLevel, setLeadershipLevel] = useState("");
  const [department, setDepartment] = useState("");
  const reloadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const majimboFiltered = useMemo(
    () => majimboRows.filter((j) => !dayosisiId || String(j.dayosisi_id ?? "").trim() === dayosisiId.trim()),
    [majimboRows, dayosisiId]
  );
  const tawiFiltered = useMemo(
    () => matawiRows.filter((t) => !jimboId || String(t.jimbo_id ?? "").trim() === jimboId.trim()),
    [matawiRows, jimboId]
  );

  const load = useCallback(async () => {
    if (!getSupabase()) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const payload = await fetchPortalAnalyticsDashboard({
        from,
        to,
        category: category.trim() || null,
        year: year.trim() || null,
        month: month.trim() || null,
        dayosisi_id: dayosisiId.trim() || null,
        jimbo_id: jimboId.trim() || null,
        tawi_id: tawiId.trim() || null,
        source: source.trim() || null,
        leadership_level: leadershipLevel.trim() || null,
        department: department.trim() || null,
      });
      setData(payload);
    } catch (e) {
      reportError(e, "Analytics — dashibodi");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [reportError, from, to, category, year, month, dayosisiId, jimboId, tawiId, source, leadershipLevel, department]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const c = getSupabase();
    if (!c) return;
    const scheduleLoad = () => {
      if (reloadDebounceRef.current) clearTimeout(reloadDebounceRef.current);
      reloadDebounceRef.current = setTimeout(() => {
        reloadDebounceRef.current = null;
        void load();
      }, 500);
    };
    const onPortalReload = (ev: Event) => {
      const immediate = Boolean((ev as CustomEvent<{ immediate?: boolean }>).detail?.immediate);
      if (immediate) {
        if (reloadDebounceRef.current) clearTimeout(reloadDebounceRef.current);
        reloadDebounceRef.current = null;
        void load();
        return;
      }
      scheduleLoad();
    };
    window.addEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onPortalReload);
    const ch = c
      .channel("analytics-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "church_finance_entries" }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_income_lines" }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_members" }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "church_viongozi" }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, scheduleLoad)
      .subscribe();
    return () => {
      window.removeEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onPortalReload);
      if (reloadDebounceRef.current) clearTimeout(reloadDebounceRef.current);
      void c.removeChannel(ch);
    };
  }, [load]);

  const chartMax = useMemo(() => {
    const rows = data?.finance_by_month ?? [];
    let m = 0;
    rows.forEach((r) => {
      const v = Number(r.mapato) || 0;
      if (v > m) m = v;
    });
    return m || 1;
  }, [data]);

  const applyPreset = (key: "month" | "q" | "year") => {
    const now = new Date();
    if (key === "month") {
      const { from: f, to: t } = monthStartEnd(now);
      setFrom(f);
      setTo(t);
    } else if (key === "q") {
      const start = daysAgo(90);
      setFrom(start.toISOString().slice(0, 10));
      setTo(now.toISOString().slice(0, 10));
    } else {
      const start = new Date(now.getFullYear(), 0, 1);
      setFrom(start.toISOString().slice(0, 10));
      setTo(now.toISOString().slice(0, 10));
    }
  };

  const printReport = () => {
    window.print();
  };

  const exportPdf = async () => {
    if (!canExport) {
      pushToast("Huna ruhusa ya kuhamisha ripoti.", "error");
      return;
    }
    if (!data) return;
    await exportTableToPdf(
      "RIPOTI YA ANALYTICS YA KMK(T)",
      `kmkt-analytics-${data.range.from}-${data.range.to}`,
      ["Sehemu", "Kipimo", "Thamani"],
      [
        ["Muhtasari", "Waumini", String(data.totals.members)],
        ["Muhtasari", "Familia", String(data.totals.families)],
        ["Muhtasari", "Viongozi active", String(data.totals.leaders_active)],
        ["Fedha", "Mapato (mistari)", tzs(data.period.income_lines_sum)],
        ["Fedha", "Mapato (fedha)", tzs(data.period.finance_income_sum)],
        ...data.income_by_source.slice(0, 12).map((r) => ["Chanzo cha mapato", r.label, tzs(r.amount)]),
        ...data.members_by_region.slice(0, 10).map((r) => ["Waumini kwa Mkoa", r.label, String(r.total)]),
        ...data.leaders_by_level.slice(0, 10).map((r) => ["Uongozi kwa Ngazi", r.label, String(r.total)]),
        ...data.audit_activity.slice(0, 10).map((r) => ["Audit Activity", r.day, String(r.total)]),
      ],
      {
        subtitle: `Kipindi: ${data.range.from} - ${data.range.to}${data.category_filter ? ` | Kategoria: ${data.category_filter}` : ""}`,
        description:
          "Ripoti hii inatoa muhtasari wa viashiria muhimu vya utendaji wa portal, huduma, waumini na fedha kwa ajili ya uamuzi wa kiutendaji na uongozi.",
      }
    );
    pushToast("PDF imepakuliwa.", "success");
  };

  const exportExcel = async () => {
    if (!data) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const summary = [
      ["KMK(T) EXECUTIVE ANALYTICS REPORT"],
      [`Range`, `${data.range.from} - ${data.range.to}`],
      [],
      ["Metric", "Value"],
      ["Members", data.totals.members],
      ["Families", data.totals.families],
      ["Leaders", data.totals.leaders_total],
      ["Mapato (period)", data.period.finance_income_sum + data.period.income_lines_sum],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.finance_by_month), "FinanceTrend");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.income_by_category), "IncomeByCategory");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.members_by_region), "MembersByRegion");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.leaders_by_level), "LeadersByLevel");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.audit_activity), "AuditTrend");
    XLSX.writeFile(wb, `kmkt-executive-analytics-${data.range.from}-${data.range.to}.xlsx`);
    pushToast("Excel report imepakuliwa.", "success");
  };

  return (
    <div className="space-y-5 print:max-w-none" id="analytics-dashboard-root">
      <header className={`no-print rounded-2xl p-6 text-white shadow-xl ${stage2GradHeader}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/90">Stage 3</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <BarChart3 className="h-7 w-7" />
              Analytics Dashboard
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-blue-50/95">
              Takwimu halisi kutoka Supabase (RPC yenye RLS). Chuja kwa tarehe na kategoria.
            </p>
          </div>
          {isRipoti ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={printReport}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/30 hover:bg-white/25"
              >
                <Printer className="h-4 w-4" />
                Chapisha
              </button>
              <button
                type="button"
                onClick={() => void exportPdf()}
                disabled={!data}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-4 py-2 text-sm font-bold text-[#0B3C5D] shadow hover:bg-amber-300 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => void exportExcel()}
                disabled={!data}
                className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-[#0B3C5D] shadow hover:bg-white disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
            </div>
          ) : (
            <p className="max-w-sm text-xs text-blue-100/90">Muhtasari — chagua &ldquo;Ripoti &amp; Chuja&rdquo; kwa uchujaji wa kina na PDF.</p>
          )}
        </div>
      </header>

      {isRipoti ? (
      <GlassPanel className="no-print p-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => applyPreset("month")} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">
            Mwezi huu
          </button>
          <button type="button" onClick={() => applyPreset("q")} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">
            Siku 90
          </button>
          <button type="button" onClick={() => applyPreset("year")} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">
            Mwaka huu
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-12 md:items-end">
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-3">
            <span className="flex items-center gap-1">
              <CalendarRange className="h-3.5 w-3.5" />
              Kutoka
            </span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-3">
            Hadi
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-4">
            Kategoria (chuja fedha / nyaraka)
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="mfano: Sadaka"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-2">
            Mwaka
            <input value={year} onChange={(e) => setYear(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="2026" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-2">
            Mwezi (YYYY-MM)
            <input value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="2026-05" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-3">
            Dayosisi
            {showHierarchyPickers ? (
              <select
                value={dayosisiId}
                onChange={(e) => {
                  setDayosisiId(e.target.value);
                  setJimboId("");
                  setTawiId("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">— Zote / chagua —</option>
                {dayosisiRows.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.jina?.trim() || d.code?.trim() || d.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={dayosisiId}
                onChange={(e) => setDayosisiId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                placeholder="UUID dayosisi (hamna orodha)"
              />
            )}
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-3">
            Jimbo
            {showHierarchyPickers ? (
              <select
                value={jimboId}
                onChange={(e) => {
                  setJimboId(e.target.value);
                  setTawiId("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">— Zote / chagua —</option>
                {majimboFiltered.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jina?.trim() || j.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={jimboId}
                onChange={(e) => setJimboId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                placeholder="UUID jimbo"
              />
            )}
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-3">
            Tawi / kituo
            {showHierarchyPickers ? (
              <select
                value={tawiId}
                onChange={(e) => setTawiId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">— Zote / chagua —</option>
                {tawiFiltered.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.jina?.trim() || t.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={tawiId}
                onChange={(e) => setTawiId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                placeholder="UUID tawi"
              />
            )}
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-2">
            Chanzo
            <input value={source} onChange={(e) => setSource(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-2">
            Ngazi ya uongozi
            <input value={leadershipLevel} onChange={(e) => setLeadershipLevel(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-2">
            Idara
            <input value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => void load()}
              className="w-full rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
            >
              Pakua upya
            </button>
          </div>
        </div>
      </GlassPanel>
      ) : null}

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center gap-2 text-slate-500" role="status" aria-live="polite" aria-busy="true">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          Inapakia takwimu…
        </div>
      ) : !data ? (
        <div role="alert">
          <GlassPanel className="p-8 text-center text-slate-600">
            Hakuna data — jaribu tena baada ya kuunganisha Supabase.
          </GlassPanel>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: Users, label: "Waumini (jumla)", display: String(data.totals.members), tone: "from-[#0B3C5D] to-slate-800" },
              { icon: Sparkles, label: "Familia (jumla)", display: String(data.totals.families), tone: "from-[#134b72] to-[#0B3C5D]" },
              {
                icon: TrendingUp,
                label: "Mapato — mistari (kipindi)",
                display: tzs(data.period.income_lines_sum),
                tone: "from-emerald-800 to-[#0B3C5D]",
              },
              {
                icon: Activity,
                label: "Fedha — Mapato (kipindi)",
                display: tzs(data.period.finance_income_sum),
                tone: "from-[#D4AF37] to-[#0B3C5D]",
              },
            ].map((k, i) => (
              <MotionCard key={k.label}>
                <div
                  className={`rounded-2xl bg-gradient-to-br p-4 text-center text-white shadow-lg ${k.tone}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex min-h-[128px] flex-col items-center justify-center">
                    <k.icon className="h-6 w-6 opacity-90" />
                    <p className="mt-3 line-clamp-2 text-xs font-semibold uppercase tracking-wide text-white/80">{k.label}</p>
                    <p className="mt-1 text-xl font-bold leading-snug md:text-2xl">{k.display}</p>
                  </div>
                </div>
              </MotionCard>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel className="p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#0B3C5D]">Jumla za mfumo</h3>
              <ul className="grid gap-2 text-sm text-slate-700">
                <li className="flex justify-between border-b border-slate-100 py-1">
                  <span>Ingizo la fedha</span>
                  <strong>{data.totals.finance_entries}</strong>
                </li>
                <li className="flex justify-between border-b border-slate-100 py-1">
                  <span>Mistari ya mapato</span>
                  <strong>{data.totals.income_lines}</strong>
                </li>
                <li className="flex justify-between border-b border-slate-100 py-1">
                  <span>Vyanzo vya mapato</span>
                  <strong>{data.totals.income_sources}</strong>
                </li>
                <li className="flex justify-between border-b border-slate-100 py-1">
                  <span>Nyaraka</span>
                  <strong>{data.totals.documents}</strong>
                </li>
                <li className="flex justify-between border-b border-slate-100 py-1">
                  <span>Mahubiri</span>
                  <strong>{data.totals.sermons}</strong>
                </li>
                <li className="flex justify-between border-b border-slate-100 py-1">
                  <span>Matukio</span>
                  <strong>{data.totals.events}</strong>
                </li>
                <li className="flex justify-between py-1">
                  <span>Media (jumla ya makundi)</span>
                  <strong>{data.totals.media_total}</strong>
                </li>
              </ul>
            </GlassPanel>

            <GlassPanel className="p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#0B3C5D]">Mapato ya fedha (miezi 6)</h3>
              {(data.finance_by_month ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">Hakuna data bado</p>
              ) : (
                <div className="min-h-[256px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height={ANALYTICS_CHART_PX} debounce={40}>
                    <LineChart data={data.finance_by_month}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="mapato" stroke="#0B1F3A" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel className="p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#0B3C5D]">Income by category</h3>
              <div className="min-h-[256px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={ANALYTICS_CHART_PX} debounce={40}>
                  <BarChart data={data.income_by_category.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#D4AF37" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>
            <GlassPanel className="p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#0B3C5D]">Members by gender</h3>
              <div className="min-h-[256px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={ANALYTICS_CHART_PX} debounce={40}>
                  <PieChart>
                    <Pie data={data.members_by_gender} dataKey="total" nameKey="label" outerRadius={90}>
                      {data.members_by_gender.map((_, i) => (
                        <Cell key={i} fill={["#0B1F3A", "#D4AF37", "#134b72", "#7c3aed"][i % 4]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#0B3C5D]">
              <Activity className="h-4 w-4" />
              {isRipoti ? "Shughuli za hivi karibuni (zinazoweza kuchapishwa)" : "Shughuli za hivi karibuni"}
            </h3>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white/80">
              {(data.recent_activity ?? []).length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Hakuna shughuli bado.</p>
              ) : (
                data.recent_activity.map((r, idx) => (
                  <div key={`${r.kind}-${r.at}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-900">
                      <span className="mr-2 rounded bg-[#0B3C5D]/10 px-2 py-0.5 text-xs text-[#0B3C5D]">
                        {KIND_SW[r.kind] ?? r.kind}
                      </span>
                      {r.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {r.at ? new Date(r.at).toLocaleString("sw-TZ", { dateStyle: "short", timeStyle: "short" }) : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassPanel>

          {isRipoti ? (
            <GlassPanel className="no-print p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#0B3C5D]">Ripoti ya kina — mapato kwa mwezi</h3>
              <div className="overflow-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                    <tr>
                      <th className="px-3 py-2">Mwezi</th>
                      <th className="px-3 py-2">Mapato (TZS)</th>
                      <th className="px-3 py-2">Uwiano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.finance_by_month ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-slate-500">
                          Hakuna data.
                        </td>
                      </tr>
                    ) : (
                      (data.finance_by_month ?? []).map((row) => (
                        <tr key={row.month} className="border-t border-slate-100">
                          <td className="px-3 py-2">{row.month}</td>
                          <td className="px-3 py-2 font-semibold tabular-nums">{tzs(Number(row.mapato) || 0)}</td>
                          <td className="px-3 py-2">
                            <div className="h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#0B3C5D] to-[#D4AF37]"
                                style={{ width: `${Math.min(100, (Number(row.mapato) / chartMax) * 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          ) : null}
        </>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

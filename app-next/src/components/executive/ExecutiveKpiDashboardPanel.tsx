import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Coins, FileUp, FolderKanban, Shield, Users } from "lucide-react";
import { PremiumKPICard } from "./PremiumKPICard";
import { SafeChartBox } from "../common/SafeChartBox";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { PortalKpiRowSkeleton } from "../common/PortalSkeleton";
import { formatMoneyTzOrDash } from "../../lib/money";
import { userFacingQueryError } from "../../lib/portalHardening/userFacingError";
import { EXECUTIVE_SCOPE_OPTIONS } from "../../lib/executiveKpiDashboard";
import { fetchExecutiveKpiDashboard, subscribeExecutiveKpiDashboard } from "../../services/executiveKpiDashboardService";
import type { ExecutiveKpiDashboardPayload, ExecutiveKpiScope } from "../../lib/executiveKpiDashboard";

const CHART_COLORS = ["#0B1F3A", "#123C69", "#D4AF37", "#168564", "#c2410c", "#7c3aed"];

function ExecutiveKpiDashboardPanelInner() {
  const [scope, setScope] = useState<ExecutiveKpiScope>("kmkt");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExecutiveKpiDashboardPayload | null>(null);
  const [stableCards, setStableCards] = useState(true);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStableCards(true);
    try {
      const res = await fetchExecutiveKpiDashboard(scope, null);
      if (res.error) setError(res.error === "forbidden" ? "Huna ruhusa." : res.error);
      setData(res);
    } catch (e) {
      setError(userFacingQueryError(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
      requestAnimationFrame(() => setStableCards(false));
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () =>
      subscribeExecutiveKpiDashboard(() => {
        if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = setTimeout(() => {
          reloadTimerRef.current = null;
          setStableCards(true);
          void load();
        }, 1800);
      }, 2000),
    [load],
  );

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { title: "Wanachama", value: String(data.membership.total), hint: "Uanachama", icon: <Users className="h-4 w-4" /> },
      { title: "Mapato", value: formatMoneyTzOrDash(data.finance.incomeTotal), hint: "Mwezi", icon: <Coins className="h-4 w-4" /> },
      { title: "Matumizi", value: formatMoneyTzOrDash(data.finance.expenseTotal), hint: "Fedha", icon: <Coins className="h-4 w-4" /> },
      { title: "Salio", value: formatMoneyTzOrDash(data.finance.balance), hint: "Fedha", icon: <Coins className="h-4 w-4" /> },
      { title: "Mahudhurio", value: String(data.attendance.sessionsMonth), hint: `Leo ${data.attendance.sessionsToday}`, icon: <Activity className="h-4 w-4" /> },
      { title: "Miradi", value: String(data.projects.projectCount), hint: `${data.projects.activeCount} hai`, icon: <FolderKanban className="h-4 w-4" /> },
      { title: "Upakiaji", value: String(data.uploads.pendingVerification), hint: `${data.uploads.total} jumla`, icon: <FileUp className="h-4 w-4" /> },
      { title: "Idhini", value: String(data.approvals.totalPending), hint: "Inasubiri", icon: <Shield className="h-4 w-4" /> },
    ];
  }, [data]);

  const membershipPie = useMemo(
    () =>
      data
        ? [
            { name: "Wanaume", value: data.membership.wanaume },
            { name: "Wanawake", value: data.membership.wanawake },
            { name: "Vijana", value: data.membership.vijana },
          ].filter((x) => x.value > 0)
        : [],
    [data]
  );

  const projectBar = useMemo(
    () => data?.byType.map((t: { label: string; count: number }) => ({ name: t.label.slice(0, 12), count: t.count })) ?? [],
    [data]
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border-4 border-double border-[#0B1F3A]/30 bg-gradient-to-br from-[#0B1F3A] via-[#123C69] to-slate-950 p-6 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/90">Executive KPI Dashboard</p>
        <h2 className="mt-1 text-xl font-bold">Dashibodi za Uongozi — Ngazi</h2>
        <p className="mt-2 text-sm text-slate-200/90">Fedha · Uanachama · Mahudhurio · Miradi · Upakiaji · Idhini</p>
      </header>

      <div className="flex flex-wrap justify-center gap-2">
        {EXECUTIVE_SCOPE_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setScope(s.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              scope === s.value ? "bg-amber-500 text-[#0B1F3A]" : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PortalKpiRowSkeleton count={8} />
      ) : error ? (
        <SupabaseListFeedback loading={false} loadError={error} isEmpty={false} onRetry={() => void load()} />
      ) : (
        <>
          <section
            className="grid grid-cols-1 justify-items-center gap-3 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4"
            aria-label="KPI cards"
          >
            {cards.map((c, i) => (
              <PremiumKPICard
                key={c.title}
                title={c.title}
                value={c.value}
                hint={c.hint}
                icon={c.icon}
                index={i}
                static={stableCards}
                live={!stableCards}
              />
            ))}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <SafeChartBox title="Uanachama kwa jinsia" isEmpty={membershipPie.length === 0} height={220}>
              <PieChart>
                <Pie data={membershipPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                  {membershipPie.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </SafeChartBox>
            <SafeChartBox title="Miradi kwa aina" isEmpty={projectBar.length === 0} height={220}>
              <BarChart data={projectBar}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#123C69" radius={[4, 4, 0, 0]} />
              </BarChart>
            </SafeChartBox>
          </div>

          {data && (
            <p className="text-center text-xs text-slate-500">
              Kipindi: {data.periodStart} — {data.periodEnd} · Realtime (debounced) · Ngazi: {scope.toUpperCase()}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export const ExecutiveKpiDashboardPanel = memo(ExecutiveKpiDashboardPanelInner);
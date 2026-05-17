import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { SafeChartBox } from "../common/SafeChartBox";
import { AUDIT_CATEGORY_LABELS, type AuditActionCategory } from "../../lib/enterpriseAudit";
import { fetchAuditDashboardSummary, type AuditDashboardSummary } from "../../services/auditLogService";
import { PremiumKPICard } from "../executive/PremiumKPICard";

const CATEGORY_COLORS: Record<string, string> = {
  create: "#16a34a",
  update: "#2563eb",
  delete: "#dc2626",
  approve: "#d97706",
  upload: "#7c3aed",
  export: "#0d9488",
  download: "#0891b2",
  login: "#64748b",
  other: "#94a3b8",
};

type Props = {
  days?: number;
  onCategorySelect?: (category: AuditActionCategory | "all") => void;
  selectedCategory?: AuditActionCategory | "all";
};

export function EnterpriseAuditActivityDashboard({
  days = 30,
  onCategorySelect,
  selectedCategory = "all",
}: Props) {
  const [summary, setSummary] = useState<AuditDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAuditDashboardSummary(days).then((s) => {
      if (!cancelled) {
        setSummary(s);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const categoryChart = useMemo(() => {
    if (!summary?.by_category.length) return [];
    return summary.by_category.map((x) => ({
      name: AUDIT_CATEGORY_LABELS[x.category as AuditActionCategory]?.sw ?? x.category,
      key: x.category,
      value: x.count,
    }));
  }, [summary]);

  const moduleChart = useMemo(() => {
    if (!summary?.by_module.length) return [];
    return summary.by_module.slice(0, 8).map((x) => ({ name: x.module, value: x.count }));
  }, [summary]);

  const dayChart = useMemo(() => {
    if (!summary?.by_day.length) return [];
    return summary.by_day.map((x) => ({ day: x.day.slice(5), total: x.total }));
  }, [summary]);

  const successRate = useMemo(() => {
    if (!summary || summary.total <= 0) return "—";
    const ok = summary.total - summary.failed;
    return `${Math.round((ok / summary.total) * 100)}%`;
  }, [summary]);

  if (loading && !summary) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Inapakia dashibodi ya shughuli…
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Dashibodi ya shughuli haipatikani (RPC haijasakinishwa au hakuna ruhusa). Jedwali la chini linaendelea kuonyesha rekodi.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumKPICard title="Jumla ya matukio" value={String(summary.total)} hint={`Siku ${summary.days}`} static />
        <PremiumKPICard title="Imeshindwa" value={String(summary.failed)} hint="Status = failed" static />
        <PremiumKPICard title="Kiwango cha mafanikio" value={successRate} hint="Muda uliochaguliwa" static />
        <PremiumKPICard title="Moduli hai" value={String(summary.by_module.length)} hint="Ngazi za shughuli" static />
      </div>

      {onCategorySelect ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCategorySelect("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              selectedCategory === "all"
                ? "bg-[#0B1F3A] text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            Zote
          </button>
          {(Object.keys(AUDIT_CATEGORY_LABELS) as AuditActionCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategorySelect(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                selectedCategory === cat
                  ? "bg-[#0B1F3A] text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {AUDIT_CATEGORY_LABELS[cat].sw}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <SafeChartBox title="Matukio kwa aina" isEmpty={categoryChart.length === 0} height={220}>
          <PieChart>
            <Pie data={categoryChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
              {categoryChart.map((entry) => (
                <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key] ?? CATEGORY_COLORS.other} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </SafeChartBox>
        <SafeChartBox title="Moduli zinazotumika zaidi" isEmpty={moduleChart.length === 0} height={220}>
          <BarChart data={moduleChart} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#1e3a6e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </SafeChartBox>
        <SafeChartBox title="Shughuli kwa siku" isEmpty={dayChart.length === 0} height={220}>
          <BarChart data={dayChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" fill="#D4AF37" radius={[4, 4, 0, 0]} />
          </BarChart>
        </SafeChartBox>
      </div>

      {summary.top_users.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Watumiaji wenye shughuli nyingi</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.top_users.map((u) => (
              <li key={u.name} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800">
                {u.name} <span className="text-slate-500">({u.count})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

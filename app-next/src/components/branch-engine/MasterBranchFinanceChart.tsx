import { lazy, Suspense, useMemo } from "react";
import type { MasterBranchEngineSnapshot } from "../../services/masterBranchEngineService";

const LazyBarChart = lazy(async () => {
  const { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } = await import("recharts");
  return {
    default: function Chart({
      data,
    }: {
      data: { name: string; mapato: number; matumizi: number }[];
    }) {
      return (
        <ResponsiveContainer width="100%" height={220} debounce={40}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `${Number(v ?? 0).toLocaleString("sw-TZ")} TZS`} />
            <Bar dataKey="mapato" name="Mapato" fill="#0B1F3A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="matumizi" name="Matumizi" fill="#D4AF37" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    },
  };
});

type Props = { snapshot: MasterBranchEngineSnapshot };

export function MasterBranchFinanceChart({ snapshot }: Props) {
  const data = useMemo(() => {
    const c = snapshot.counts;
    if (c.financeMapatoMwezi <= 0 && c.financeMatumiziMwezi <= 0) return [];
    return [
      {
        name: "Mwezi huu",
        mapato: c.financeMapatoMwezi,
        matumizi: c.financeMatumiziMwezi,
      },
    ];
  }, [snapshot.counts]);

  if (data.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Hakuna data ya fedha kwa kipindi kilichochaguliwa.
      </p>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-[220px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
          Inapakia chati…
        </div>
      }
    >
      <LazyBarChart data={data} />
    </Suspense>
  );
}

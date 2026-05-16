import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { NgaziOperationsSummaryPayload } from "../../services/ngaziOperationsService";
import type { MasterBranchScope } from "../../services/masterBranchEngineService";

function tzs(n: number) {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(n) + " TZS";
}

type Props = {
  ngazi: NgaziOperationsSummaryPayload;
  scope: MasterBranchScope;
};

function scopeLabel(scope: MasterBranchScope): string {
  if (scope === "kitaifa") return "Kitaifa";
  if (scope === "dayosisi") return "Dayosisi";
  if (scope === "jimbo") return "Jimbo";
  return "Tawi";
}

export function MasterBranchNgaziRollupPanel({ ngazi, scope }: Props) {
  const [open, setOpen] = useState(true);
  const levels = ngazi.levels ?? [];

  if (levels.length === 0) return null;

  return (
    <section className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div>
          <h3 className="text-sm font-bold text-slate-900">Uchambuzi wa ngazi — drill-down</h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {ngazi.from} — {ngazi.to} · {scopeLabel(scope)}
          </p>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-indigo-700 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="mt-3 overflow-auto rounded-xl border border-white bg-white">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Ngazi</th>
                <th className="px-3 py-2">Jina</th>
                <th className="px-3 py-2 text-right">Waumini</th>
                <th className="px-3 py-2 text-right">Vikao</th>
                <th className="px-3 py-2 text-right">Mapato</th>
                <th className="px-3 py-2 text-right">Matumizi</th>
                <th className="px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((row) => (
                <tr key={`${row.ngazi}-${row.entity_id ?? row.label}`} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium capitalize text-slate-700">{row.ngazi}</td>
                  <td className="px-3 py-2 text-slate-900">{row.label || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.members_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.attendance_sessions}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tzs(row.finance_mapato)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tzs(row.finance_matumizi)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{tzs(row.finance_saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

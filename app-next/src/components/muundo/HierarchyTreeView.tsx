import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";

interface Props {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
}

/** Muundo wa dayosisi → jimbo → tawi kwa UUID halisi. */
export function HierarchyTreeView({ dayosisi, majimbo, matawi }: Props) {
  const orphansJimbo = majimbo.filter((j) => !j.dayosisi_id || !dayosisi.some((d) => d.id === j.dayosisi_id));
  const orphansTawi = matawi.filter((t) => !t.jimbo_id || !majimbo.some((j) => j.id === t.jimbo_id));

  return (
    <div className="rounded-2xl border border-cyan-200 bg-white p-4 shadow">
      <h3 className="text-sm font-bold text-slate-900">Muundo wa Kanisa (Hierarchy)</h3>
      <p className="mt-1 text-xs text-slate-600">Dayosisi → Jimbo → Tawi / kituo</p>
      <div className="mt-4 max-h-[min(70vh,720px)] overflow-auto rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm">
        <ul className="space-y-2">
          {dayosisi.map((d) => (
            <li key={d.id} className="rounded-lg border border-blue-100 bg-white p-2">
              <span className="font-semibold text-blue-900">{d.jina}</span>
              <span className="ml-2 text-xs text-slate-500">({d.code})</span>
              <ul className="ml-4 mt-2 space-y-1 border-l border-cyan-200 pl-3">
                {majimbo
                  .filter((j) => j.dayosisi_id === d.id)
                  .map((j) => (
                    <li key={j.id} className="text-slate-800">
                      <span className="font-medium text-cyan-900">{j.jina}</span>
                      <ul className="ml-3 mt-1 space-y-0.5 border-l border-teal-200 pl-2 text-xs text-slate-700">
                        {matawi
                          .filter((t) => t.jimbo_id === j.id)
                          .map((t) => (
                            <li key={t.id}>· {t.jina}</li>
                          ))}
                        {matawi.filter((t) => t.jimbo_id === j.id).length === 0 ? (
                          <li className="text-slate-400">Hakuna tawi bado</li>
                        ) : null}
                      </ul>
                    </li>
                  ))}
                {majimbo.filter((j) => j.dayosisi_id === d.id).length === 0 ? (
                  <li className="text-xs text-slate-400">Hakuna jimbo</li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>

        {(orphansJimbo.length > 0 || orphansTawi.length > 0) && (
          <div className="mt-4 border-t border-amber-200 pt-3">
            <p className="text-xs font-semibold text-amber-800">Vitu visivyounganishwa vizuri</p>
            {orphansJimbo.length > 0 ? (
              <ul className="mt-1 text-xs text-amber-900">
                {orphansJimbo.map((j) => (
                  <li key={j.id}>Jimbo: {j.jina}</li>
                ))}
              </ul>
            ) : null}
            {orphansTawi.length > 0 ? (
              <ul className="mt-1 text-xs text-amber-900">
                {orphansTawi.map((t) => (
                  <li key={t.id}>Tawi: {t.jina}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

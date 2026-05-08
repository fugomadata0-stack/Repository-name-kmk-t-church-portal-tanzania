import type { DayosisiRecord, JimboRecord, TawiRecord } from "../../types";

interface Props {
  dayosisi: DayosisiRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
}

/** Muhtasari wa idadi za ngazi za muundo (data tayari kutoka Supabase). */
export function NgaziKuuSummary({ dayosisi, majimbo, matawi }: Props) {
  const active = (s: string) => String(s).toLowerCase() !== "inactive" && String(s).toLowerCase() !== "archived";

  const ds = dayosisi.filter((d) => active(d.status)).length;
  const jb = majimbo.filter((j) => active(j.status)).length;
  const tw = matawi.filter((t) => active(t.status)).length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-cyan-200 bg-white p-4 shadow">
        <h3 className="text-sm font-bold text-slate-900">Ngazi Kuu za Muundo</h3>
        <p className="mt-1 text-xs text-slate-600">
          Idadi zinatokana na jedwali za <code className="rounded bg-slate-100 px-1">dayosisi</code>,{" "}
          <code className="rounded bg-slate-100 px-1">church_jimbo</code>,{" "}
          <code className="rounded bg-slate-100 px-1">church_tawi</code>.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Dayosisi</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{ds}</p>
          </article>
          <article className="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-800">Majimbo</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{jb}</p>
          </article>
          <article className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-teal-800">Matawi / Vituo</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{tw}</p>
          </article>
        </div>
      </section>
    </div>
  );
}

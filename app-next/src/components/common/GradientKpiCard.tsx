/** Kadi ya KPI — mandhari nyeupe, maandishi yanaonekana, accent ya dhahabu. */
export function GradientKpiCard({ title, value, gradient }: { title: string; value: string | number; gradient: string }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pt-5 shadow-xl shadow-slate-900/10">
      <div className={`absolute left-0 right-0 top-0 h-1.5 bg-gradient-to-r ${gradient}`} aria-hidden />
      <p className="text-xs font-semibold uppercase tracking-wide text-[#475569]">{title}</p>
      <h3 className="mt-2 text-2xl font-bold tabular-nums text-[#0B1F3A]">{value}</h3>
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-[#D4AF37]/15" aria-hidden />
    </article>
  );
}

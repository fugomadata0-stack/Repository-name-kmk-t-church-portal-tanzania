/** Kadi ya KPI — mandhari nyeupe, maandishi yenye tungamo nzuri (navy / slate). */
export function GradientKpiCard({
  title,
  value,
  gradient,
  onClick,
}: {
  title: string;
  value: string | number;
  gradient: string;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  const Tag = interactive ? "button" : "article";
  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={`relative flex h-full min-h-[148px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-300/90 bg-white p-5 pt-6 text-center shadow-xl shadow-slate-900/12 transition-shadow duration-200 sm:min-h-[156px] sm:rounded-3xl sm:p-6 sm:pt-7 ${
        interactive ? "cursor-pointer hover:border-amber-300 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500" : "hover:shadow-2xl"
      }`}
    >
      <div className={`absolute left-0 right-0 top-0 h-1.5 bg-gradient-to-r sm:h-2 ${gradient}`} aria-hidden />
      <p className="w-full max-w-full hyphens-auto break-words px-1 text-center text-[10px] font-bold uppercase leading-relaxed tracking-wide text-slate-700 sm:text-[11px]">
        {title}
      </p>
      <h3 className="mt-3 text-center text-xl font-extrabold tabular-nums leading-tight tracking-tight text-[#061020] sm:mt-3.5 sm:text-2xl sm:leading-tight">
        {value}
      </h3>
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-[#D4AF37]/15" aria-hidden />
    </Tag>
  );
}

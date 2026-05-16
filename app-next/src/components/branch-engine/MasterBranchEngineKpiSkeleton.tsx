export function MasterBranchEngineKpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-[4.25rem] animate-pulse rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-100 to-slate-50"
        />
      ))}
    </div>
  );
}

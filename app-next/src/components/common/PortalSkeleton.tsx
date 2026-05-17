/** Skeleton loaders za portal — epuka sehemu nyeupe / loading isiyoonekana. */

function Shimmer({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded-md bg-slate-200/90 ${className}`} aria-hidden />;
}

export function PortalPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="w-full space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Inapakia"
    >
      <Shimmer className="h-5 w-48" />
      <Shimmer className="h-3 w-full max-w-md" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }, (_, i) => (
          <Shimmer key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function PortalListSkeleton({ lines = 5, className = "" }: { lines?: number; className?: string }) {
  return (
    <div
      className={`space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Inapakia orodha"
    >
      {Array.from({ length: lines }, (_, i) => (
        <Shimmer key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function PortalKpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Inapakia vipimo"
    >
      {Array.from({ length: count }, (_, i) => (
        <Shimmer key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function PortalTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" role="status" aria-busy="true" aria-label="Inapakia jedwali">
      <div className="border-b border-slate-100 bg-slate-50/90 p-3">
        <Shimmer className="h-4 w-40" />
      </div>
      <div className="space-y-0 divide-y divide-slate-100 p-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-3 py-3">
            <Shimmer className="h-4 w-1/4" />
            <Shimmer className="h-4 flex-1" />
            <Shimmer className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

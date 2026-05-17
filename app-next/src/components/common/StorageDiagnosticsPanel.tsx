import { useCallback, useEffect, useMemo, useState } from "react";
import { HardDrive, RefreshCw } from "lucide-react";
import type { StorageBucketHealthStatus } from "../../lib/storageBucketProbe";
import { fetchStorageDiagnostics, type StorageDiagnosticsSnapshot } from "../../services/storageDiagnosticsService";

function statusMeta(status: StorageBucketHealthStatus | "ok" | "warn"): {
  icon: string;
  label: string;
  card: string;
  badge: string;
} {
  if (status === "healthy" || status === "ok") {
    return {
      icon: "✓",
      label: "Healthy",
      card: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white",
      badge: "bg-emerald-100 text-emerald-800",
    };
  }
  if (status === "needs_setup" || status === "warn") {
    return {
      icon: "⚠",
      label: "Needs Setup",
      card: "border-amber-200/90 bg-gradient-to-br from-amber-50/80 to-white",
      badge: "bg-amber-100 text-amber-900",
    };
  }
  if (status === "restricted") {
    return {
      icon: "⟳",
      label: "Syncing",
      card: "border-sky-200/90 bg-gradient-to-br from-sky-50/80 to-white",
      badge: "bg-sky-100 text-sky-900",
    };
  }
  return {
    icon: "?",
    label: "Unknown",
    card: "border-slate-200 bg-slate-50/90",
    badge: "bg-slate-100 text-slate-700",
  };
}

type Props = {
  compact?: boolean;
  /** Onyesha kadi za kila bucket (default: !compact). */
  showBucketGrid?: boolean;
};

export function StorageDiagnosticsPanel({ compact = false, showBucketGrid }: Props) {
  const [snap, setSnap] = useState<StorageDiagnosticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSnap(await fetchStorageDiagnostics());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const showGrid = showBucketGrid ?? !compact;

  const summary = useMemo(() => {
    if (!snap) return null;
    const healthy = snap.bucket_rows.filter((b) => b.status === "healthy").length;
    const setup = snap.bucket_rows.filter((b) => b.status === "needs_setup").length;
    return { healthy, setup, total: snap.bucket_rows.length };
  }, [snap]);

  if (loading && !snap) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <RefreshCw className="h-4 w-4 animate-spin text-[#0B1F3A]" aria-hidden />
          Inakagua storage…
        </p>
      </div>
    );
  }

  if (!snap) return null;

  const allHealthy = snap.buckets_ok && snap.env_ok && snap.api_connectivity_ok;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div
        className={`border-b border-slate-100 bg-gradient-to-r from-[#0B1F3A] to-[#1a3a5c] px-4 py-3 text-white ${compact ? "rounded-t-2xl" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-amber-300" aria-hidden />
            <h3 className="text-sm font-bold tracking-wide">Storage Health — KMK(T)</h3>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-semibold hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} aria-hidden />
            {loading ? "Inakagua…" : "Onyesha upya"}
          </button>
        </div>
        {!compact ? (
          <p className="mt-1 text-[11px] text-white/80">
            Mradi: <code className="rounded bg-black/20 px-1">{snap.project_origin}</code>
            {summary ? ` · ${summary.healthy}/${summary.total} buckets healthy` : null}
          </p>
        ) : null}
      </div>

      <div className={compact ? "p-3" : "p-4"}>
        <ul className="space-y-2">
          {snap.rows.map((row) => {
            const meta = statusMeta(row.status);
            return (
              <li
                key={row.id}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-xs ${meta.card}`}
              >
                <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${meta.badge}`}>
                  {meta.icon} {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{row.label}</p>
                  <p className="text-slate-700">{row.message}</p>
                  {row.hint && row.status !== "ok" && row.status !== "healthy" ? (
                    <p className="mt-1 text-[10px] text-slate-500">{row.hint}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {showGrid && snap.bucket_rows.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Buckets ({snap.bucket_rows.length})
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {snap.bucket_rows.map((b) => {
                const meta = statusMeta(b.status);
                return (
                  <div key={b.name} className={`rounded-xl border p-3 text-xs ${meta.card}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{b.label}</span>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${meta.badge}`}>
                        {meta.icon}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-slate-500">{b.name}</p>
                    <p className="mt-1 text-slate-600">{b.message}</p>
                    {b.setupHint && b.status === "needs_setup" ? (
                      <p className="mt-2 rounded-lg border border-amber-200/60 bg-amber-50/50 px-2 py-1.5 text-[10px] text-amber-900">
                        {b.setupHint}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {!allHealthy && snap.missing_buckets.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-3 text-xs text-amber-950">
            <p className="font-semibold">Hatua ya kurejesha (si hitilafu ya mfumo)</p>
            <p className="mt-1">
              Buckets zinazohitaji usanidi: <strong>{snap.missing_buckets.join(", ")}</strong>
            </p>
            <p className="mt-2 text-[10px] text-amber-900/90">
              Kutoka folder <code className="rounded bg-white/60 px-1">app-next</code>:{" "}
              <code className="rounded bg-white/60 px-1">npm run db:push:safe</code> — kisha onyesha upya.
            </p>
          </div>
        ) : allHealthy ? (
          <p className="mt-4 text-center text-[11px] font-medium text-emerald-700">
            ✓ Storage imeunganishwa vizuri na mradi wa Supabase.
          </p>
        ) : null}
      </div>
    </section>
  );
}

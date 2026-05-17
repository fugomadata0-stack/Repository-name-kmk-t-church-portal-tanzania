import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, HardDrive, RefreshCw, ShieldAlert } from "lucide-react";
import type { StorageBucketHealthRow, StorageBucketHealthStatus } from "../../lib/storageBucketProbe";
import { STORAGE_BUCKET_REGISTRY, type StorageBucketName } from "../../config/storageBuckets";
import { fetchStorageDiagnostics, type StorageDiagnosticsSnapshot } from "../../services/storageDiagnosticsService";

type StatusFilter = "all" | "healthy" | "needs_setup";

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
  if (status === "permission_limited") {
    return {
      icon: "◇",
      label: "Permission Limited",
      card: "border-sky-200/90 bg-gradient-to-br from-sky-50/80 to-white",
      badge: "bg-sky-100 text-sky-900",
    };
  }
  if (status === "checking") {
    return {
      icon: "⟳",
      label: "Checking",
      card: "border-slate-200 bg-slate-50/90",
      badge: "bg-slate-100 text-slate-700",
    };
  }
  return {
    icon: "?",
    label: "Unknown",
    card: "border-slate-200 bg-slate-50/90",
    badge: "bg-slate-100 text-slate-700",
  };
}

function bucketSortRank(status: StorageBucketHealthStatus): number {
  if (status === "needs_setup") return 0;
  if (status === "unknown" || status === "permission_limited") return 1;
  return 2;
}

function fmtCheckedAt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString("sw-TZ", { dateStyle: "medium", timeStyle: "short" });
}

function formatMissingList(names: string[]): string {
  if (names.length <= 5) return names.join(", ");
  return `${names.slice(0, 5).join(", ")} (+${names.length - 5} zingine)`;
}

type Props = {
  compact?: boolean;
  showBucketGrid?: boolean;
};

export function StorageDiagnosticsPanel({ compact = false, showBucketGrid }: Props) {
  const [snap, setSnap] = useState<StorageDiagnosticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setSnap(await fetchStorageDiagnostics());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Imeshindwa kukusanya ripoti ya storage.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const showGrid = showBucketGrid ?? !compact;

  const sortedBuckets = useMemo(() => {
    if (!snap) return [];
    return [...snap.bucket_rows].sort((a, b) => bucketSortRank(a.status) - bucketSortRank(b.status));
  }, [snap]);

  const filteredBuckets = useMemo(() => {
    if (filter === "all") return sortedBuckets;
    if (filter === "healthy") return sortedBuckets.filter((b) => b.status === "healthy");
    return sortedBuckets.filter((b) => b.status === "needs_setup");
  }, [sortedBuckets, filter]);

  if (loading && !snap) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <RefreshCw className="h-4 w-4 animate-spin text-[#0B1F3A]" aria-hidden />
          Inakagua storage…
        </p>
      </section>
    );
  }

  if (loadError && !snap) {
    return (
      <section className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Ukaguzi wa storage haujakamilika</p>
        <p className="mt-1 text-xs text-amber-900">{loadError}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-3 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Jaribu tena
        </button>
      </section>
    );
  }

  if (!snap) return null;

  const allHealthy = snap.overall_ok;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#0B1F3A] via-[#123C69] to-[#0B1F3A] px-4 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-amber-300" aria-hidden />
            <div>
              <h3 className="text-sm font-bold tracking-wide">Storage Health — KMK(T)</h3>
              {!compact ? (
                <p className="text-[10px] text-white/75">
                  Ukaguzi wa buckets — mahali pekee pa diagnostics (si kwenye moduli za media).
                </p>
              ) : null}
            </div>
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
        <p className="mt-2 text-[11px] text-white/80">
          Mradi: <code className="rounded bg-black/20 px-1">{snap.project_origin}</code>
          {" · "}
          {snap.buckets_healthy_count}/{snap.bucket_rows.length} buckets healthy
          {" · "}
          <span className="text-white/60">Imekaguliwa: {fmtCheckedAt(snap.checked_at)}</span>
        </p>
        <p className="mt-1 text-[10px] text-white/65">{snap.project_mismatch_note}</p>
      </div>

      <div className={compact ? "p-3" : "p-4"}>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Healthy</p>
            <p className="mt-0.5 text-2xl font-bold text-emerald-900">{snap.buckets_healthy_count}</p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">Needs Setup</p>
            <p className="mt-0.5 text-2xl font-bold text-amber-950">{snap.buckets_needs_setup_count}</p>
          </div>
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 px-3 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-sky-900">Permission Limited</p>
            <p className="mt-0.5 text-2xl font-bold text-sky-950">{snap.buckets_permission_limited_count}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Unknown</p>
            <p className="mt-0.5 text-2xl font-bold text-slate-800">{snap.buckets_unknown_count}</p>
          </div>
        </div>
        <div
          className={`mb-4 rounded-xl border px-3 py-2.5 text-center ${
            allHealthy ? "border-emerald-200/80 bg-emerald-50/50" : "border-slate-200 bg-slate-50/80"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Hali ya jumla</p>
          <p
            className={`mt-1 flex items-center justify-center gap-1 text-sm font-bold ${
              allHealthy ? "text-emerald-800" : "text-slate-700"
            }`}
          >
            {allHealthy ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Tayari
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 text-amber-700" aria-hidden />
                Angalia hapa chini
              </>
            )}
          </p>
        </div>

        <ul className="space-y-2">
          {snap.rows.map((row) => {
            const meta = statusMeta(row.status);
            const showHint = Boolean(row.hint) && row.status !== "ok";
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
                  {showHint ? <p className="mt-1 text-[10px] text-slate-500">{row.hint}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>

        {showGrid && snap.bucket_rows.length > 0 ? (
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Buckets ({filteredBuckets.length}/{snap.bucket_rows.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: "all" as const, label: "Zote" },
                    { id: "healthy" as const, label: "✓ Healthy" },
                    { id: "needs_setup" as const, label: "⚠ Setup" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                      filter === tab.id
                        ? "bg-[#0B1F3A] text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBuckets.map((b) => (
                <BucketCard key={b.name} bucket={b} />
              ))}
            </div>
            {filteredBuckets.length === 0 ? (
              <p className="mt-2 text-center text-xs text-slate-500">Hakuna bucket katika kichujio hiki.</p>
            ) : null}
          </div>
        ) : null}

        {!allHealthy && snap.missing_buckets.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-3 text-xs text-amber-950">
            <p className="font-semibold">Hatua ya kurejesha (si hitilafu ya mfumo)</p>
            <p className="mt-1">
              Buckets zinazohitaji usanidi: <strong>{formatMissingList(snap.missing_buckets)}</strong>
            </p>
            <p className="mt-2 text-[10px] text-amber-900/90">
              Kutoka folder <code className="rounded bg-white/60 px-1">app-next</code>:{" "}
              <code className="rounded bg-white/60 px-1">npm run db:push:safe</code> — kisha onyesha upya.
            </p>
          </div>
        ) : allHealthy ? (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Storage imeunganishwa vizuri na mradi wa Supabase.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function BucketCard({ bucket }: { bucket: StorageBucketHealthRow }) {
  const meta = statusMeta(bucket.status);
  const moduleKey = STORAGE_BUCKET_REGISTRY[bucket.name as StorageBucketName]?.module;
  return (
    <div className={`rounded-xl border p-3 text-xs ${meta.card}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-900">{bucket.label}</span>
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${meta.badge}`} title={meta.label}>
          {meta.icon} {meta.label}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] text-slate-500">
        {bucket.name}
        {moduleKey ? <span className="ml-1 text-slate-400">· moduli: {moduleKey}</span> : null}
      </p>
      <p className="mt-1 text-slate-600">{bucket.message}</p>
      {bucket.setupHint && bucket.status === "needs_setup" ? (
        <p className="mt-2 rounded-lg border border-amber-200/60 bg-amber-50/50 px-2 py-1.5 text-[10px] text-amber-900">
          {bucket.setupHint}
        </p>
      ) : null}
    </div>
  );
}

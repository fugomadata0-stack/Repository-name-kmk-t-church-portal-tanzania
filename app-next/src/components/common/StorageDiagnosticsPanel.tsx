import { useCallback, useEffect, useState } from "react";
import { fetchStorageDiagnostics, type StorageDiagnosticsSnapshot } from "../../services/storageDiagnosticsService";

export function StorageDiagnosticsPanel({ compact = false }: { compact?: boolean }) {
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

  if (loading && !snap) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Inakagua storage…
      </div>
    );
  }

  if (!snap) return null;

  const allOk = snap.rows.every((r) => r.ok);

  return (
    <section
      className={`rounded-xl border ${allOk ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/80"} ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">Diagnostics ya Storage</h3>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Inakagua…" : "Onyesha upya"}
        </button>
      </div>
      {!compact ? (
        <p className="mt-1 text-[11px] text-slate-600">
          Mradi: <code className="rounded bg-white/80 px-1">{snap.project_origin}</code>
          {" · "}
          Funguo ya API: {snap.has_anon_key ? "imepatikana" : "haipo"}
        </p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {snap.rows.map((row) => (
          <li
            key={row.id}
            className={`rounded-lg border px-3 py-2 text-xs ${row.ok ? "border-emerald-200/80 bg-white/70" : "border-rose-200 bg-white/90"}`}
          >
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 font-bold ${row.ok ? "text-emerald-700" : "text-rose-700"}`} aria-hidden>
                {row.ok ? "✓" : "!"}
              </span>
              <div>
                <p className="font-semibold text-slate-900">{row.label}</p>
                <p className="text-slate-700">{row.message}</p>
                {row.hint && !row.ok ? <p className="mt-1 text-[10px] text-slate-500">{row.hint}</p> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

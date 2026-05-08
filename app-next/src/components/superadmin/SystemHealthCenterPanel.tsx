import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Database, HardDrive, RefreshCw, ServerCog } from "lucide-react";
import type { HealthBadgeStatus, SystemHealthSnapshot } from "../../types";
import { fetchSystemHealthSnapshot } from "../../services/systemHealthService";
import { usePortal } from "../../context/PortalContext";
import { exportRowsToExcel, exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";

function badgeClass(status: HealthBadgeStatus): string {
  if (status === "healthy") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "warning") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

function emptySnapshot(): SystemHealthSnapshot {
  return {
    badges: {
      database: "warning",
      notifications: "warning",
      uploads: "warning",
      jobs: "warning",
      realtime: "warning",
      backups: "warning",
      storage: "warning",
    },
    indicators: {
      database_connection: "offline",
      supabase_health: "degraded",
      realtime_sync: "degraded",
      backup_status: "unknown",
      notification_health: "degraded",
      storage_usage_mb: null,
      upload_failures_24h: null,
      failed_jobs_24h: null,
      open_warning_alerts: 0,
      open_critical_alerts: 0,
      failed_logins_24h: 0,
    },
    logs_summary: {
      audit_events_24h: 0,
      audit_failures_24h: 0,
      latest_backup_at: null,
      latest_alert_at: null,
    },
    warnings: [],
    cleanup_recommendations: [],
    checked_at: new Date().toISOString(),
  };
}

export function SystemHealthCenterPanel() {
  const { reportError, pushToast } = usePortal();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot>(() => emptySnapshot());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSystemHealthSnapshot();
      setSnapshot(data);
    } catch (e) {
      reportError(e, "System Health Center");
      setSnapshot(emptySnapshot());
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
    const onReload = () => void load();
    window.addEventListener("kmt-portal-reload-metrics", onReload);
    return () => window.removeEventListener("kmt-portal-reload-metrics", onReload);
  }, [load]);

  const healthCards = useMemo(
    () => [
      { title: "Database", value: snapshot.indicators.database_connection, badge: snapshot.badges.database, icon: Database },
      { title: "Supabase Health", value: snapshot.indicators.supabase_health, badge: snapshot.badges.database, icon: ServerCog },
      { title: "Realtime Sync", value: snapshot.indicators.realtime_sync, badge: snapshot.badges.realtime, icon: Activity },
      {
        title: "Storage Usage",
        value: snapshot.indicators.storage_usage_mb == null ? "Haijapatikana" : `${snapshot.indicators.storage_usage_mb.toFixed(2)} MB`,
        badge: snapshot.badges.storage,
        icon: HardDrive,
      },
      {
        title: "Upload Failures (24h)",
        value: snapshot.indicators.upload_failures_24h ?? "Haijapatikana",
        badge: snapshot.badges.uploads,
        icon: AlertTriangle,
      },
      {
        title: "Failed Jobs (24h)",
        value: snapshot.indicators.failed_jobs_24h ?? "Haijapatikana",
        badge: snapshot.badges.jobs,
        icon: AlertTriangle,
      },
    ],
    [snapshot]
  );

  const reportHeaders = useMemo(() => ["Kipimo", "Thamani", "Badge/Hali"], []);
  const reportRows = useMemo<(string | number)[][]>(
    () => [
      ["Database Connection", snapshot.indicators.database_connection, snapshot.badges.database],
      ["Supabase Health", snapshot.indicators.supabase_health, snapshot.badges.database],
      ["Realtime Sync", snapshot.indicators.realtime_sync, snapshot.badges.realtime],
      ["Storage Usage (MB)", snapshot.indicators.storage_usage_mb ?? "Haijapatikana", snapshot.badges.storage],
      ["Upload Failures (24h)", snapshot.indicators.upload_failures_24h ?? "Haijapatikana", snapshot.badges.uploads],
      ["Failed Jobs (24h)", snapshot.indicators.failed_jobs_24h ?? "Haijapatikana", snapshot.badges.jobs],
      ["Open Warning Alerts", snapshot.indicators.open_warning_alerts, "warning"],
      ["Open Critical Alerts", snapshot.indicators.open_critical_alerts, "critical"],
      ["Failed Logins (24h)", snapshot.indicators.failed_logins_24h, "warning"],
      ["Audit Events (24h)", snapshot.logs_summary.audit_events_24h, "info"],
      ["Audit Failures (24h)", snapshot.logs_summary.audit_failures_24h, "warning"],
      ["Backup Last Seen", snapshot.logs_summary.latest_backup_at ?? "Haijapatikana", snapshot.badges.backups],
      ["Checked At", snapshot.checked_at, "info"],
    ],
    [snapshot]
  );

  const onExportExcel = useCallback(async () => {
    try {
      await exportRowsToExcel("KMKT_System_Health_Report", reportHeaders, reportRows);
      pushToast("Excel report imeandaliwa.", "success");
    } catch (e) {
      reportError(e, "System Health Export Excel");
    }
  }, [reportHeaders, reportRows, pushToast, reportError]);

  const onExportPdf = useCallback(async () => {
    try {
      await exportTableToPdf("SYSTEM HEALTH REPORT", "KMKT_System_Health_Report", reportHeaders, reportRows);
      pushToast("PDF report imeandaliwa.", "success");
    } catch (e) {
      reportError(e, "System Health Export PDF");
    }
  }, [reportHeaders, reportRows, pushToast, reportError]);

  const onPrint = useCallback(() => {
    openPrintableTable("SYSTEM HEALTH REPORT", reportHeaders, reportRows);
  }, [reportHeaders, reportRows]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#1e3a6e]/30 bg-gradient-to-r from-[#0B1F3A] via-[#123C69] to-[#0B1F3A] p-5 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">STEP 20</p>
            <h2 className="text-2xl font-bold">Backup, Storage & System Health Center</h2>
            <p className="mt-1 text-sm text-blue-100">Storage usage, jobs, notifications, realtime sync, backup na health indicators.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void onExportPdf()}
              className="rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/20"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => void onExportExcel()}
              className="rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/20"
            >
              Export Excel
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/20"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Inasasisha..." : "Refresh Health"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {healthCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{card.title}</p>
                <Icon className="h-4 w-4 text-[#0B1F3A]" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#0B1F3A]">{String(card.value)}</p>
              <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass(card.badge)}`}>
                {card.badge}
              </span>
            </article>
          );
        })}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-bold text-amber-900">Warning Alerts</h3>
          <p className="mt-2 text-sm text-amber-900">Warning: {snapshot.indicators.open_warning_alerts} · Critical: {snapshot.indicators.open_critical_alerts}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {snapshot.warnings.length === 0 ? <li>Hakuna warning mpya kwa sasa.</li> : snapshot.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-[#0B1F3A]">Logs Summary</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>Audit events (24h): {snapshot.logs_summary.audit_events_24h}</li>
            <li>Audit failures (24h): {snapshot.logs_summary.audit_failures_24h}</li>
            <li>Failed logins (24h): {snapshot.indicators.failed_logins_24h}</li>
            <li>Backup last seen: {snapshot.logs_summary.latest_backup_at ?? "Haijapatikana"}</li>
            <li>Checked at: {snapshot.checked_at}</li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="text-sm font-bold text-emerald-900">Cleanup Recommendations</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
          {snapshot.cleanup_recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

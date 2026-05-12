import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Database, HardDrive, RefreshCw, ServerCog } from "lucide-react";
import type { HealthBadgeStatus, SystemHealthSnapshot } from "../../types";
import { fetchSystemHealthSnapshot } from "../../services/systemHealthService";
import { usePortal } from "../../context/PortalContext";
import { exportTableToPdf, openPrintableTable } from "../../lib/exportHelpers";
import { KMT_PORTAL_RELOAD_METRICS_EVENT } from "../../lib/portalEvents";
import { resolveSystemAlert } from "../../services/alertsService";
import { HAIJAPATIKANA_DATA_SW } from "../../lib/supabaseUiMessages";

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
    storage: { read_allowed: false, read_note: null, bucket_file_counts: {}, total_files: 0 },
    notifications: {
      total: 0,
      unread: 0,
      failed: 0,
      last_notification_at: null,
      realtime_channel_status: "offline",
      empty: true,
    },
    backups: {
      auto_backup_enabled: false,
      provider_status: "unknown",
      restore_verification_status: "unknown",
      backup_frequency: null,
      retention_period: null,
      configured: false,
    },
    alert_details: [],
    audit_failure_details: [],
    warnings: [],
    cleanup_recommendations: [],
    checked_at: new Date().toISOString(),
  };
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return HAIJAPATIKANA_DATA_SW;
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return String(v);
  return new Date(t).toLocaleString("sw-TZ");
}

function navigateModule(moduleKey: string, submodule?: string) {
  window.dispatchEvent(new CustomEvent("kmt-portal-navigate", { detail: { moduleKey, submodule } }));
}

export function SystemHealthCenterPanel() {
  const { reportError, pushToast, role, canPortalViewModule } = usePortal();
  const [loading, setLoading] = useState(true);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot>(() => emptySnapshot());
  const canView = canPortalViewModule("super_admin");
  const canResolve = role === "super_admin" || role === "chief_admin";
  const canReadOnly = canView || canPortalViewModule("usalama");

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
    window.addEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onReload);
    return () => window.removeEventListener(KMT_PORTAL_RELOAD_METRICS_EVENT, onReload);
  }, [load]);

  const healthCards = useMemo(
    () => [
      { title: "Database", value: snapshot.indicators.database_connection, badge: snapshot.badges.database, icon: Database },
      { title: "Supabase Health", value: snapshot.indicators.supabase_health, badge: snapshot.badges.database, icon: ServerCog },
      { title: "Realtime Sync", value: snapshot.indicators.realtime_sync, badge: snapshot.badges.realtime, icon: Activity },
      {
        title: "Storage Usage",
        value:
          snapshot.indicators.storage_usage_mb == null
            ? snapshot.storage.read_note || "Storage usage haijaruhusiwa kusomwa kutoka frontend."
            : `${snapshot.indicators.storage_usage_mb.toFixed(2)} MB`,
        badge: snapshot.badges.storage,
        icon: HardDrive,
      },
      {
        title: "Upload Failures (24h)",
        value: snapshot.indicators.upload_failures_24h ?? HAIJAPATIKANA_DATA_SW,
        badge: snapshot.badges.uploads,
        icon: AlertTriangle,
      },
      {
        title: "Failed Jobs (24h)",
        value: snapshot.indicators.failed_jobs_24h ?? HAIJAPATIKANA_DATA_SW,
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
      ["Storage Usage (MB)", snapshot.indicators.storage_usage_mb ?? HAIJAPATIKANA_DATA_SW, snapshot.badges.storage],
      ["Upload Failures (24h)", snapshot.indicators.upload_failures_24h ?? HAIJAPATIKANA_DATA_SW, snapshot.badges.uploads],
      ["Failed Jobs (24h)", snapshot.indicators.failed_jobs_24h ?? HAIJAPATIKANA_DATA_SW, snapshot.badges.jobs],
      ["Open Warning Alerts", snapshot.indicators.open_warning_alerts, "warning"],
      ["Open Critical Alerts", snapshot.indicators.open_critical_alerts, "critical"],
      ["Failed Logins (24h)", snapshot.indicators.failed_logins_24h, "warning"],
      ["Audit Events (24h)", snapshot.logs_summary.audit_events_24h, "info"],
      ["Audit Failures (24h)", snapshot.logs_summary.audit_failures_24h, "warning"],
      ["Backup Last Seen", snapshot.logs_summary.latest_backup_at ?? HAIJAPATIKANA_DATA_SW, snapshot.badges.backups],
      ["Checked At", snapshot.checked_at, "info"],
    ],
    [snapshot]
  );

  const onExportExcel = useCallback(async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.aoa_to_sheet([reportHeaders, ...reportRows]);
      summarySheet["!cols"] = [{ wch: 34 }, { wch: 42 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

      const alertSheetRows = [
        ["title", "type", "module", "priority", "status", "created_at", "message"],
        ...snapshot.alert_details.map((a) => [a.title, a.type, a.module, a.priority, a.status, fmtDate(a.created_at), a.message]),
      ];
      const alertSheet = XLSX.utils.aoa_to_sheet(alertSheetRows);
      alertSheet["!cols"] = [{ wch: 34 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 24 }, { wch: 48 }];
      XLSX.utils.book_append_sheet(wb, alertSheet, "Alerts");

      const auditSheetRows = [
        ["time", "module", "action", "status", "message"],
        ...snapshot.audit_failure_details.map((a) => [fmtDate(a.time), a.module, a.action, a.status, a.message]),
      ];
      const auditSheet = XLSX.utils.aoa_to_sheet(auditSheetRows);
      auditSheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, auditSheet, "Audit Failures");

      const backupSheetRows = [
        ["kipimo", "thamani"],
        ["Auto backup", snapshot.backups.auto_backup_enabled ? "Enabled" : "Disabled"],
        ["Last backup", fmtDate(snapshot.logs_summary.latest_backup_at)],
        ["Provider/status", snapshot.backups.provider_status],
        ["Restore verification", snapshot.backups.restore_verification_status],
        ["Frequency", snapshot.backups.backup_frequency ?? "-"],
        ["Retention", snapshot.backups.retention_period ?? "-"],
      ];
      const backupSheet = XLSX.utils.aoa_to_sheet(backupSheetRows);
      backupSheet["!cols"] = [{ wch: 28 }, { wch: 42 }];
      XLSX.utils.book_append_sheet(wb, backupSheet, "Backup");

      XLSX.writeFile(wb, "KMKT_System_Health_Report.xlsx");
      pushToast("Excel report imeandaliwa.", "success");
    } catch (e) {
      reportError(e, "System Health Export Excel");
    }
  }, [reportHeaders, reportRows, pushToast, reportError, snapshot]);

  const onExportPdf = useCallback(async () => {
    try {
      const rows: (string | number)[][] = [
        ...reportRows,
        ["", "", ""],
        ["OPEN ALERTS", "", ""],
        ...snapshot.alert_details.map((a) => [`[${a.priority}] ${a.title}`, `${a.module} · ${fmtDate(a.created_at)}`, a.status]),
      ];
      await exportTableToPdf("RIPOTI YA SYSTEM HEALTH", "KMKT_System_Health_Report", reportHeaders, rows, {
        subtitle: "KMK(T) Enterprise Health Report",
      });
      pushToast("PDF report imeandaliwa.", "success");
    } catch (e) {
      reportError(e, "System Health Export PDF");
    }
  }, [reportHeaders, reportRows, pushToast, reportError, snapshot.alert_details]);

  const onPrint = useCallback(() => {
    openPrintableTable("RIPOTI YA SYSTEM HEALTH", reportHeaders, reportRows, {
      subtitle: "KMK(T) Enterprise Health Report",
    });
  }, [reportHeaders, reportRows]);

  const onResolveAlert = useCallback(
    async (id: string) => {
      if (!canResolve) {
        pushToast("Huna ruhusa ya kutatua alert.", "error");
        return;
      }
      setResolvingAlertId(id);
      try {
        await resolveSystemAlert(id);
        pushToast("Alert imetatuliwa.", "success");
        await load();
      } catch (e) {
        reportError(e, "Resolve system alert");
      } finally {
        setResolvingAlertId(null);
      }
    },
    [canResolve, load, pushToast, reportError]
  );

  if (!canReadOnly) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        Huna ruhusa ya kuona System Health.
      </div>
    );
  }

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
        <p className="mt-3 text-xs text-blue-100">Last checked at: {fmtDate(snapshot.checked_at)}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {healthCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex min-h-[132px] flex-col items-center justify-center text-center">
                <Icon className="h-4 w-4 text-[#0B1F3A]" />
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-600">{card.title}</p>
                <p className="mt-2 text-center text-xl font-bold text-[#0B1F3A]">{String(card.value)}</p>
                <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass(card.badge)}`}>
                  {card.badge}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-bold text-amber-900">Warning Alerts</h3>
          <p className="mt-2 text-sm text-amber-900">Warning: {snapshot.indicators.open_warning_alerts} · Critical: {snapshot.indicators.open_critical_alerts}</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-amber-200 bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-amber-100 text-amber-900">
                <tr>
                  <th className="px-2 py-2 text-left">Title</th>
                  <th className="px-2 py-2 text-left">Type</th>
                  <th className="px-2 py-2 text-left">Module</th>
                  <th className="px-2 py-2 text-left">Priority</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Created At</th>
                  <th className="px-2 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.alert_details.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-3 text-slate-600">
                      Hakuna warning/critical alerts zilizo wazi.
                    </td>
                  </tr>
                ) : (
                  snapshot.alert_details.map((a) => (
                    <tr key={a.id} className="border-t border-amber-100">
                      <td className="px-2 py-2 font-medium text-slate-800">{a.title}</td>
                      <td className="px-2 py-2 text-slate-700">{a.type}</td>
                      <td className="px-2 py-2 text-slate-700">{a.module}</td>
                      <td className="px-2 py-2 text-slate-700">{a.priority}</td>
                      <td className="px-2 py-2 text-slate-700">{a.status}</td>
                      <td className="px-2 py-2 text-slate-700">{fmtDate(a.created_at)}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAlertId((p) => (p === a.id ? null : a.id))}
                            className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            disabled={!canResolve || resolvingAlertId === a.id}
                            onClick={() => void onResolveAlert(a.id)}
                            className="rounded border border-emerald-300 px-2 py-1 text-[11px] text-emerald-800 disabled:opacity-50"
                            title={!canResolve ? "Chief Admin/Super Admin pekee" : ""}
                          >
                            {resolvingAlertId === a.id ? "Inatatua..." : "Mark Resolved"}
                          </button>
                        </div>
                        {selectedAlertId === a.id ? <p className="mt-1 text-[11px] text-slate-700">{a.message}</p> : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-[#0B1F3A]">Logs Summary</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>Audit events (24h): {snapshot.logs_summary.audit_events_24h}</li>
            <li>Audit failures (24h): {snapshot.logs_summary.audit_failures_24h}</li>
            <li>Failed logins (24h): {snapshot.indicators.failed_logins_24h}</li>
            <li>Backup last seen: {fmtDate(snapshot.logs_summary.latest_backup_at)}</li>
            <li>Checked at: {fmtDate(snapshot.checked_at)}</li>
          </ul>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-2 py-2 text-left">Time</th>
                  <th className="px-2 py-2 text-left">Module</th>
                  <th className="px-2 py-2 text-left">Action</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Message</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.audit_failure_details.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-slate-600">
                      Hakuna audit failures za hivi karibuni.
                    </td>
                  </tr>
                ) : (
                  snapshot.audit_failure_details.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-2 py-2">{fmtDate(a.time)}</td>
                      <td className="px-2 py-2">{a.module}</td>
                      <td className="px-2 py-2">{a.action}</td>
                      <td className="px-2 py-2">{a.status}</td>
                      <td className="px-2 py-2">{a.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
            onClick={() => navigateModule("usalama", "Audit Logs")}
          >
            Fungua Audit Module
          </button>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-center text-sm font-bold text-[#0B1F3A]">Notification Health</h3>
          {snapshot.notifications.empty ? (
            <p className="mt-2 text-center text-sm text-slate-600">Hakuna arifa bado.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-center text-sm text-slate-700">
              <li>Total notifications: {snapshot.notifications.total}</li>
              <li>Unread notifications: {snapshot.notifications.unread}</li>
              <li>Failed notifications: {snapshot.notifications.failed}</li>
              <li>Last notification: {fmtDate(snapshot.notifications.last_notification_at)}</li>
              <li>Realtime channel: {snapshot.notifications.realtime_channel_status}</li>
            </ul>
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-center text-sm font-bold text-[#0B1F3A]">Backup Health</h3>
          <ul className="mt-2 space-y-1 text-center text-sm text-slate-700">
            <li>Auto backup: {snapshot.backups.auto_backup_enabled ? "Enabled" : "Disabled"}</li>
            <li>Last backup: {fmtDate(snapshot.logs_summary.latest_backup_at)}</li>
            <li>Provider/status: {snapshot.backups.provider_status}</li>
            <li>Restore verification: {snapshot.backups.restore_verification_status}</li>
            <li>Frequency: {snapshot.backups.backup_frequency ?? "-"}</li>
          </ul>
          {!snapshot.backups.configured ? <p className="mt-2 text-center text-xs text-amber-700">Backup automation bado haijasanidiwa.</p> : null}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-center text-sm font-bold text-[#0B1F3A]">Storage Details</h3>
          {!snapshot.storage.read_allowed ? (
            <p className="mt-2 text-center text-sm text-slate-600">{snapshot.storage.read_note || "Storage usage haijaruhusiwa kusomwa kutoka frontend."}</p>
          ) : (
            <>
              <p className="mt-2 text-center text-sm text-slate-700">Total files: {snapshot.storage.total_files}</p>
              <ul className="mt-2 space-y-1 text-center text-sm text-slate-700">
                {Object.entries(snapshot.storage.bucket_file_counts).map(([bucket, count]) => (
                  <li key={bucket}>
                    {bucket}: {count}
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="text-sm font-bold text-emerald-900">Cleanup Recommendations</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Open Alerts", action: () => navigateModule("super_admin", "System Health"), enabled: canReadOnly },
            { label: "Open Audit Logs", action: () => navigateModule("usalama", "Audit Logs"), enabled: canPortalViewModule("usalama") },
            { label: "Open Backup Settings", action: () => navigateModule("mipangilio", "Advanced"), enabled: canPortalViewModule("mipangilio") },
            { label: "Open Storage", action: () => navigateModule("super_admin", "System Health"), enabled: canReadOnly },
          ].map((x) => (
            <button
              key={x.label}
              type="button"
              onClick={x.action}
              disabled={!x.enabled}
              title={!x.enabled ? "Kipengele hiki kinaandaliwa." : ""}
              className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-left text-xs text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {x.label}
            </button>
          ))}
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-emerald-900">
          {snapshot.cleanup_recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

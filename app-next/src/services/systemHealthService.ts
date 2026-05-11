import { getSupabase } from "../lib/supabaseClient";
import type { SystemHealthSnapshot } from "../types";
import { fetchBackupSettings } from "./extendedSettingsService";

function dayMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

function toIsoDaysAgo(days: number): string {
  return new Date(Date.now() - dayMs(days)).toISOString();
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function countStatusLabel(value: number, warnAt: number, critAt: number): "healthy" | "warning" | "critical" {
  if (value >= critAt) return "critical";
  if (value >= warnAt) return "warning";
  return "healthy";
}

export async function fetchSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
  const c = getSupabase();
  const base: SystemHealthSnapshot = {
    badges: {
      database: "critical",
      notifications: "warning",
      uploads: "warning",
      backups: "warning",
      realtime: "warning",
      jobs: "warning",
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
    storage: {
      read_allowed: false,
      read_note: null,
      bucket_file_counts: {},
      total_files: 0,
    },
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
    cleanup_recommendations: [],
    warnings: [],
    checked_at: new Date().toISOString(),
  };
  if (!c) {
    base.warnings.push("Supabase haijasanidiwa.");
    base.cleanup_recommendations.push("Kagua .env.local na uhakikishe VITE_SUPABASE_* zipo sahihi.");
    return base;
  }

  const since24h = toIsoDaysAgo(1);
  const since7d = toIsoDaysAgo(7);

  const [
    pingRes,
    alertsWarnRes,
    alertsCritRes,
    failedLoginsRes,
    uploadFailRes,
    commFailedRes,
    notifRecentRes,
    notifUnreadRes,
    audit24hRes,
    auditFailRes,
    auditFailRowsRes,
    alertRowsRes,
    storageSumRes,
  ] = await Promise.allSettled([
    c.from("news_posts").select("id", { count: "exact", head: true }),
    c.from("system_alerts").select("id", { count: "exact", head: true }).eq("status", "open").eq("priority", "warning"),
    c.from("system_alerts").select("id", { count: "exact", head: true }).eq("status", "open").eq("priority", "critical"),
    c
      .from("portal_access_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "login")
      .gte("created_at", since24h)
      .or("detail->>status.eq.failed,detail->>result.eq.failed"),
    c
      .from("portal_access_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h)
      .or("detail->>upload_status.eq.failed,detail->>status.eq.failed")
      .or("event_type.eq.api,event_type.eq.page_view"),
    c.from("communications").select("id", { count: "exact", head: true }).eq("status", "failed").gte("updated_at", since24h),
    c.from("notifications").select("id,created_at").gte("created_at", since7d).order("created_at", { ascending: false }).limit(500),
    c.from("notifications").select("id", { count: "exact", head: true }).eq("read_status", false),
    c.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", since24h),
    c.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", since24h).neq("status", "success"),
    c
      .from("audit_logs")
      .select("id,module,action,status,message,created_at")
      .gte("created_at", since7d)
      .neq("status", "success")
      .order("created_at", { ascending: false })
      .limit(20),
    c
      .from("system_alerts")
      .select("id,title,type,module,priority,status,message,created_at")
      .eq("status", "open")
      .in("priority", ["warning", "critical"])
      .order("created_at", { ascending: false })
      .limit(30),
    c
      .schema("storage")
      .from("objects")
      .select("bucket_id,metadata")
      .in("bucket_id", ["church-files", "church-images", "church-media", "site-assets"])
      .limit(5000),
  ]);

  if (pingRes.status === "fulfilled" && !pingRes.value.error) {
    base.indicators.database_connection = "online";
    base.indicators.supabase_health = "healthy";
    base.badges.database = "healthy";
    base.badges.realtime = "healthy";
    base.indicators.realtime_sync = "online";
  } else {
    base.warnings.push("Imeshindikana kuthibitisha database connection.");
  }

  if (alertsWarnRes.status === "fulfilled" && !alertsWarnRes.value.error) {
    base.indicators.open_warning_alerts = alertsWarnRes.value.count ?? 0;
  }
  if (alertsCritRes.status === "fulfilled" && !alertsCritRes.value.error) {
    base.indicators.open_critical_alerts = alertsCritRes.value.count ?? 0;
  }

  if (failedLoginsRes.status === "fulfilled" && !failedLoginsRes.value.error) {
    base.indicators.failed_logins_24h = failedLoginsRes.value.count ?? 0;
  }
  if (uploadFailRes.status === "fulfilled" && !uploadFailRes.value.error) {
    base.indicators.upload_failures_24h = uploadFailRes.value.count ?? 0;
  }
  if (commFailedRes.status === "fulfilled" && !commFailedRes.value.error) {
    base.indicators.failed_jobs_24h = commFailedRes.value.count ?? 0;
  }

  if (notifRecentRes.status === "fulfilled" && !notifRecentRes.value.error) {
    const notes = notifRecentRes.value.data ?? [];
    base.notifications.total = notes.length;
    base.notifications.empty = notes.length === 0;
    const lastAt = notes.length > 0 ? String((notes[0] as { created_at?: string }).created_at ?? "") : "";
    base.notifications.last_notification_at = lastAt || null;
    const ageMs = lastAt ? Date.now() - Date.parse(lastAt) : Number.POSITIVE_INFINITY;
    base.indicators.notification_health = ageMs <= dayMs(2) ? "healthy" : ageMs <= dayMs(7) ? "degraded" : "down";
    base.badges.notifications = base.indicators.notification_health === "healthy" ? "healthy" : "warning";
    base.notifications.realtime_channel_status =
      base.indicators.notification_health === "healthy"
        ? "online"
        : base.indicators.notification_health === "degraded"
        ? "degraded"
        : "offline";
    if (!base.notifications.empty && base.indicators.notification_health !== "healthy") {
      base.warnings.push("Notification health iko chini ya kiwango kinachotarajiwa.");
    }
  } else {
    base.notifications.realtime_channel_status = "offline";
  }
  if (notifUnreadRes.status === "fulfilled" && !notifUnreadRes.value.error) {
    base.notifications.unread = notifUnreadRes.value.count ?? 0;
  }
  if (commFailedRes.status === "fulfilled" && !commFailedRes.value.error) {
    base.notifications.failed = commFailedRes.value.count ?? 0;
  }

  if (audit24hRes.status === "fulfilled" && !audit24hRes.value.error) {
    base.logs_summary.audit_events_24h = audit24hRes.value.count ?? 0;
  }
  if (auditFailRes.status === "fulfilled" && !auditFailRes.value.error) {
    base.logs_summary.audit_failures_24h = auditFailRes.value.count ?? 0;
  }

  if (storageSumRes.status === "fulfilled" && !storageSumRes.value.error) {
    const rows = storageSumRes.value.data ?? [];
    const byBucket: Record<string, number> = {};
    const bytes = rows.reduce((sum, row) => {
      const bucket = String((row as { bucket_id?: unknown }).bucket_id ?? "unknown");
      byBucket[bucket] = (byBucket[bucket] || 0) + 1;
      const meta = (row as { metadata?: Record<string, unknown> }).metadata ?? {};
      return sum + safeNum(meta.size);
    }, 0);
    base.storage.bucket_file_counts = byBucket;
    base.storage.total_files = rows.length;
    base.storage.read_allowed = true;
    base.indicators.storage_usage_mb = Math.round((bytes / (1024 * 1024)) * 100) / 100;
    base.badges.storage = base.indicators.storage_usage_mb >= 2048 ? "critical" : base.indicators.storage_usage_mb >= 1024 ? "warning" : "healthy";
  } else {
    base.storage.read_allowed = false;
    base.storage.read_note = "Storage usage haijaruhusiwa kusomwa kutoka frontend.";
    base.warnings.push("Storage usage haijaruhusiwa kusomwa kutoka frontend.");
  }

  try {
    const backup = await fetchBackupSettings();
    const lastBackupAt = backup?.created_at ? String(backup.created_at) : null;
    base.logs_summary.latest_backup_at = lastBackupAt;
    base.backups.configured = Boolean(backup);
    base.backups.auto_backup_enabled = backup?.auto_backup_toggle === "on";
    base.backups.backup_frequency = backup?.backup_frequency ?? null;
    base.backups.retention_period = backup?.retention_period ?? null;
    base.backups.provider_status = backup?.storage_location?.trim() ? backup.storage_location.trim() : "unknown";
    base.backups.restore_verification_status = backup?.restore_confirmation_toggle === "on" ? "verified" : "pending";
    if (backup?.auto_backup_toggle === "on") {
      if (!lastBackupAt) {
        base.indicators.backup_status = "stale";
        base.badges.backups = "warning";
      } else {
        const age = Date.now() - Date.parse(lastBackupAt);
        base.indicators.backup_status = age <= dayMs(7) ? "healthy" : "stale";
        base.badges.backups = age <= dayMs(7) ? "healthy" : "warning";
      }
    } else {
      base.indicators.backup_status = "stale";
      base.badges.backups = "critical";
      base.warnings.push("Backup automation bado haijasanidiwa.");
    }
  } catch {
    base.warnings.push("Backup status haikupatikana.");
  }

  if (alertRowsRes.status === "fulfilled" && !alertRowsRes.value.error) {
    const rows = alertRowsRes.value.data ?? [];
    base.alert_details = rows.map((r) => ({
      id: String((r as { id?: unknown }).id ?? ""),
      title: String((r as { title?: unknown }).title ?? ""),
      type: String((r as { type?: unknown }).type ?? ""),
      module: String((r as { module?: unknown }).module ?? ""),
      priority: (String((r as { priority?: unknown }).priority ?? "warning") as "warning" | "critical" | "info" | "success"),
      status: (String((r as { status?: unknown }).status ?? "open") === "resolved" ? "resolved" : "open") as "open" | "resolved",
      created_at: String((r as { created_at?: unknown }).created_at ?? ""),
      message: String((r as { message?: unknown }).message ?? ""),
    }));
  }

  if (auditFailRowsRes.status === "fulfilled" && !auditFailRowsRes.value.error) {
    const rows = auditFailRowsRes.value.data ?? [];
    base.audit_failure_details = rows.map((r) => ({
      id: String((r as { id?: unknown }).id ?? ""),
      time: String((r as { created_at?: unknown }).created_at ?? ""),
      module: String((r as { module?: unknown }).module ?? "-"),
      action: String((r as { action?: unknown }).action ?? "-"),
      status: String((r as { status?: unknown }).status ?? "failed"),
      message: String((r as { message?: unknown }).message ?? ""),
    }));
  }

  base.badges.uploads = countStatusLabel(base.indicators.upload_failures_24h ?? 0, 3, 8);
  base.badges.jobs = countStatusLabel(base.indicators.failed_jobs_24h ?? 0, 5, 12);

  if ((base.indicators.failed_logins_24h ?? 0) > 10) {
    base.warnings.push("Failed logins zimezidi kiwango salama ndani ya saa 24.");
    base.cleanup_recommendations.push("Kaza lockout policy na hakiki suspicious IP/account kwenye audit logs.");
  }
  if ((base.indicators.upload_failures_24h ?? 0) > 5) {
    base.cleanup_recommendations.push("Kagua upload limits/MIME rules na bucket policies kwa faili zinazofeli.");
  }
  if ((base.indicators.failed_jobs_24h ?? 0) > 5) {
    base.cleanup_recommendations.push("Kagua communications queue, retry settings, na Edge Function delivery logs.");
  }
  if ((base.indicators.storage_usage_mb ?? 0) > 1024) {
    base.cleanup_recommendations.push("Fanya cleanup ya media ya zamani, optimize thumbnails, na archive kubwa zisizotumika.");
  }
  if (base.indicators.open_critical_alerts > 0) {
    base.cleanup_recommendations.push("Funga critical alerts zilizo wazi kabla ya deployment inayofuata.");
  }
  if (!base.backups.auto_backup_enabled) {
    base.cleanup_recommendations.push("Open Backup Settings: Wezesha auto backup na uthibitishe restore.");
  }
  if (base.logs_summary.audit_failures_24h > 0) {
    base.cleanup_recommendations.push("Open Audit Logs: Chunguza audit failures za hivi karibuni.");
  }
  if (base.indicators.open_warning_alerts + base.indicators.open_critical_alerts > 0) {
    base.cleanup_recommendations.push("Open Alerts: Tatua alerts zilizo wazi.");
  }
  if (!base.storage.read_allowed) {
    base.cleanup_recommendations.push("Open Storage: Kagua ruhusa za storage.objects kwa metrics za matumizi.");
  }
  if (base.cleanup_recommendations.length === 0) {
    base.cleanup_recommendations.push("Hali ni nzuri; endelea na weekly audit + backup verification.");
  }

  return base;
}

import { formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import type { SystemAlertRow } from "../types";

let warnedMissingSystemAlertsTable = false;
let systemAlertsTableMissing = false;

function warnSystemAlertsMissingOnce(context: string): void {
  if (warnedMissingSystemAlertsTable) return;
  warnedMissingSystemAlertsTable = true;
  console.warn(
    `[${context}] Jedwali public.system_alerts halipo kwenye schema hii. Arifa za mfumo zitazimwa kwa muda hadi migration ikamilike.`
  );
}

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function toAlertRow(r: Record<string, unknown>): SystemAlertRow {
  return {
    id: String(r.id ?? ""),
    type: String(r.type ?? "system"),
    module: String(r.module ?? "dashboard"),
    title: String(r.title ?? ""),
    message: String(r.message ?? ""),
    priority: (["info", "success", "warning", "critical"].includes(String(r.priority)) ? String(r.priority) : "warning") as SystemAlertRow["priority"],
    target_role: r.target_role == null ? null : String(r.target_role),
    target_user_id: r.target_user_id == null ? null : String(r.target_user_id),
    action_url: r.action_url == null ? null : String(r.action_url),
    status: String(r.status ?? "open") === "resolved" ? "resolved" : "open",
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export async function fetchSystemAlerts(status: "open" | "resolved" | "all" = "open"): Promise<SystemAlertRow[]> {
  if (systemAlertsTableMissing) return [];
  const c = clientOrThrow();
  let q = c.from("system_alerts").select("*").order("created_at", { ascending: false }).limit(120);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) {
    if (isMissingTableError(error)) {
      systemAlertsTableMissing = true;
      warnSystemAlertsMissingOnce("system_alerts");
      return [];
    }
    console.warn(formatPostgrestError(error, "system_alerts"));
    return [];
  }
  return (data ?? []).map((r) => toAlertRow(r as Record<string, unknown>));
}

export async function resolveSystemAlert(alertId: string): Promise<void> {
  if (systemAlertsTableMissing) return;
  const c = clientOrThrow();
  const { error } = await c.from("system_alerts").update({ status: "resolved", updated_at: new Date().toISOString() }).eq("id", alertId);
  if (error) {
    if (isMissingTableError(error)) {
      systemAlertsTableMissing = true;
      warnSystemAlertsMissingOnce("system_alerts.resolve");
      return;
    }
    throw new Error(formatPostgrestError(error, "system_alerts.resolve"));
  }
}

export interface SmartAlertInput {
  type: string;
  module: string;
  title: string;
  message: string;
  priority: "info" | "success" | "warning" | "critical";
  action_url?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Sync open smart alerts: create/update desired, resolve stale managed alerts. */
export async function syncSmartAlerts(desired: SmartAlertInput[]): Promise<void> {
  if (systemAlertsTableMissing) return;
  const c = clientOrThrow();
  const managedType = "auto_rule";
  const wantedKeys = new Set(desired.map((d) => `${d.type}::${d.module}::${d.title}`));

  const { data: existing, error: e0 } = await c
    .from("system_alerts")
    .select("*")
    .eq("status", "open")
    .like("type", `${managedType}%`)
    .limit(200);
  if (e0) {
    if (isMissingTableError(e0)) {
      systemAlertsTableMissing = true;
      warnSystemAlertsMissingOnce("system_alerts.sync.fetch");
      return;
    }
    console.warn(formatPostgrestError(e0, "system_alerts.sync.fetch"));
    return;
  }

  const existingByKey = new Map<string, Record<string, unknown>>();
  for (const row of existing ?? []) {
    const r = row as Record<string, unknown>;
    const key = `${String(r.type ?? "")}::${String(r.module ?? "")}::${String(r.title ?? "")}`;
    existingByKey.set(key, r);
  }

  for (const d of desired) {
    const key = `${d.type}::${d.module}::${d.title}`;
    const current = existingByKey.get(key);
    if (!current) {
      const { error } = await c.from("system_alerts").insert({
        type: d.type,
        module: d.module,
        title: d.title,
        message: d.message,
        priority: d.priority,
        status: "open",
        action_url: d.action_url ?? null,
        metadata: d.metadata ?? null,
      });
      if (error) {
        if (isMissingTableError(error)) {
          systemAlertsTableMissing = true;
          warnSystemAlertsMissingOnce("system_alerts.sync.insert");
          return;
        }
        throw new Error(formatPostgrestError(error, "system_alerts.sync.insert"));
      }
      continue;
    }
    const needsUpdate =
      String(current.message ?? "") !== d.message ||
      String(current.priority ?? "") !== d.priority ||
      String(current.action_url ?? "") !== String(d.action_url ?? "") ||
      JSON.stringify(current.metadata ?? null) !== JSON.stringify(d.metadata ?? null);
    if (needsUpdate) {
      const { error } = await c
        .from("system_alerts")
        .update({
          message: d.message,
          priority: d.priority,
          action_url: d.action_url ?? null,
          metadata: d.metadata ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(current.id ?? ""));
      if (error) {
        if (isMissingTableError(error)) {
          systemAlertsTableMissing = true;
          warnSystemAlertsMissingOnce("system_alerts.sync.update");
          return;
        }
        throw new Error(formatPostgrestError(error, "system_alerts.sync.update"));
      }
    }
  }

  for (const row of existing ?? []) {
    const r = row as Record<string, unknown>;
    const key = `${String(r.type ?? "")}::${String(r.module ?? "")}::${String(r.title ?? "")}`;
    if (wantedKeys.has(key)) continue;
    const { error } = await c
      .from("system_alerts")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("id", String(r.id ?? ""));
    if (error) {
      if (isMissingTableError(error)) {
        systemAlertsTableMissing = true;
        warnSystemAlertsMissingOnce("system_alerts.sync.resolve");
        return;
      }
      throw new Error(formatPostgrestError(error, "system_alerts.sync.resolve"));
    }
  }
}

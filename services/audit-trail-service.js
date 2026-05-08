import { getSafeSupabase, safeAsync } from "../phase-integration-core.js";

const TABLE = "audit_logs";
const localAuditRows = [];

const nowIso = () => new Date().toISOString();

export async function writeAuditLog(entry) {
  const row = {
    timestamp: nowIso(),
    user: entry.user || "SYSTEM",
    role: entry.role || "SYSTEM",
    module: entry.module || "general",
    action: entry.action || "unknown_action",
    record: entry.record || "-",
    status: entry.status || "success",
    device: entry.device || "Web",
    location_placeholder: entry.location_placeholder || "N/A",
    payload: entry.payload || {},
  };

  localAuditRows.unshift({ id: Date.now(), ...row });
  if (!getSafeSupabase()) return;

  await safeAsync(
    "audit_log_insert",
    async () => getSafeSupabase().from(TABLE).insert(row),
    null
  );
}

export function getLocalAuditLogs() {
  return [...localAuditRows];
}
